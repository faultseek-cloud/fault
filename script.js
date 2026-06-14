import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
    getDatabase,
    ref,
    push,
    onChildAdded
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

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
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messages-container');
const fileInput = document.getElementById('fileInput');
const addImgBtn = document.getElementById('addImgBtn');

function renderMessage(data) {
    const msgDiv = document.createElement('div');

    const date = new Date(data.timestamp);

    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    msgDiv.className = 'message';

    msgDiv.innerHTML = `
        <div class="msg-header">
            <img class="msg-avatar" src="${data.avatar}">
            <span class="msg-user">${data.username}</span>
            <span class="msg-time" style="font-size:10px;color:#666;margin-left:8px;">
                ${dateStr} ${timeStr}
            </span>
        </div>
        <div class="msg-text">${data.text}</div>
    `;

    messagesContainer.prepend(msgDiv);
}

plusBtn.addEventListener('click', () => {
    const currentIcons = iconsContainer.querySelectorAll('.icon-item:not(.plus-btn)');

    if (currentIcons.length < 2) {
        const newIcon = document.createElement('div');

        newIcon.className = 'icon-item';

        newIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
            </svg>
        `;

        newIcon.addEventListener('click', () => {
            mainScreen.classList.add('hidden');
        });

        iconsContainer.insertBefore(newIcon, plusBtn);
    } else {
        alert("Limite de 2 comunidades atingido.");
    }
});

addImgBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
        const now = new Date();

        const msgDiv = document.createElement('div');

        msgDiv.className = 'message';

        msgDiv.innerHTML = `
            <div class="msg-header">
                <img class="msg-avatar"
                src="https://cdn.discordapp.com/avatars/${window.userData.id}/${window.userData.avatar}.png">

                <span class="msg-user">
                    ${window.userData.username}
                </span>

                <span class="msg-time"
                style="font-size:10px;color:#666;margin-left:8px;">
                    ${now.toLocaleDateString('pt-BR')}
                    ${now.toLocaleTimeString('pt-BR',{
                        hour:'2-digit',
                        minute:'2-digit'
                    })}
                </span>
            </div>

            <div class="msg-text">
                <img
                    src="${event.target.result}"
                    style="max-width:200px;border-radius:8px;margin-top:5px;display:block;"
                >
            </div>
        `;

        messagesContainer.prepend(msgDiv);
    };

    reader.readAsDataURL(file);

    e.target.value = '';
});

function sendMessage() {
    const text = msgInput.value.trim();

    if (!text || !window.userData) return;

    push(ref(db, "messages"), {
        text: text,
        username: window.userData.username,
        avatar: `https://cdn.discordapp.com/avatars/${window.userData.id}/${window.userData.avatar}.png`,
        timestamp: Date.now()
    });

    msgInput.value = '';
    sendBtn.classList.remove('active');
}

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('access_token');

if (token) {

    authScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');

    fetch('https://discord.com/api/users/@me', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(user => {

        window.userData = user;

        document.getElementById('user-avatar').src =
            `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;

        document.getElementById('user-name').textContent =
            user.username;

        const messagesRef = ref(db, "messages");

        messagesContainer.innerHTML = "";

        onChildAdded(messagesRef, (snapshot) => {
            renderMessage(snapshot.val());
        });

        loadingScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        sidebar.classList.remove('hidden');

        window.history.replaceState({}, document.title, "/");
    })
    .catch(error => {
        console.error(error);

        loadingScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
    });
}

sendBtn.addEventListener('click', sendMessage);

msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

msgInput.addEventListener('input', () => {
    sendBtn.classList.toggle(
        'active',
        msgInput.value.trim().length > 0
    );
});