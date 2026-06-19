import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBX5mGILY9TT_M8S79X4UTRbHinH1PB6gI",
    authDomain: "iox-private-project-8191d.firebaseapp.com",
    databaseURL: "https://iox-private-project-8191d-default-rtdb.firebaseio.com",
    projectId: "iox-private-project-8191d",
    storageBucket: "iox-private-project-8191d.firebasestorage.app",
    messagingSenderId: "922529471335",
    appId: "1:922529471335:web:aa6494ea4a06d4f425edc2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const plusBtn = document.getElementById('plusBtn');
const iconsContainer = document.getElementById('sidebar-icons-container');
const mainScreen = document.getElementById('main-screen');
const authScreen = document.getElementById('auth-screen');
const loadingScreen = document.getElementById('loading-screen');
const sidebar = document.getElementById('sidebar');
const msgInput = document.getElementById('msgInput');
const actionBtn = document.getElementById('actionBtn');
const iconMic = document.getElementById('icon-mic');
const iconSend = document.getElementById('icon-send');
const messagesContainer = document.getElementById('messages-container');
const fileInput = document.getElementById('fileInput');
const addImgBtn = document.getElementById('addImgBtn');
const typingIndicator = document.getElementById('typing-indicator');
const typingUsername = document.getElementById('typing-username');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');

let typingTimeout;
let isRecording = false;

function openImageOverlay(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.innerHTML = `
        <div class="close-overlay-btn">×</div>
        <img src="${src}">
    `;
    overlay.querySelector('.close-overlay-btn').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

onChildAdded(ref(db, 'messages'), (snapshot) => {
    const data = snapshot.val();
    const date = new Date(data.timestamp);
    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.innerHTML = `
        <div class="msg-header">
            <img class="msg-avatar" src="https://cdn.discordapp.com/avatars/${data.userId}/${data.avatar}.png">
            <span class="msg-user">${data.username}</span>
            <span class="msg-time" style="font-size: 10px; color: #666; margin-left: 8px;">${dateStr} ${timeStr}</span>
        </div>
        <div class="msg-text">${data.message}</div>
    `;
    
    const imgElement = msgDiv.querySelector('img[src^="data:image"]');
    if (imgElement) {
        imgElement.style.cursor = 'pointer';
        imgElement.onclick = () => openImageOverlay(imgElement.src);
    }

    messagesContainer.prepend(msgDiv);
    if (messagesContainer.scrollTop > -100) messagesContainer.scrollTo({ top: 0, behavior: 'smooth' });
});

messagesContainer.addEventListener('scroll', () => {
    scrollBottomBtn.classList.toggle('hidden', messagesContainer.scrollTop > -300);
});

scrollBottomBtn.addEventListener('click', () => {
    messagesContainer.scrollTo({ top: 0, behavior: 'smooth' });
});

msgInput.addEventListener('input', () => {
    if (!window.userData) return;
    
    if (msgInput.value.trim().length > 0) {
        iconMic.classList.add('hidden');
        iconSend.classList.remove('hidden');
    } else {
        iconMic.classList.remove('hidden');
        iconSend.classList.add('hidden');
    }

    set(ref(db, 'typing/' + window.userData.id), { username: window.userData.username });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        remove(ref(db, 'typing/' + window.userData.id));
    }, 3000);
});

onValue(ref(db, 'typing'), (snapshot) => {
    const typingData = snapshot.val();
    let isSomeoneTyping = false;
    if (typingData) {
        for (let userId in typingData) {
            if (userId !== window.userData?.id) {
                typingUsername.textContent = typingData[userId].username;
                isSomeoneTyping = true;
                break;
            }
        }
    }
    typingIndicator.style.display = isSomeoneTyping ? 'block' : 'none';
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (text !== "" && window.userData) {
        push(ref(db, 'messages'), {
            username: window.userData.username,
            avatar: window.userData.avatar,
            userId: window.userData.id,
            message: text,
            timestamp: Date.now()
        });
        msgInput.value = '';
        iconMic.classList.remove('hidden');
        iconSend.classList.add('hidden');
        remove(ref(db, 'typing/' + window.userData.id));
        messagesContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

actionBtn.addEventListener('mousedown', () => {
    if (msgInput.value.trim() === "") {
        isRecording = true;
        actionBtn.classList.add('active');
        console.log("Iniciando gravação...");
    }
});

actionBtn.addEventListener('mouseup', () => {
    if (isRecording) {
        isRecording = false;
        actionBtn.classList.remove('active');
        console.log("Áudio enviado!");
    }
});

actionBtn.addEventListener('click', () => {
    if (msgInput.value.trim().length > 0) sendMessage();
});

plusBtn.addEventListener('click', () => {
    const communityIcons = iconsContainer.querySelectorAll('.icon-item:not(#plusBtn)');
    if (communityIcons.length < 3) {
        const newIcon = document.createElement('div');
        newIcon.className = 'icon-item';
        newIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
        newIcon.addEventListener('click', () => mainScreen.classList.add('hidden'));
        iconsContainer.insertBefore(newIcon, plusBtn);
    }
});

addImgBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && window.userData) {
        const reader = new FileReader();
        reader.onload = (event) => {
            push(ref(db, 'messages'), {
                username: window.userData.username,
                avatar: window.userData.avatar,
                userId: window.userData.id,
                message: `<img src="${event.target.result}" style="max-width: 200px; border-radius: 8px; margin-top: 5px; display: block;">`,
                timestamp: Date.now()
            });
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
});

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
        loadingScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        sidebar.classList.remove('hidden');
        window.history.replaceState({}, document.title, "/");
    });
}

msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
