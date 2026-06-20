import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, remove } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

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
const chatIcon = document.getElementById('chat-icon-element');

if (chatIcon) {
    chatIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
}

fileInput.setAttribute("accept", "image/*,video/*");

const trashBtn = document.createElement('button');
trashBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
trashBtn.style.cssText = "display: none; background: transparent; border: none; cursor: pointer; color: #ff4d4d; margin-right: 10px;";
addImgBtn.parentNode.insertBefore(trashBtn, addImgBtn);

const pauseBtn = document.createElement('button');
pauseBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
pauseBtn.style.cssText = "display: none; background: transparent; border: none; cursor: pointer; color: #fff; margin-right: 10px;";
addImgBtn.parentNode.insertBefore(pauseBtn, trashBtn);

let typingTimeout;
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingInterval;
let audioContext;
let analyser;
let dataArray;
let animationId;
let elapsedPausedTime = 0;
let lastPauseTime = 0;
let isDiscarding = false;

function generateWaveBars() {
    let bars = "";
    for (let i = 0; i < 20; i++) {
        bars += `<div class="wave-bar" style="width: 3px; height: 15px; background: #444; border-radius: 2px; pointer-events: none;"></div>`;
    }
    return bars;
}

window.handleWaveSeek = (e, audioId) => {
    const audio = document.getElementById(audioId);
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    audio.currentTime = percent * audio.duration;
};

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

function updateRecordingWaveform() {
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const bars = document.querySelectorAll('.recording-wave-bar');
    bars.forEach((bar, i) => {
        const height = Math.max(5, (dataArray[i] / 255) * 40);
        bar.style.height = `${height}px`;
    });
    animationId = requestAnimationFrame(updateRecordingWaveform);
}

function openImageOverlay(src) {
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000;";
    overlay.innerHTML = `<div style="position:absolute;top:20px;right:20px;cursor:pointer;color:#fff;font-size:30px;">×</div><img src="${src}" style="max-width:90%;max-height:90%;">`;
    overlay.querySelector('div').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

window.toggleVideoPlay = (video) => {
    const btn = video.nextElementSibling;
    const muteBtn = video.parentElement.querySelector('.mute-btn');
    if (video.paused) {
        video.play();
        btn.style.opacity = "0";
        muteBtn.style.display = "flex";
    } else {
        video.pause();
        btn.style.opacity = "1";
    }
};

window.toggleMute = (btn) => {
    const video = btn.parentElement.querySelector('video');
    video.muted = !video.muted;
    btn.innerHTML = video.muted ? 
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l7.73 7.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.48-1.42.84-2.25 1.03v2.06c1.38-.27 2.63-.87 3.66-1.72l1.66 1.66L21 19.73 4.27 3z"/></svg>` : 
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;
};

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
        iconMic.style.display = "block";
        iconSend.style.display = "none";
        remove(ref(db, 'typing/' + window.userData.id));
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 32;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingStartTime = Date.now();
        elapsedPausedTime = 0;
        isDiscarding = false;
        
        iconMic.style.display = "none";
        iconSend.style.display = "block";
        iconSend.style.color = "#808080";
        addImgBtn.style.display = "none";
        trashBtn.style.display = "block";
        pauseBtn.style.display = "block";
        msgInput.value = "0:00 - 2:00";
        
        updateRecordingWaveform();
        
        recordingInterval = setInterval(() => {
            if (mediaRecorder.state === "recording") {
                const elapsed = Math.floor((Date.now() - recordingStartTime - elapsedPausedTime) / 1000);
                msgInput.value = `${formatDuration(elapsed)} - 2:00`;
                if (elapsed >= 120) stopRecording();
            }
        }, 1000);

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            clearInterval(recordingInterval);
            cancelAnimationFrame(animationId);
            
            if (!isDiscarding && audioChunks.length > 0) {
                const totalDuration = formatDuration(Math.floor((Date.now() - recordingStartTime - elapsedPausedTime) / 1000));
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
                                <div class="waveform" onclick="handleWaveSeek(event, '${audioId}')" style="display: flex; gap: 3px; align-items: center; cursor: pointer;">${generateWaveBars()}</div>
                                <span style="color:#fff; font-size: 12px;">${totalDuration}</span>
                            </div>`,
                        timestamp: Date.now()
                    });
                };
            }
            
            msgInput.value = '';
            iconMic.style.display = "block";
            iconSend.style.display = "none";
            addImgBtn.style.display = "block";
            trashBtn.style.display = "none";
            pauseBtn.style.display = "none";
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
        };
        mediaRecorder.start();
        actionBtn.classList.add('active');
    } catch (err) { alert("Permissão de microfone necessária."); }
}

trashBtn.onclick = () => {
    if (mediaRecorder) {
        isDiscarding = true;
        mediaRecorder.stop();
        audioChunks = [];
    }
};

pauseBtn.onclick = () => {
    if (mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        lastPauseTime = Date.now();
        pauseBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    } else if (mediaRecorder.state === "paused") {
        mediaRecorder.resume();
        elapsedPausedTime += (Date.now() - lastPauseTime);
        pauseBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    }
};

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        isDiscarding = false;
        mediaRecorder.stop();
        actionBtn.classList.remove('active');
    }
}

actionBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        stopRecording();
    } else {
        startRecording();
    }
});

iconMic.addEventListener('click', () => {
    iconMic.style.display = "none";
    iconSend.style.display = "block";
    iconSend.style.color = "#808080";
});

msgInput.addEventListener('input', () => {
    if (!window.userData || (mediaRecorder && mediaRecorder.state !== "inactive")) return;
    const hasText = msgInput.value.trim().length > 0;
    iconMic.style.display = hasText ? "none" : "block";
    iconSend.style.display = hasText ? "block" : "none";
    iconSend.style.color = hasText ? "" : "#808080";
    set(ref(db, 'typing/' + window.userData.id), { username: window.userData.username });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        remove(ref(db, 'typing/' + window.userData.id));
    }, 3000);
});

addImgBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && window.userData) {
        const reader = new FileReader();
        reader.onload = (event) => {
            let messageContent = "";
            if (file.type.startsWith('image/')) {
                messageContent = `<img src="${event.target.result}" style="max-width: 200px; border-radius: 8px; margin-top: 5px; display: block;">`;
            } else if (file.type.startsWith('video/')) {
                messageContent = `
                <div style="position:relative; width:250px; cursor:pointer;">
                    <video src="${event.target.result}" style="width:100%; border-radius:8px; display:block;" onclick="toggleVideoPlay(this)"></video>
                    <div onclick="toggleVideoPlay(this.previousElementSibling)" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white; pointer-events:none; transition:0.3s;">
                        <svg width="50" height="50" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div class="mute-btn" onclick="toggleMute(this)" style="position:absolute; bottom:10px; left:10px; width:30px; height:30px; background:rgba(0,0,0,0.5); border-radius:50%; display:none; align-items:center; justify-content:center; cursor:pointer;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l7.73 7.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.48-1.42.84-2.25 1.03v2.06c1.38-.27 2.63-.87 3.66-1.72l1.66 1.66L21 19.73 4.27 3z"/></svg>
                    </div>
                </div>`;
            }
            if (messageContent) {
                push(ref(db, 'messages'), {
                    username: window.userData.username,
                    avatar: window.userData.avatar,
                    userId: window.userData.id,
                    message: messageContent,
                    timestamp: Date.now()
                });
            }
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
