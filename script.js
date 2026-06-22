import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, set, remove, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

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

const defaultHeader = document.getElementById('default-header');
const selectionHeader = document.getElementById('selection-header');
const selectionCount = document.getElementById('selection-count');
const cancelSelectionBtn = document.getElementById('cancel-selection');
const deleteSelectedBtn = document.getElementById('delete-selected');

let selectedMessages = [];
let pressTimer;

const trashBtn = document.createElement('button');
trashBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
trashBtn.style.cssText = "display: none; background: transparent; border: none; cursor: pointer; color: #ff4d4d; margin-right: 10px;";
addImgBtn.parentNode.insertBefore(trashBtn, addImgBtn);

const pauseBtn = document.createElement('button');
pauseBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
pauseBtn.style.cssText = "display: none; background: transparent; border: none; cursor: pointer; color: #fff; margin-right: 10px;";
addImgBtn.parentNode.insertBefore(pauseBtn, trashBtn);

function toggleSelection(msgId, element) {
    if (selectedMessages.includes(msgId)) {
        selectedMessages = selectedMessages.filter(id => id !== msgId);
        element.classList.remove('selected');
    } else {
        selectedMessages.push(msgId);
        element.classList.add('selected');
    }
    
    if (selectedMessages.length > 0) {
        defaultHeader.classList.add('hidden');
        selectionHeader.classList.remove('hidden');
        selectionCount.innerText = selectedMessages.length;
    } else {
        cancelSelection();
    }
}

function cancelSelection() {
    selectedMessages = [];
    document.querySelectorAll('.message').forEach(el => el.classList.remove('selected'));
    defaultHeader.classList.remove('hidden');
    selectionHeader.classList.add('hidden');
}

cancelSelectionBtn.onclick = cancelSelection;
deleteSelectedBtn.onclick = () => {
    selectedMessages.forEach(id => remove(ref(db, 'messages/' + id)));
    cancelSelection();
};

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

function generateWaveBars(count = 20) {
    let bars = "";
    for (let i = 0; i < count; i++) {
        bars += `<div class="wave-bar" style="width: 3px; height: 15px; background: #444; border-radius: 2px;"></div>`;
    }
    return bars;
}

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
    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-overlay-btn';
    closeBtn.innerText = '×';
    const img = document.createElement('img');
    img.src = src;
    overlay.appendChild(closeBtn);
    overlay.appendChild(img);
    img.onclick = (e) => {
        e.stopPropagation();
        closeBtn.style.display = (closeBtn.style.display === 'none') ? 'flex' : 'none';
    };
    closeBtn.onclick = () => overlay.remove();
    overlay.onclick = (e) => { 
        if(e.target === closeBtn) overlay.remove(); 
    };
    document.body.appendChild(overlay);
}

onChildAdded(ref(db, 'messages'), (snapshot) => {
    const data = snapshot.val();
    const date = new Date(data.timestamp);
    const dateStr = date.toLocaleDateString('pt-BR');
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.id = 'msg-' + snapshot.key;
    msgDiv.innerHTML = `
        <div class="msg-header">
            <img class="msg-avatar" src="https://cdn.discordapp.com/avatars/${data.userId}/${data.avatar}.png">
            <span class="msg-user">${data.username}</span>
            <span class="msg-time">${dateStr} ${timeStr}</span>
        </div>
        <div class="msg-content">
            ${data.message}
        </div>
    `;
    
    msgDiv.addEventListener('touchstart', () => pressTimer = setTimeout(() => toggleSelection(snapshot.key, msgDiv), 600));
    msgDiv.addEventListener('touchend', () => clearTimeout(pressTimer));
    msgDiv.onclick = () => { if (selectedMessages.length > 0) toggleSelection(snapshot.key, msgDiv); };

    const imgElement = msgDiv.querySelector('img[src^="data:image"]');
    if (imgElement) {
        imgElement.style.cursor = 'pointer';
        imgElement.onclick = () => openImageOverlay(imgElement.src);
    }

    messagesContainer.prepend(msgDiv);
});

onChildRemoved(ref(db, 'messages'), (snapshot) => {
    const el = document.getElementById('msg-' + snapshot.key);
    if (el) el.remove();
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
        iconMic.style.color = "#666";
        iconMic.classList.remove('hidden');
        iconSend.classList.add('hidden');
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
        iconMic.classList.add('hidden');
        iconSend.classList.remove('hidden');
        addImgBtn.style.display = "none";
        trashBtn.style.display = "block";
        pauseBtn.style.display = "block";
        msgInput.value = "0:00 - 2:00";
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
                            <div class="audio-message" id="container_${audioId}">
                                <button class="play-btn" data-play-btn="${audioId}" onclick="togglePlay('${audioId}')">▶</button>
                                <audio id="${audioId}" src="${reader.result}"></audio>
                                <div class="waveform">${generateWaveBars()}</div>
                                <span style="color:#fff; font-size: 12px;">${totalDuration}</span>
                            </div>`,
                        timestamp: Date.now()
                    });
                };
            }
            msgInput.value = '';
            iconMic.classList.remove('hidden');
            iconSend.classList.add('hidden');
            addImgBtn.style.display = "block";
            trashBtn.style.display = "none";
            pauseBtn.style.display = "none";
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
        };
        mediaRecorder.start();
    } catch (err) { alert("Permissão de microfone necessária."); }
}

trashBtn.onclick = () => { if (mediaRecorder) { isDiscarding = true; mediaRecorder.stop(); audioChunks = []; } };
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

function stopRecording() { if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop(); }

actionBtn.addEventListener('click', () => {
    if (!iconSend.classList.contains('hidden') && !msgInput.value.includes('-')) sendMessage();
    else if (mediaRecorder && mediaRecorder.state !== "inactive") stopRecording();
    else startRecording();
});

msgInput.addEventListener('input', () => {
    if (!window.userData || (mediaRecorder && mediaRecorder.state !== "inactive")) return;
    const hasText = msgInput.value.trim().length > 0;
    iconMic.classList.toggle('hidden', hasText);
    iconSend.classList.toggle('hidden', !hasText);
});

plusBtn.addEventListener('click', () => {
    const communityIcons = iconsContainer.querySelectorAll('.icon-item:not(#plusBtn)');
    if (communityIcons.length < 3) {
        const newIcon = document.createElement('div');
        newIcon.className = 'icon-item';
        newIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
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
