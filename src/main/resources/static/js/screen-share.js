document.addEventListener("DOMContentLoaded", function () {
    let isScreenSharing = false;
    let originalStream = null;
    let screenStream = null;

    document.getElementById("toggleScreenShare").addEventListener("click", async function () {
        const managerVideo = document.getElementById("managerVideo");

        if (!isScreenSharing) {
            try {
                // 화면 공유 스트림 가져오기
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

                // 기존 로컬 스트림 저장
                if (!originalStream) {
                    originalStream = localStream;
                }

                // 화면 공유 스트림을 managerVideo에 적용
                managerVideo.srcObject = screenStream;

                // 기존 PeerConnection에서 비디오 트랙 교체
                const videoTrack = screenStream.getVideoTracks()[0];

                Object.values(peerConnections).forEach(peerConnection => {
                    const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                isScreenSharing = true;

                // 화면 공유 종료 시 원래 카메라 스트림으로 복귀
                screenStream.getTracks()[0].onended = function () {
                    managerVideo.srcObject = originalStream;

                    // 원래 카메라 트랙 복귀
                    const cameraTrack = originalStream.getVideoTracks()[0];
                    Object.values(peerConnections).forEach(peerConnection => {
                        const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
                        if (sender) {
                            sender.replaceTrack(cameraTrack);
                        }
                    });

                    isScreenSharing = false;
                };

            } catch (error) {
                console.error("화면 공유 실패:", error);
            }
        } else {
            // 화면 공유 중이라면 원래 카메라 화면으로 복귀
            managerVideo.srcObject = originalStream;

            // 원래 카메라 트랙 복귀
            const cameraTrack = originalStream.getVideoTracks()[0];
            Object.values(peerConnections).forEach(peerConnection => {
                const sender = peerConnection.getSenders().find(s => s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(cameraTrack);
                }
            });

            isScreenSharing = false;
        }
    });
});
