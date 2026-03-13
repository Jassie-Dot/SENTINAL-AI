
import { SoundManager } from './sound-manager.js';

const socket = io();
const sfx = new SoundManager();

// DOM Elements
const closeRepairBtn = document.getElementById('closeRepairBtn');
const btnScan = document.getElementById('btnScan');
const btnDiagnose = document.getElementById('btnDiagnose');
const repairLog = document.getElementById('repairLog');
const repairVisualizer = document.getElementById('repairVisualizer');
const repairInput = document.getElementById('repairInput');
const repairSubmit = document.getElementById('repairSubmit');
const integrityValue = document.getElementById('integrityValue');

// --- VISUALIZER ENGINE ---
const canvas = document.createElement('canvas');
repairVisualizer.appendChild(canvas);
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let scanLineY = 0;
let isScanning = false;

function resize() {
    width = canvas.width = repairVisualizer.offsetWidth;
    height = canvas.height = repairVisualizer.offsetHeight;
}
window.addEventListener('resize', resize);
setTimeout(resize, 100); // Initial resize delay

function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 1,
            speedY: Math.random() * 1 + 0.5,
            color: '#ffaa00'
        });
    }
}

function drawVisualizer() {
    ctx.fillStyle = 'rgba(5, 5, 5, 0.25)'; // Trail effect
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;

    // Vertical lines
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Init particles if empty (on load)
    if (particles.length === 0 && width > 0) initParticles();

    // Draw Particles
    particles.forEach(p => {
        p.y -= p.speedY; // Float up
        if (p.y < 0) p.y = height;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connections
        particles.forEach(p2 => {
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 50) {
                ctx.strokeStyle = `rgba(255, 170, 0, ${1 - dist / 50})`;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    });

    // Active Scan Effect
    if (isScanning) {
        scanLineY += 8;
        if (scanLineY > height) scanLineY = 0;

        ctx.fillStyle = 'rgba(255, 170, 0, 0.5)';
        ctx.fillRect(0, scanLineY, width, 4);

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffaa00';
    } else {
        ctx.shadowBlur = 0;
    }

    requestAnimationFrame(drawVisualizer);
}
drawVisualizer();


// --- LOGIC ---

function addRepairLog(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.textContent = `> ${msg}`;
    if (repairLog) {
        repairLog.appendChild(div);
        repairLog.scrollTop = repairLog.scrollHeight;
    }
}

// Sound Effects on Buttons
document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => sfx.playHover());
    btn.addEventListener('click', () => sfx.playClick());
});

// Close
if (closeRepairBtn) {
    closeRepairBtn.addEventListener('click', () => {
        sfx.playClick();
        window.close();
    });
}

// Socket
socket.on('connect', () => {
    addRepairLog("UPLINK ESTABLISHED: SENTINAL CORE", "success");
    addRepairLog("Awaiting Command...", "info");
});

socket.on('repair:status', (data) => addRepairLog(data.message, 'info'));

socket.on('repair:progress', (data) => {
    // Only log occasionally to avoid spamming the UI thread too hard
    // but update visuals always
    const statusDiv = document.getElementById('statusText');
    if (statusDiv) statusDiv.textContent = `SCANNING: ${data.file}`;

    // Quick flash
    if (!isScanning) isScanning = true;

    if (Math.random() > 0.7) {
        sfx.playTone(800 + Math.random() * 1000, 'square', 0.03, 0.05);
    }
});

socket.on('repair:complete', (report) => {
    setTimeout(() => { isScanning = false; }, 500);
    addRepairLog(`SCAN COMPLETE. ${report.totalFiles} FILES ANALYZED.`, 'success');
    addRepairLog(`${report.issues.length} ANOMALIES DETECTED.`);

    if (btnDiagnose) {
        btnDiagnose.disabled = false;
        btnDiagnose.classList.add('pulse-anim');
        btnDiagnose.innerHTML = '<span class="icon">🩺</span> DIAGNOSE (READY)';
        btnDiagnose.style.borderColor = "#00ff00";
        btnDiagnose.style.color = "#00ff00";
    }

    if (integrityValue) {
        const health = report.issues.length === 0 ? "100%" : "87%";
        integrityValue.textContent = health;
        integrityValue.style.color = report.issues.length === 0 ? "#00ff00" : "#ff3333";
    }
    sfx.playAlert();
});

// Buttons
if (btnScan) {
    btnScan.addEventListener('click', () => {
        btnScan.disabled = true;
        isScanning = true;
        addRepairLog("INITIALIZING HEURISTIC SCAN...", "warn");
        socket.emit('chat:message', { message: "system.scan" });
    });
}

if (btnDiagnose) {
    btnDiagnose.addEventListener('click', () => {
        addRepairLog("COMPILING DIAGNOSTIC REPORT...", "warn");
        btnDiagnose.disabled = true;

        // Visual feedback immediately
        const steps = ["Analyzing Core Dumps...", "Tracing Stack Overflows...", "Checking Quantum Entanglement..."];
        let step = 0;

        const i = setInterval(() => {
            if (step >= steps.length) {
                clearInterval(i);
                socket.emit('chat:message', { message: "system.diagnose" });
                return;
            }
            addRepairLog(steps[step]);
            sfx.playProcess();
            step++;
        }, 800);
    });
}

if (repairSubmit) {
    repairSubmit.addEventListener('click', () => {
        const issue = repairInput.value;
        if (issue && issue.trim()) {
            addRepairLog(`USER LOG: ${issue}`);
            socket.emit('chat:message', { message: `repair: ${issue}` });
            repairInput.value = '';
        }
    });
}

// Enter key for input
repairInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') repairSubmit.click();
});
