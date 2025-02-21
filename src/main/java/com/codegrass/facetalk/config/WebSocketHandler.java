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
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class WebSocketHandler extends TextWebSocketHandler {

    // 방 관리용 맵 (roomId -> session 목록)
    private Map<String, Map<String, WebSocketSession>> rooms = new HashMap<>();

    // 방에 새 사용자가 들어올 때
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roomId = getRoomIdFromSession(session);
        String sessionId = getSessionIdFromSession(session);

        rooms.putIfAbsent(roomId, new HashMap<>());
        rooms.get(roomId).put(sessionId, session);

        log.info("[first-join] session = {}", session);

        JsonObject sendJsonMessage = new JsonObject();
        sendJsonMessage.addProperty("event", "first-join");
        sendJsonMessage.addProperty("sessionId", sessionId);
        String sendMessageContent = new Gson().toJson(sendJsonMessage);
        session.sendMessage(new TextMessage(sendMessageContent));

        log.info("[first-join] 현재 방에 있는 인원들 = {}",
                rooms.get(roomId).values().stream()
                        .map(WebSocketSession::getId)
                        .collect(Collectors.toList()));

        log.info("[first-join] 화면 로드 sessionId = {} 전달.", sessionId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("[left-member] session = {}", session);
        String roomId = getRoomIdFromSession(session);
        String sessionId = getSessionIdFromSession(session);

        rooms.get(roomId).remove(session.getId());
        String type = extractTypeFromUri(session);

        broadcastToRoomExceptSender(roomId, "left-member", type, sessionId);
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
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

            default:
                log.warn("알 수 없는 이벤트 = {}", event);
                break;
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
        String path = session.getUri().getPath();
        String[] pathSegments = path.split("/");

        return pathSegments.length > 2 ? pathSegments[2] : null;
    }

    // WebSocketSession 에서 sessionId를 추출하는 메서드
    private String getSessionIdFromSession(WebSocketSession session) {
        return session.getId();
    }

    // URI에서 type (member 또는 manager)을 추출하는 메소드
    private String extractTypeFromUri(WebSocketSession session) {
        String uri = session.getUri().toString();
        return uri.substring(uri.lastIndexOf("/") + 1);
    }
}
