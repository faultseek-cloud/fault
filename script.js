const plusBtn = document.getElementById('plusBtn');
const iconsContainer = document.getElementById('sidebar-icons-container');
const mainScreen = document.getElementById('main-screen');
const authScreen = document.getElementById('auth-screen');
const loadingScreen = document.getElementById('loading-screen');
const sidebar = document.getElementById('sidebar');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messages-container');
const fileInput = document.getElementById('fileInput');
const addImgBtn = document.getElementById('addImgBtn');

plusBtn.addEventListener('click', () => {
    const currentIcons = iconsContainer.querySelectorAll('.icon-item:not(.plus-btn)');
    
    if (currentIcons.length < 2) {
        const newIcon = document.createElement('div');
        newIcon.className = 'icon-item';
        newIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
        
        newIcon.addEventListener('click', () => {
            mainScreen.classList.add('hidden');
        });

        iconsContainer.insertBefore(newIcon, plusBtn);
    }
});

addImgBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR');
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const msgDiv = document.createElement('div');
            msgDiv.className = 'message';
            msgDiv.innerHTML = `
                <div class="msg-header">
                    <img class="msg-avatar" src="https://cdn.discordapp.com/avatars/${window.userData.id}/${window.userData.avatar}.png">
                    <span class="msg-user">${window.userData.username}</span>
                    <span class="msg-time" style="font-size: 10px; color: #666; margin-left: 8px;">${dateStr} ${timeStr}</span>
                </div>
                <div class="msg-text">
                    <img src="${event.target.result}" style="max-width: 200px; border-radius: 8px; margin-top: 5px; display: block;">
                </div>
            `;
            messagesContainer.prepend(msgDiv);
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
});

function sendMessage() {
    if (msgInput.value.trim() !== "") {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message';
        msgDiv.innerHTML = `
            <div class="msg-header">
                <img class="msg-avatar" src="https://cdn.discordapp.com/avatars/${window.userData.id}/${window.userData.avatar}.png">
                <span class="msg-user">${window.userData.username}</span>
                <span class="msg-time" style="font-size: 10px; color: #666; margin-left: 8px;">${dateStr} ${timeStr}</span>
            </div>
            <div class="msg-text">${msgInput.value}</div>
        `;
        messagesContainer.prepend(msgDiv);
        msgInput.value = '';
        sendBtn.classList.remove('active');
    }
}

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('access_token');

if (token) {
    authScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');

    fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(user => {
        window.userData = user;
        document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
        document.getElementById('user-name').textContent = user.username;
        
        loadingScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        sidebar.classList.remove('hidden');

        window.history.replaceState({}, document.title, "/");
    });
}

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

msgInput.addEventListener('input', () => {
    sendBtn.classList.toggle('active', msgInput.value.trim().length > 0);
});
