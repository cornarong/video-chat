package com.codegrass.facetalk.config;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.TextMessage;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class WebSocketHandler extends TextWebSocketHandler {

    // 방 관리용 맵 (roomId -> session 목록)
    private final Map<String, Map<String, WebSocketSession>> rooms = new HashMap<>();
    private final Map<String, Boolean> roomManagerMap = new HashMap<>();

    // 방에 새 사용자가 들어올 때
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        try {
            log.info("[first-join] session = {}", session);
            String roomId = getRoomIdFromSession(session);
            String sessionId = getSessionIdFromSession(session);
            String type = extractTypeFromUri(session);

            // 방 인원 체크
            if (rooms.containsKey(roomId)) {
                List<String> roomMembers = rooms.get(roomId).values().stream()
                        .map(WebSocketSession::getId)
                        .collect(Collectors.toList());
                if (!roomMembers.isEmpty()) {
                    log.info("[first-join] 현재 방에 있는 인원들 = {}", roomMembers.get(0));
                } else {
                    log.info("[first-join] 현재 방이 비어 있습니다.");
                }
            } else {
                rooms.putIfAbsent(roomId, new HashMap<>());
                log.info("[first-join] 현재 방이 없습니다. 신규 방 생성");
            }

            // 방의 관리자 체크
            if ("manager".equals(type)) {
                Boolean isManager = roomManagerMap.get(roomId);
                if (isManager != null && isManager) {
                    log.info("[first-join] 이미 방장이 존재합니다. roomId = {}", roomId);
                    return;
                } else {
                    log.info("[first-join] 매니저가 입장장하였습니다. roomId = {}", roomId);
                    roomManagerMap.put(roomId, true);
                }
            } else {
                log.info("[first-join] 멤버가 입장장하였습니다. roomId = {}", roomId);
            }

            // 세션(멤버)을 방에 추가
            rooms.get(roomId).put(sessionId, session);

            JsonObject sendJsonMessage = new JsonObject();
            sendJsonMessage.addProperty("event", "first-join");
            sendJsonMessage.addProperty("sessionId", sessionId);
            String sendMessageContent = new Gson().toJson(sendJsonMessage);
            session.sendMessage(new TextMessage(sendMessageContent));
            log.info("[first-join] 화면로드 sessionId = {} 전달.", sessionId);

        } catch (Exception e) {
            log.error("exception : ", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        try {
            log.info("[left-member] session = {}", session);
            String roomId = getRoomIdFromSession(session);
            String sessionId = getSessionIdFromSession(session);
            String type = extractTypeFromUri(session);

            if (roomId == null || !rooms.containsKey(roomId)) {
                log.info("[left-member] 존재하지 않는 방입니다. roomId = {}", roomId);
                return;
            }

            // 방의 관리자인 경우
            if ("manager".equals(type)) {
                log.info("[left-member] 매니저가 퇴장하였습니다. roomId = {}", roomId);
                roomManagerMap.remove(roomId);
            } else {
                log.info("[left-member] 멤버가 퇴장하였습니다. roomId = {}", roomId);
            }

            rooms.get(roomId).remove(session.getId());
            broadcastToRoomExceptSender(roomId, "left-member", type, sessionId);

        } catch (Exception e) {
            log.error("exception : ", e);
        }
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        try {
            String messageContent = message.getPayload();
            JsonObject jsonMessage = JsonParser.parseString(messageContent).getAsJsonObject();
            String event = jsonMessage.get("event").getAsString();

            // 소켓 연결 유지를 위한 코드 (클라이언트에서 특정 초 간격으로 계속 전송)
            if ("heartbeat".equals(event)) {
                return;
            }

            String roomId = getRoomIdFromSession(session);
            String type = extractTypeFromUri(session);
            String sessionId = jsonMessage.get("sessionId").getAsString();

            switch (event) {
                case "join-member":
                    log.info("[join-member] {} 님이 접속하였습니다.", sessionId);
                    broadcastToRoomExceptSender(roomId, event, type, sessionId);
                    break;

                case "offer":
                    handleOffer(roomId, event, type, sessionId, jsonMessage);
                    break;

                case "answer":
                    handleAnswer(roomId, event, type, sessionId, jsonMessage);
                    break;

                case "ice-candidate":
                    handleIceCandidate(roomId, event, type, sessionId, jsonMessage);
                    break;

                case "microphone":
                    handleMicrophone(roomId, event, type, sessionId, jsonMessage);
                    break;

                default:
                    log.warn("알 수 없는 이벤트 = {}", event);
                    break;
            }

        } catch (Exception e) {
            log.error("exception : ", e);
        }
    }

    // offer 핸들러
    private void handleOffer(String roomId, String event, String type, String sessionId, JsonObject jsonMessage) throws IOException {
        String recipientSessionId = jsonMessage.get("recipientSessionId").getAsString();
        String offerSdp = jsonMessage.get("sdp").getAsString();
        JsonObject offerJson = JsonParser.parseString(offerSdp).getAsJsonObject();

        // 새로 들어온 사용자에게 offer 전달
        sendToUser(roomId, event, type, sessionId, recipientSessionId, offerJson.toString());
    }

    // answer 핸들러
    private void handleAnswer(String roomId, String event, String type, String sessionId, JsonObject jsonMessage) {
        String recipientSessionId = jsonMessage.get("recipientSessionId").getAsString();
        String answerSdp = jsonMessage.get("sdp").getAsString();
        JsonObject answerJson = JsonParser.parseString(answerSdp).getAsJsonObject();

        // 새로 들어온 사용자에게 offer 전달
        sendToUser(roomId, event, type, sessionId, recipientSessionId, answerJson.toString());
    }

    // ice-candidate 핸들러
    private void handleIceCandidate(String roomId, String event, String type, String sessionId, JsonObject jsonMessage) {
        String recipientSessionId = jsonMessage.get("recipientSessionId").getAsString();
        String candidateString = jsonMessage.get("candidate").getAsString();
        JsonObject candidateJson = JsonParser.parseString(candidateString).getAsJsonObject();

        // 특정 사용자에게 ice-candidate 전달
        sendToUser(roomId, event, type, sessionId, recipientSessionId, candidateJson.toString());
    }

    // microphone 핸들러
    private void handleMicrophone(String roomId, String event, String type, String sessionId, JsonObject jsonMessage) {
        String recipientSessionId = jsonMessage.get("recipientSessionId").getAsString();
        String isEnabled = jsonMessage.get("isEnabled").getAsString();

        // 특정 사용자에게 ice-candidate 전달
        sendMicMessageToUser(roomId, event, type, sessionId, recipientSessionId, isEnabled);
    }

    // 특정 사용자에게만 메시지 전송 (offer, answer, ice-candidate)
    private void sendToUser(String roomId, String event, String type, String sessionId, String recipientSessionId, String data) {
        JsonObject sendJsonMessage = new JsonObject();
        sendJsonMessage.addProperty("event", event);
        sendJsonMessage.addProperty("type", type);
        sendJsonMessage.addProperty("sessionId", sessionId);
        sendJsonMessage.addProperty(event.equals("ice-candidate") ? "candidate" : "sdp", data);
        String sendMessageContent = new Gson().toJson(sendJsonMessage);

        WebSocketSession recipientSession = rooms.get(roomId).get(recipientSessionId);
        if (recipientSession != null) {
            sendSafeMessage(recipientSession, sendMessageContent);
        }
    }

    // 특정 사용자에게 microphone 메시지 전송 (microphone)
    private void sendMicMessageToUser (String roomId, String event, String type, String sessionId, String recipientSessionId, String isEnabled) {
        JsonObject sendJsonMessage = new JsonObject();
        sendJsonMessage.addProperty("event", event);
        sendJsonMessage.addProperty("type", type);
        sendJsonMessage.addProperty("sessionId", sessionId);
        sendJsonMessage.addProperty("isEnabled", isEnabled);
        String sendMessageContent = new Gson().toJson(sendJsonMessage);

        WebSocketSession recipientSession = rooms.get(roomId).get(recipientSessionId);
        if (recipientSession != null) {
            sendSafeMessage(recipientSession, sendMessageContent);
        }
    }

    // 자신을 제외한 방에 있는 모든 사용자에게 메시지 전송 (join-member, left-member)
    private void broadcastToRoomExceptSender(String roomId, String event, String type, String sessionId) {
        JsonObject sendJsonMessage = new JsonObject();
        sendJsonMessage.addProperty("event", event);
        sendJsonMessage.addProperty("type", type);
        sendJsonMessage.addProperty("sessionId", sessionId);
        String sendMessageContent = new Gson().toJson(sendJsonMessage);

        for (WebSocketSession webSocketSession : rooms.get(roomId).values()) {
            if (!webSocketSession.getId().equals(sessionId)) { // 자기 자신에게는 보내지 않음
                sendSafeMessage(webSocketSession, sendMessageContent); // 안전한 전송 메서드 사용
            }
        }
    }

    // WebSocket 메시지를 안전하게 전송하는 메서드
    private void sendSafeMessage(WebSocketSession session, String message) {
        if (session != null && session.isOpen()) {
            try {
                synchronized (session) { // 동기화 처리로 메시지 충돌 방지
                    session.sendMessage(new TextMessage(message));
                }
            } catch (IOException e) {
                log.error("WebSocket 메시지 전송 실패: {}", e.getMessage());
            }
        } else {
            log.warn("WebSocket 세션이 닫혀 있어 메시지 전송 실패.");
        }
    }

    // WebSocketSession URI 에서 roomId를 roomId 추출하는 메서드
    private String getRoomIdFromSession(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri != null) {
            String path = uri.getPath();
            String[] pathSegments = path.split("/");

            return pathSegments.length > 2 ? pathSegments[2] : null;
        }
        throw new IllegalStateException("URI 에서 roomId 추출 실패 : session.getUri() is null");
    }

    // WebSocketSession 에서 sessionId를 추출하는 메서드
    private String getSessionIdFromSession(WebSocketSession session) {
        return session.getId();
    }

    // URI에서 type (member 또는 manager)을 추출하는 메소드
    private String extractTypeFromUri(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri != null) {
            String uriString = session.getUri().toString();
            return uriString.substring(uriString.lastIndexOf("/") + 1);
        }
        throw new IllegalStateException("URI 에서 type 추출 실패 : session.getUri() is null");
    }
}
