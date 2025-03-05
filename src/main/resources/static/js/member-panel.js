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

            const button = document.createElement("button");
            button.textContent = 'FUNC';
            li.appendChild(button);

            memberList.appendChild(li);
        });
    };

    // 버튼 클릭 시 패널 열고 닫기 (toggle)
    toggleMemberListPanelBtn.addEventListener("click", function () {
        memberListPanel.classList.toggle("show");
    });

    // 닫기 버튼 클릭 시 패널 숨기기
    closeMemberListPanelBtn.addEventListener("click", function () {
        memberListPanel.classList.remove("show");
    });
});
