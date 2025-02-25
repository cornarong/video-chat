# FaceTalk

WebRTC와 WebSocket을 활용하여 실시간 화상 채팅을 제공하는 프로젝트입니다.
Java 기반의 시그널링 서버와 WebRTC API를 사용하여 방 개념과 방장(관리자) 역할을 포함한 화상 채팅을 구현합니다.
사용자는 특정 방에 참여할 수 있으며, 관리자는 화면 공유 및 사용자 관리 기능을 수행할 수 있습니다.

Java Spring (시그널링 서버)
- WebSocket을 활용한 시그널링 통신 중계 및 관리.
- 연결 요청, Offer/Answer 교환, ICE Candidate 처리.
- 클라이언트 채팅방 생성 및 방장·멤버 관리.

WebRTC API:
- 브라우저 내 P2P 미디어 스트림(음성/영상) 송수신.
- ICE Candidate 교환을 통해 네트워크 연결 최적화.
- SDP 정보 교환을 통한 WebRTC 연결 설정.
 

## 📌 프로젝트 구조

```
FaceTalk
│── src
│   ├── main
│   │   ├── java/com/codegrass/facetalk
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

## 📌 주요 기능

- **WebRTC 기반 다자간 화상 채팅**
- **WebSocket을 통한 시그널링 처리**
- **관리자/일반 사용자 역할 구분**
- **화면 공유 기능 지원**
- **동적 비디오 레이아웃 자동 조정**

