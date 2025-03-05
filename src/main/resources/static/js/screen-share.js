document.addEventListener("DOMContentLoaded", function () {
    let isScreenSharing = false;
    let originalStream = null;
    let screenStream = null;

    document.getElementById("toggleScreenShare").addEventListener("click", async function () {
        const managerVideo = document.getElementById("managerVideo");

        if (!isScreenSharing) {
            console.log('화면공유 시작.');
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

                if (!originalStream) originalStream = managerVideo.srcObject;
                managerVideo.srcObject = screenStream; // 화면 공유 스트림을 비디오 태그에 적용

                const videoTrack = screenStream.getVideoTracks()[0];
                Object.values(peerConnections).forEach(peerConnection => {
                    const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
                    if (sender) sender.replaceTrack(videoTrack); // PeerConnection에 공유 화면 적용
                });

                const screenTrack = screenStream.getVideoTracks()[0]; // 화면 공유 비디오 트랙 가져오기

                // 기존 로컬 스트림에서 비디오 트랙을 교체
                if (window.localStream) {
                    const audioTracks = window.localStream.getAudioTracks(); // 기존 오디오 트랙 유지
                    window.localStream = new MediaStream([screenTrack, ...audioTracks]); // 로컬 스트림 업데이트
                }

                screenStream.getTracks()[0].onended = stopScreenShare; // 화면 공유 종료 시 원래 화면 복원

                isScreenSharing = true;

            } catch (error) {
                console.error("화면 공유 실패: ", error);
            }
        } else {
            stopScreenShare(); // 화면 공유 중이면 중지
        }
    });

    function stopScreenShare() {
        console.log('화면공유 종료.');
        const managerVideo = document.getElementById("managerVideo");

        if (originalStream) {
            managerVideo.srcObject = originalStream; // 원래 카메라 스트림 복원
            const cameraTrack = originalStream.getVideoTracks()[0];
            console.log('cameraTrack = ', cameraTrack)

            Object.values(peerConnections).forEach(peerConnection => {
                const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
                if (sender) sender.replaceTrack(cameraTrack); // `PeerConnection`에 카메라 스트림 적용
            });

            // 기존 로컬 스트림에서 비디오 트랙을 교체
            if (window.localStream) {
                screenStream.getTracks().forEach(track => track.stop());
                const audioTracks = window.localStream.getAudioTracks(); // 기존 오디오 트랙 유지
                window.localStream = new MediaStream([cameraTrack, ...audioTracks]); // 로컬 스트림 업데이트
            }
        }

        isScreenSharing = false;
        originalStream = null;
        screenStream = null;
    }
});
