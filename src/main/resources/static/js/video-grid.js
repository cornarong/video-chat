document.addEventListener("DOMContentLoaded", function () {
    const memberVideosContainer = document.getElementById("memberVideos");
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
            // 비디오 + 텍스트를 감싸는 래퍼 div 생성 : 텍스트(멤버이름)은 webrtc.js 에서 멤버 화면 생성시 삽입해줌.
            const videoWrapper = document.createElement("div");
            videoWrapper.classList.add("video-wrapper");

            // 비디오 요소 생성
            const videoElement = document.createElement("video");
            videoElement.classList.add("memberVideo");
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.dataset.index = i; // 고유 인덱스 유지

            // videoWrapper 안에 비디오 추가
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
