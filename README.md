### 📌 video-chat
<h6>

WebRTC와 WebSocket을 활용하여 실시간 화상 채팅을 제공하는 프로젝트.

추가 기능
- 방 개념 추가 : 사용자들이 참여할 수 있는 개별 화상 채팅 방을 생성 및 관리
- 방장 기능 추가 : 화면 공유 및 사용자 관리 기능(강퇴, 음소거 등)
- 채팅방 1:1 선택 화상 기능 추가 (2025.03.05)
- 디바이스 권한 요청 및 마이크 제어 기능 추가 (2025.03.05)
- 참여중인 사용자 패널 추가 (2025.03.05) 
- 매니저 강퇴/새로고침 기능 추가 (2025.03.14)

<br>

Java Spring (시그널링 서버)
- WebSocket을 활용한 시그널링 통신 중계 및 관리.
- 연결 요청, Offer/Answer 교환, ICE Candidate 처리.
- 클라이언트 채팅방 생성 및 방장·멤버 관리.

<br>

WebRTC API:
- 브라우저 내 P2P 미디어 스트림(음성/영상) 송수신.
- ICE Candidate 교환을 통해 네트워크 연결 최적화.
- SDP 정보 교환을 통한 WebRTC 연결 설정.

### 📌 프로젝트 구조

```
videochat
│── src
│   ├── main
│   │   ├── java/com/codegrass/videochat
│   │   │   ├── config          # WebSocket 설정 및 시그널링 처리 핸들러
│   │   │   ├── controller      # 채팅방 생성 및 VIEW 반환 컨트롤러
│── resources
│   ├── static
│   │   ├── css/video-chat.css  # 채팅 페이지 스타일
│   │   ├── images              # UI에 사용되는 이미지
│   │   ├── js
│   │   │   ├── webrtc.js        # WebRTC P2P 연결 및 미디어 스트림 처리 기능
│   │   │   ├── screen-share.js  # 화면 공유 기능
│   │   │   ├── video-grid.js    # 동적 비디오 레이아웃 기능
│   └── templates/video-chat.html  # 채팅 페이지 뷰 템플릿
```


### 📌 주요 기능
<h6>
  
- **WebRTC 기반 다자간 화상 채팅**
- **WebSocket을 통한 시그널링 처리**
- **관리자/일반 사용자 역할 구분**
- **화면 공유 기능 지원**
- **동적 비디오 레이아웃 자동 조정**

