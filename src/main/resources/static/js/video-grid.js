document.addEventListener("DOMContentLoaded", function () {
    const memberVideosContainer = document.getElementById("memberVideosContainer");
    const totalSlots = 20; // 최대 20개 슬롯 유지

    function updateGrid() {
        const containerWidth = memberVideosContainer.clientWidth;
        const containerHeight = memberVideosContainer.clientHeight;
        const aspectRatio = containerWidth / containerHeight;

        let columns = Math.ceil(Math.sqrt(totalSlots * aspectRatio));
        let rows = Math.ceil(totalSlots / columns);

        memberVideosContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        memberVideosContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    }

    function initializeGrid() {
        for (let i = 0; i < totalSlots; i++) {
            // 비디오 + 텍스트를 감싸는 래퍼 div 생성 : 텍스트(멤버 이름)는 webrtc.js 내 멤버 화면 생성시 삽입해줌.
            const videoWrapper = document.createElement("div");
            videoWrapper.classList.add("video-wrapper");

            // 비디오 요소 생성
            const videoElement = document.createElement("video");
            videoElement.classList.add("memberVideo");
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.dataset.index = i; // 고유 인덱스 유지

            // 오버레이 화면
            const overlayElement = document.createElement("div");
            overlayElement.classList.add("overlay");
            overlayElement.style.width = "100%";
            overlayElement.style.height = "100%";
            overlayElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            overlayElement.style.border = "2px solid rgba(0, 0, 0, 0.8)";
            overlayElement.style.position = "absolute";
            overlayElement.style.display = "none";

            videoWrapper.appendChild(overlayElement);
            videoWrapper.appendChild(videoElement);

            // 컨테이너에 videoWrapper 추가
            memberVideosContainer.appendChild(videoWrapper);
        }
        updateGrid();
    }


    window.updateGrid = updateGrid;
    window.addEventListener("resize", updateGrid); // 창 크기 변경 시 자동 조정

    initializeGrid();
});
