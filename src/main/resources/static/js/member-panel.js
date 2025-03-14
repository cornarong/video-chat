document.addEventListener("DOMContentLoaded", function () {
    const toggleMemberListPanelBtn = document.getElementById("toggleMemberListPanel");
    const closeMemberListPanelBtn = document.getElementById("closeMemberListPanel");
    const memberListPanel = document.getElementById("memberListPanel");

    // 현재 접속 중인 멤버 리스트 (전역 변수)
    window.members = [];

    // 멤버 목록을 화면에 표시하는 함수
    window.updateMemberList = function () {
        const memberList = document.getElementById("memberList");
        memberList.innerHTML = "";
        window.members.forEach(member => {
            const li = document.createElement("li");
            li.textContent = member;

            if (myType === 'manager') {
                const createButton = (text, onClick) => {
                    const button = document.createElement("button");
                    button.textContent = text;
                    button.style.width = '50px';
                    button.style.height = '30px';
                    button.style.fontSize = '10px';
                    button.style.margin = '5px';
                    button.style.borderRadius = '5px';
                    button.style.border = '1px solid #ccc';
                    button.style.backgroundColor = '#f0f0f0';
                    button.style.cursor = 'pointer';
                    button.addEventListener("click", onClick);
                    return button;
                };

                const kickButton = createButton('강퇴', () => kickMember(member));
                const refreshButton = createButton('새로고침', () => refreshMember(member));

                li.appendChild(kickButton);
                li.appendChild(refreshButton);
            }

            memberList.appendChild(li);
        });
    };

    // 멤버 강퇴하기
    function kickMember(sessionId) {

        if (confirm(`[${sessionId}]님을 강퇴하시겠습니까?`)) {
            socket.send(JSON.stringify({
                event: 'kick',
                sessionId: mySessionId,
                recipientSessionId: sessionId
            }));
        }

        clearVideoBorders();
    }

    // 멤버 강제 새로고침
    function refreshMember(sessionId) {

        if (confirm(`[${sessionId}]님의 화면을 새로고침 하시겠습니까?`)) {
            socket.send(JSON.stringify({
                event: 'refresh',
                sessionId: mySessionId,
                recipientSessionId: sessionId
            }));
        }

        clearVideoBorders();
    }

    // 'memberVideo' 클래스를 가진 모든 video 태그의 테두리 스타일을 초기화하는 함수
    function clearVideoBorders() {
        setTimeout(function() {
            let videos = document.querySelectorAll('.memberVideo');
            videos.forEach(video => {
                video.style.border = '';
                video.style.position = '';
                video.style.zIndex = '';
            });
        }, 100);
    }

    // 버튼 클릭 시 패널 열고 닫기 (toggle)
    toggleMemberListPanelBtn.addEventListener("click", function () {
        memberListPanel.classList.toggle("show");
    });

    // 닫기 버튼 클릭 시 패널 숨기기
    closeMemberListPanelBtn.addEventListener("click", function () {
        memberListPanel.classList.remove("show");
    });
});
