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
const scrollBottomBtn = document.getElementById('scrollBottomBtn');

let typingTimeout;
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingInterval;

window.togglePlay = (id) => {
    const audio = document.getElementById(id);
    const btn = document.querySelector(`[data-play-btn="${id}"]`);
    const container = document.getElementById('container_' + id);
    const bars = container.querySelectorAll('.wave-bar');
    
    if (audio.paused) {
        audio.play();
        btn.innerHTML = "❚❚";
        
        audio.ontimeupdate = () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            bars.forEach((bar, index) => {
                bar.style.background = (index / bars.length) * 100 <= percent ? '#fff' : '#444';
            });
        };
    } else {
        audio.pause();
        btn.innerHTML = "▶";
    }
    audio.onended = () => { 
        btn.innerHTML = "▶"; 
        bars.forEach(bar => bar.style.background = '#444');
    };
};

function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function openImageOverlay(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.innerHTML = `<div class="close-overlay-btn">×</div><img src="${src}">`;
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
        <div class="msg-content" style="display: flex; flex-direction: column; margin-left: 38px; margin-top: 5px;">
            ${data.message}
        </div>
    `;
    
    const imgElement = msgDiv.querySelector('img[src^="data:image"]');
    if (imgElement) {
        imgElement.style.cursor = 'pointer';
        imgElement.onclick = () => openImageOverlay(imgElement.src);
    }

    messagesContainer.prepend(msgDiv);
    if (messagesContainer.scrollTop > -100) messagesContainer.scrollTo({ top: 0, behavior: 'smooth' });
});

function sendMessage() {
    const text = msgInput.value.trim();
    if (text !== "" && window.userData) {
        push(ref(db, 'messages'), {
            username: window.userData.username,
            avatar: window.userData.avatar,
            userId: window.userData.id,
            message: `<div class="msg-text">${text}</div>`,
            timestamp: Date.now()
        });
        msgInput.value = '';
        iconMic.classList.remove('hidden');
        iconSend.classList.add('hidden');
        remove(ref(db, 'typing/' + window.userData.id));
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingStartTime = Date.now();
        
        recordingInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            msgInput.value = `${formatDuration(elapsed)} - 2:00`;
            if (elapsed >= 120) stopRecording();
        }, 1000);

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            clearInterval(recordingInterval);
            msgInput.value = '';
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const audioId = 'a_' + Date.now();
                push(ref(db, 'messages'), {
                    username: window.userData.username,
                    avatar: window.userData.avatar,
                    userId: window.userData.id,
                    message: `
                        <div class="audio-message" id="container_${audioId}" style="background: #1a1a1a; padding: 10px 15px; border-radius: 20px; display: flex; align-items: center; gap: 10px; width: fit-content; margin-top: 5px;">
                            <button class="play-btn" data-play-btn="${audioId}" onclick="togglePlay('${audioId}')" style="background: white; color: #000; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center;">▶</button>
                            <audio id="${audioId}" src="${reader.result}"></audio>
                            <div class="waveform" style="display: flex; gap: 3px; align-items: center;">
                                <div class="wave-bar" style="width: 3px; height: 15px; background: #444; border-radius: 2px;"></div>
                                <div class="wave-bar" style="width: 3px; height: 15px; background: #444; border-radius: 2px;"></div>
                                <div class="wave-bar" style="width: 3px; height: 15px; background: #444; border-radius: 2px;"></div>
                            </div>
                        </div>`,
                    timestamp: Date.now()
                });
            };
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        actionBtn.classList.add('active');
    } catch (err) { alert("Permissão de microfone necessária."); }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        actionBtn.classList.remove('active');
    }
}

actionBtn.addEventListener('click', (e) => {
    if (!iconSend.classList.contains('hidden')) {
        sendMessage();
    } else {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopRecording();
        } else {
            startRecording();
        }
    }
});

msgInput.addEventListener('input', () => {
    if (!window.userData) return;
    const hasText = msgInput.value.trim().length > 0;
    iconMic.classList.toggle('hidden', hasText);
    iconSend.classList.toggle('hidden', !hasText);
    
    set(ref(db, 'typing/' + window.userData.id), { username: window.userData.username });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        remove(ref(db, 'typing/' + window.userData.id));
    }, 3000);
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
    fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token}` } })
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
