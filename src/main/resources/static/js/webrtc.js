const path = window.location.pathname;
const roomId = path.split("/")[2];  // 방번호
const type = path.split("/")[3];    // 회원 or 관리자

let mySessionId = sessionStorage.getItem('sessionId') || '';

let localStream;
let peerConnections = {};  // 각 방의 PeerConnection 관리
let signalingQueues = {};  // 각 PeerConnection Offer/Answer 처리를 위한 큐 관리 객체
let sentIceCandidates = new Set();  // 중복된 ICE 후보 전송 방지용

// WebSocket 연결
const socket = new WebSocket(`wss://${location.host}/ws/${roomId}/${type}`);

socket.onopen = () => {
    console.log('WebSocket 연결 성공');

    // heartbeat (소켓 연결 유지)
    setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({event: "heartbeat"}));
        }
    }, 15000); // 15초
};


socket.onclose = () => {
    console.log('WebSocket 연결 종료');
};

// WebSocket 메시지 수신 시
socket.onmessage = async (event) => {
    try {
        const message = JSON.parse(event.data);
        console.log('받은 message : ', message);

        if (!localStream) {
            try {
                localStream = await getMediaStream();
            } catch (error) {
                console.error("미디어 스트림 설정 실패:", error);
                localStream = new MediaStream(); // 비상시 빈 스트림 반환
            }

            // 관리자 화면 생성
            console.log('type :', type)
            if (type === 'manager') {
                const managerVideo = document.getElementById("managerVideo");
                managerVideo.srcObject = localStream;
            } else {
                // 멤버 화면 생성
                addMemberVideo(mySessionId, localStream);
            }
        }

        switch (message.event) {
            case 'first-join':
                console.log('sessionId 전달 받음.');
                mySessionId = message.sessionId;
                sessionStorage.setItem('sessionId', mySessionId);

                socket.send(JSON.stringify({
                    event: 'join-member',
                    sessionId: mySessionId
                }));
                break;

            case 'join-member':
                console.log(`사용자 접속 : ${message.sessionId}`);
                // 기존 방에있는 멤버 입장에서의 화면 생성 (join-member 받고 생성)
                if (!peerConnections[message.sessionId]) {
                    createPeerConnection(message.sessionId, message.type, message.event);
                }
                break;

            case 'offer':
                handleOffer(message.sessionId, message.sdp, message.type, message.event);
                break;

            case 'answer':
                handleAnswer(message.sessionId, message.sdp);
                break;

            case 'ice-candidate':
                handleIceCandidate(message.sessionId, message.candidate);
                break;

            case 'left-member':
                console.log(`사용자 퇴장 : ${message.sessionId}`);
                if (peerConnections[message.sessionId]) {
                    peerConnections[message.sessionId].close();
                    delete peerConnections[message.sessionId];
                    console.log(`peerConnections에서 ${message.sessionId} 제거 완료`);
                }

                // 원격 비디오 삭제
                const remoteVideo = document.getElementById(message.sessionId);
                if (remoteVideo) {
                    remoteVideo.srcObject = null; // 영상 제거
                    remoteVideo.removeAttribute("id"); // ID 제거 (슬롯 재사용 가능)
                    remoteVideo.style.backgroundImage = "url('/image/old_people.png')"; // 외부 이미지 URL
                    remoteVideo.style.backgroundSize = "cover";
                    remoteVideo.style.backgroundPosition = "center";
                    remoteVideo.style.backgroundRepeat = "no-repeat";
                }
                break;

            default:
                console.log('알 수 없는 메시지 이벤트:', event);
                break;
        }
    } catch (error) {
        console.error('미디어 장치 접근 오류', error);
    }
};

async function getMediaStream() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === "videoinput");
        const hasAudio = devices.some(device => device.kind === "audioinput");

        let videoStream, audioStream;

        // 카메라가 있을 경우, `type`에 따라 해상도를 다르게 설정하여 미디어 스트림을 가져옴.
        // 관리자(manager)는 1920x1080 해상도 (Full HD, 30fps)로 설정됨.
        // 일반 멤버(member)는 160x120 해상도 (저해상도, 15fps)로 설정됨.
        // 여기서 설정된 해상도가 다른 사용자에게 송출될 최종 해상도를 결정함.
        if (videoDevices.length > 0) {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: type === 'manager'
                    ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { max: 30 } }
                    : { width: { ideal: 160 }, height: { ideal: 120 }, frameRate: { max: 10 } }
            });
        } else {
            console.warn("사용 가능한 카메라가 없습니다. 빈 화면을 반환합니다.");
            videoStream = new MediaStream([createBlackVideoTrack()]); // 카메라가 없을 경우, 검은 화면 트랙 반환
        }

        // 마이크가 있으면 기본 마이크 사용, 없으면 무음 트랙 반환
        if (hasAudio) {
            audioStream = await navigator.mediaDevices.getUserMedia({audio: true});
        } else {
            console.warn("사용 가능한 마이크가 없습니다. 무음 트랙을 반환합니다.");
            audioStream = new MediaStream([createSilentAudioTrack()]); // 무음 트랙 반환
        }

        // 비디오 + 오디오 트랙을 하나의 스트림으로 합치기
        const combinedStream = new MediaStream();
        videoStream.getTracks().forEach(track => combinedStream.addTrack(track));
        audioStream.getTracks().forEach(track => combinedStream.addTrack(track));

        return combinedStream;
    } catch (error) {
        console.error("미디어 스트림 가져오기 실패:", error);
        return new MediaStream([createBlackVideoTrack(), createSilentAudioTrack()]); // 최악의 경우 빈 스트림 반환
    }
}

// 검은 화면을 위한 비디오 트랙 생성
function createBlackVideoTrack() {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.captureStream().getVideoTracks()[0];
}

// 무음 오디오 트랙 생성
function createSilentAudioTrack() {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    return destination.stream.getAudioTracks()[0];
}

// 멤버 화면 생성
function addMemberVideo(sessionId, stream) {
    console.log('멤버 화면 추가:', sessionId);

    const memberVideosContainer = document.getElementById('memberVideos');
    const emptySlot = Array.from(memberVideosContainer.children).find(video => !video.srcObject);

    if (emptySlot) {
        emptySlot.srcObject = stream;
        emptySlot.id = sessionId;
    } else {
        console.warn('모든 슬롯이 이미 사용 중입니다.');
    }
}

// PeerConnection 생성 및 설정
async function createPeerConnection(sessionId, type, event) {
    console.log('sessionId = ', sessionId)
    console.log('type = ', type)
    console.log('event = ', event)
    if (peerConnections[sessionId]) {
        return;
    }

    const peerConnection = new RTCPeerConnection({
        iceServers: [
            {urls: "stun:stun.l.google.com:19302"},
            {urls: "stun:stun1.l.google.com:19302"},
            {urls: "stun:stun2.l.google.com:19302"} // 구글 STUN 서버
        ],
        iceTransportPolicy: "all" // "ready" 대신 "all"로 설정하여 P2P 연결 우선
    });

    // 비트레이트 제한 설정
    peerConnection.onnegotiationneeded = async () => {
        const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
        if (!sender) return;

        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];

        /*console.log('비트레이트 설정: type = ', type);
        params.encodings[0].maxBitrate = type === 'manager' ? 5000000 : 100000; // 관리자: 5Mbps, 멤버: 100kbps*/

        await sender.setParameters(params);
    };


    // 내 로컬 미디어 트랙(비디오/오디오)을 peerConnection에 추가 (상대방과 공유할 트랙 설정)
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const candidateStr = JSON.stringify(event.candidate);
            if (!sentIceCandidates.has(candidateStr)) {
                sentIceCandidates.add(candidateStr);
                sendIceCandidate(sessionId, event.candidate);
            }
        }
    };

    const addedStreams = new Set(); // 중복 방지용 Set

    peerConnection.ontrack = (event) => {
        if (!addedStreams.has(event.streams[0].id)) {
            addedStreams.add(event.streams[0].id);
            // 관리자 화면 생성
            if (type === 'manager') {
                const managerVideo = document.getElementById("managerVideo");
                managerVideo.srcObject = event.streams[0];
            } else {
                // 멤버 화면 생성
                addMemberVideo(sessionId, event.streams[0]);
            }
        } else {
            console.log("중복된 ontrack 실행 방지됨.");

        }
    };

    peerConnections[sessionId] = peerConnection;

    if (event === 'join-member') {
        createOffer(sessionId);
    }
}

// Offer 생성 및 전송
async function createOffer(sessionId) {
    console.log('전달하기 위해 offer 생성합니다.')
    if (!peerConnections[sessionId]) return;
    const peerConnection = peerConnections[sessionId];

    // 현재 signalingState 체크
    if (peerConnection.signalingState !== "stable") {
        console.warn(`Offer 생성 건너뜀: signalingState=${peerConnection.signalingState}`);
        return;
    }

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.send(JSON.stringify({
            event: 'offer',
            sdp: JSON.stringify(offer),
            sessionId: mySessionId,
            recipientSessionId: sessionId
        }));
    } catch (error) {
        console.error("Offer 생성 중 오류 발생:", error);
    }
}

// Offer 처리 (상대방의 Offer 받기)
async function handleOffer(sessionId, offerSdp, type, event) {
    console.log('상대방이 offer 보냈습니다.');

    // 새로 들어온 멤버 입장에서의 화면 생성 (offer 받은 후 생성)
    if (!peerConnections[sessionId]) {
        createPeerConnection(sessionId, type, event);
    }

    if (!signalingQueues[sessionId]) {
        signalingQueues[sessionId] = new SignalingQueue();
    }

    await signalingQueues[sessionId].enqueue(async () => {
        const peerConnection = peerConnections[sessionId];

        try {
            const parsedOffer = new RTCSessionDescription(JSON.parse(offerSdp));
            await peerConnection.setRemoteDescription(parsedOffer);

            let retryCount = 0;
            while (peerConnection.signalingState !== "stable" && retryCount < 10) { // 10번 이상 반복 안 함
                console.log(`signalingState 대기 중... (${peerConnection.signalingState})`);
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
                retryCount++;
            }

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.send(JSON.stringify({
                event: 'answer',
                sdp: JSON.stringify(answer),
                sessionId: mySessionId,
                recipientSessionId: sessionId
            }));

            console.log(`상대방에게 answer 보냈습니다.`);
        } catch (error) {
            console.error("Offer 처리 중 오류 발생:", error);
        }
    });
}


// Answer 처리
async function handleAnswer(sessionId, answerSdp) {
    if (!peerConnections[sessionId]) {
        console.warn(`PeerConnection 없음: ${sessionId}`);
        return;
    }

    if (!signalingQueues[sessionId]) {
        signalingQueues[sessionId] = new SignalingQueue();
    }

    await signalingQueues[sessionId].enqueue(async () => {
        const peerConnection = peerConnections[sessionId];

        if (peerConnection.signalingState === "stable") {
            console.warn(`setRemoteDescription 호출 안 함 (이미 stable 상태)`);
            return;
        }

        try {
            const parsedAnswer = new RTCSessionDescription(JSON.parse(answerSdp));
            await peerConnection.setRemoteDescription(parsedAnswer);
            console.log(`세션 ID ${sessionId}에 대한 Answer 처리 완료`);
        } catch (error) {
            console.error("Answer 설정 중 오류 발생:", error);
        }
    });
}

// ICE 후보 처리
function sendIceCandidate(sessionId, candidate) {
    socket.send(JSON.stringify({
        event: 'ice-candidate',
        candidate: JSON.stringify(candidate),
        sessionId: mySessionId,
        recipientSessionId: sessionId
    }));
}

function handleIceCandidate(sessionId, candidate) {
    const peerConnection = peerConnections[sessionId];

    try {
        const parsedCandidate = new RTCIceCandidate(JSON.parse(candidate));
        peerConnection.addIceCandidate(parsedCandidate);
    } catch (error) {
        console.error("ICE 후보 처리 중 오류 발생:", error);
    }
}

// WebRTC Offer/Answer 처리를 순차적으로 실행하는 큐
class SignalingQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    async enqueue(task) {
        this.queue.push(task);
        await this.processQueue();
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            await task();  // 작업 실행
        }
        this.processing = false;
    }
}
