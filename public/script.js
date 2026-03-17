/**
 * SENTINAL PRO - Main Application Controller
 * View routing, boot sequence, chat, voice, evolution, system control
 * Socket.IO integration with existing backend
 */

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════

    const state = {
        currentView: 'dashboard',
        socket: null,
        connected: false,
        reactor: null,
        voiceReactor: null,
        isListening: false,
        isSpeaking: false,
        recognition: null,
        synthesis: window.speechSynthesis,
        wasListeningBeforeSpeech: false,
        chatHistory: [],
        bootComplete: false,
        neuralChat: null,
        neuralVoice: null,
        audioContext: null,
        analyser: null,
        audioStream: null,
        visualizerActive: false,
    };

    // ═══════════════════════════════════════════════════════════
    // DOM REFERENCES
    // ═══════════════════════════════════════════════════════════

    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ═══════════════════════════════════════════════════════════
    // BOOT SEQUENCE
    // ═══════════════════════════════════════════════════════════

    const bootMessages = [
        'Loading quantum core firmware...',
        'Initializing neural pathways...',
        'Calibrating consciousness matrix...',
        'Probing AI providers...',
        'Establishing socket bridge...',
        'Loading plugin ecosystem [57 modules]...',
        'Activating self-evolution engine...',
        'Running integrity diagnostics...',
        'Binding system hooks...',
        'Initializing real-time access layer...',
        'Core online. All systems nominal.',
    ];

    async function runBootSequence() {
        const progressBar = $('boot-progress');
        const statusEl = $('boot-status');
        const logEl = $('boot-log');

        for (let i = 0; i < bootMessages.length; i++) {
            const msg = bootMessages[i];
            statusEl.textContent = msg;

            const logLine = document.createElement('div');
            logLine.className = 'log-line';
            logLine.textContent = `[${String(i).padStart(2, '0')}] ${msg}`;
            logEl.appendChild(logLine);

            // Keep only last 5 lines visible
            while (logEl.children.length > 5) {
                logEl.removeChild(logEl.firstChild);
            }

            const progress = ((i + 1) / bootMessages.length) * 100;
            progressBar.style.width = progress + '%';

            await sleep(300 + Math.random() * 400);
        }

        await sleep(600);

        // Transition to app
        const bootScreen = $('boot-screen');
        bootScreen.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        bootScreen.style.opacity = '0';
        bootScreen.style.transform = 'scale(1.05)';

        await sleep(800);
        bootScreen.style.display = 'none';

        const app = $('app');
        app.classList.remove('hidden');
        app.style.opacity = '0';
        app.style.transition = 'opacity 0.5s ease';
        requestAnimationFrame(() => { app.style.opacity = '1'; });

        state.bootComplete = true;
        initApp();
    }

    // ═══════════════════════════════════════════════════════════
    // APP INITIALIZATION
    // ═══════════════════════════════════════════════════════════

    function initApp() {
        initSocket();
        initNavigation();
        initTitlebar();
        initReactor();
        initChat();
        initVoice();
        initDashboard();
        initEvolution();
        initSystemControl();
        initSettings();
        initRepair();
        initWeather();
        initNeural();
        initAudioVisualizer();
        startClock();
    }

    // ═══════════════════════════════════════════════════════════
    // SOCKET.IO
    // ═══════════════════════════════════════════════════════════

    function initSocket() {
        if (typeof io === 'undefined') {
            // Load socket.io client
            const script = document.createElement('script');
            script.src = '/socket.io/socket.io.js';
            script.onload = () => connectSocket();
            script.onerror = () => {
                console.warn('[UI] Socket.IO client not available');
                updateConnectionStatus(false);
            };
            document.head.appendChild(script);
        } else {
            connectSocket();
        }
    }

    function connectSocket() {
        try {
            state.socket = io({ transports: ['websocket', 'polling'] });

            state.socket.on('connect', () => {
                state.connected = true;
                updateConnectionStatus(true);
                console.log('[UI] Connected to SENTINAL backend');
            });

            state.socket.on('disconnect', () => {
                state.connected = false;
                updateConnectionStatus(false);
            });

            state.socket.on('chat:stream:token', (data) => {
                appendToken(data.token);
            });

            state.socket.on('chat:stream:end', () => {
                finishAssistantMessage();
            });

            state.socket.on('chat:response', (data) => {
                // Handle non-streamed full responses
                if (!data.streamed && !currentAssistantEl) {
                    $('thinking-indicator').classList.add('hidden');
                    addMessageToChat('assistant', data.message);
                    if (state.reactor) state.reactor.setState('idle');
                    if ($('setting-voice')?.checked && state.currentView === 'voice') {
                        speak(data.message);
                    }
                }
            });

            state.socket.on('chat:error', (data) => {
                finishAssistantMessage();
                appendSystemMessage('Error: ' + (data.error || 'Unknown error'));
            });

            state.socket.on('status-update', (data) => {
                if (data.mood) $('emotion-mood').textContent = data.mood;
                if (data.thought) {
                    $('thought-text').textContent = data.thought;
                    // Also show in thinking panel if active
                    if (state.currentView === 'chat' || state.currentView === 'voice') {
                        addThinkingStep(data.thought, 'thought');
                        if (state.neuralChat) state.neuralChat.spike();
                        if (state.neuralVoice) state.neuralVoice.spike();
                    }
                }
            });

            state.socket.on('intent:detected', (data) => {
                addThinkingStep(`Intent Recognized: ${data.intent} (${Math.round(data.confidence * 100)}%)`, 'intent');
                if (state.neuralChat) state.neuralChat.spike();
                if (state.neuralVoice) state.neuralVoice.spike();
            });

            state.socket.on('provider-info', (data) => {
                updateProviderDisplay(data);
            });

            state.socket.on('system-metrics', (data) => {
                updateSystemMetrics(data);
            });

            state.socket.on('tts:speak', (data) => {
                if ($('setting-voice')?.checked && state.currentView === 'voice') {
                    speak(data.text);
                }
            });

        } catch (e) {
            console.warn('[UI] Socket connection failed:', e);
            updateConnectionStatus(false);
        }
    }

    function updateConnectionStatus(online) {
        const dot = $('status-dot');
        const text = $('titlebar-status');
        const providerPill = $('sidebar-provider');

        if (online) {
            dot.className = 'status-dot online';
            text.textContent = 'Connected';
            if (providerPill) providerPill.querySelector('.provider-dot').className = 'provider-dot online';
        } else {
            dot.className = 'status-dot offline';
            text.textContent = 'Disconnected';
            if (providerPill) providerPill.querySelector('.provider-dot').className = 'provider-dot';
        }
    }

    function updateProviderDisplay(info) {
        const nameEl = document.querySelector('.provider-name');
        if (nameEl && info.current) {
            const names = { groq: 'Groq Cloud', gemini: 'Google Gemini', ollama: 'Ollama Local', offline: 'Offline' };
            nameEl.textContent = names[info.current] || info.current;
        }
        // Update settings dropdown
        const sel = $('setting-provider');
        if (sel && info.current && info.current !== 'offline') {
            sel.value = info.current;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════

    function initNavigation() {
        $$('.nav-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                switchView(view);
            });
        });

        // Quick action buttons
        $$('.action-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'chat' || action === 'voice') {
                    switchView(action);
                } else if (action === 'repair') {
                    switchView('system');
                    setTimeout(() => runRepairScan(), 300);
                } else if (action === 'evolve') {
                    switchView('evolution');
                    setTimeout(() => triggerEvolution(), 300);
                }
            });
        });
    }

    function switchView(viewId) {
        state.currentView = viewId;

        // Update nav
        $$('.nav-item').forEach((n) => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update views
        $$('.view').forEach((v) => v.classList.remove('active'));
        const activeView = $(`view-${viewId}`);
        if (activeView) {
            activeView.classList.add('active');
            activeView.style.animation = 'none';
            requestAnimationFrame(() => { activeView.style.animation = ''; });
        }

        // Initialize voice reactor if switching to voice
        if (viewId === 'voice' && !state.voiceReactor) {
            setTimeout(() => {
                state.voiceReactor = new SentinalCore3D('voice-reactor-container');
            }, 100);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TITLEBAR
    // ═══════════════════════════════════════════════════════════

    function initTitlebar() {
        // Window controls (Electron IPC)
        const ipcActions = { 'btn-minimize': 'minimize', 'btn-maximize': 'maximize', 'btn-close': 'close' };

        Object.entries(ipcActions).forEach(([id, action]) => {
            const btn = $(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (window.electronAPI && window.electronAPI[action]) {
                        window.electronAPI[action]();
                    }
                });
            }
        });

        // Repair button
        const repairBtn = $('btn-repair');
        if (repairBtn) {
            repairBtn.addEventListener('click', () => {
                switchView('system');
                setTimeout(() => runRepairScan(), 300);
            });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3D REACTOR
    // ═══════════════════════════════════════════════════════════

    function initReactor() {
        setTimeout(() => {
            const container = $('reactor-container');
            if (container && window.SentinalCore3D) {
                state.reactor = new SentinalCore3D(container);
            }
        }, 200);
    }

    // ═══════════════════════════════════════════════════════════
    // CHAT
    // ═══════════════════════════════════════════════════════════

    let currentAssistantEl = null;
    let currentAssistantText = '';

    function initChat() {
        const input = $('chat-input');
        const sendBtn = $('send-btn');

        const send = () => {
            const text = input.value.trim();
            if (!text) return;
            sendMessage(text);
            input.value = '';
            input.style.height = 'auto';
        };

        sendBtn.addEventListener('click', send);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    }

    function sendMessage(text) {
        // Add user message
        addMessageToChat('user', text);

        // Remove welcome screen
        const welcome = document.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        // Show thinking
        $('thinking-indicator').classList.remove('hidden');
        $('stop-chat-btn')?.classList.remove('hidden');
        clearThinking();
        addThinkingStep(`Processing request: "${text.slice(0, 30)}..."`, 'info');
        if (state.reactor) state.reactor.setState('processing');

        // Send via socket
        if (state.socket && state.connected) {
            state.socket.emit('chat:message', { message: text });
        } else {
            // Fallback to REST
            fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            })
                .then((r) => r.json())
                .then((data) => {
                    $('thinking-indicator').classList.add('hidden');
                    addMessageToChat('assistant', data.response || data.error || 'No response');
                    if (state.reactor) state.reactor.setState('idle');
                })
                .catch((err) => {
                    $('thinking-indicator').classList.add('hidden');
                    $('stop-chat-btn')?.classList.add('hidden');
                    appendSystemMessage('Connection error: ' + err.message);
                    if (state.reactor) state.reactor.setState('idle');
                });
        }
    }

    function addMessageToChat(role, content) {
        const container = $('chat-messages');
        const msg = document.createElement('div');
        msg.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? 'U' : 'S';

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.innerHTML = parseMarkdown(content);

        msg.appendChild(avatar);
        msg.appendChild(contentEl);
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;

        return msg;
    }

    function appendToken(token) {
        if (token && typeof token === 'object' && token.isThought) {
            // It's a thinking token (internal reasoning)
            addThinkingToken(token.token);
            if (state.neuralChat) state.neuralChat.spike();
            if (state.neuralVoice) state.neuralVoice.spike();
            return;
        }

        if (!currentAssistantEl) {
            // First token - create message element
            $('thinking-indicator').classList.add('hidden');
            if (state.reactor) state.reactor.setState('speaking');

            const container = $('chat-messages');
            currentAssistantEl = document.createElement('div');
            currentAssistantEl.className = 'message assistant';

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = 'S';

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';

            currentAssistantEl.appendChild(avatar);
            currentAssistantEl.appendChild(contentEl);
            container.appendChild(currentAssistantEl);
            currentAssistantText = '';
        }

        const actualToken = (typeof token === 'string') ? token : (token.token || '');
        currentAssistantText += actualToken;
        const contentEl = currentAssistantEl.querySelector('.message-content');
        contentEl.innerHTML = parseMarkdown(currentAssistantText);

        if (state.neuralChat) state.neuralChat.spike();
        if (state.neuralVoice) state.neuralVoice.spike();

        const container = $('chat-messages');
        container.scrollTop = container.scrollHeight;
    }

    function addThinkingToken(token) {
        const panel = $('thinking-process-panel');
        if (panel && panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
        }
        
        let stepsEl = $('thinking-steps');
        let currentStep = stepsEl.querySelector('.thinking-step.active-thought');
        
        if (!currentStep) {
            currentStep = document.createElement('div');
            currentStep.className = 'thinking-step active-thought';
            currentStep.innerHTML = '<span class="step-bullet"></span><span class="step-text"></span>';
            stepsEl.appendChild(currentStep);
        }
        
        const textEl = currentStep.querySelector('.step-text');
        textEl.textContent += token;
        
        panel.scrollTop = panel.scrollHeight;
    }

    function addThinkingStep(text, type) {
        const panel = $('thinking-process-panel');
        if (panel && panel.classList.contains('hidden') && state.bootComplete) {
            panel.classList.remove('hidden');
        }

        const stepsEl = $('thinking-steps');
        const step = document.createElement('div');
        step.className = `thinking-step ${type || ''}`;
        step.innerHTML = `<span class="step-bullet"></span><span class="step-text">${text}</span>`;
        
        // Remove active class from previous
        stepsEl.querySelectorAll('.active-thought').forEach(s => s.classList.remove('active-thought'));
        
        stepsEl.appendChild(step);
        panel.scrollTop = panel.scrollHeight;

        if (state.neuralChat) state.neuralChat.spike();
        if (state.neuralVoice) state.neuralVoice.spike();
    }

    function clearThinking() {
        $('thinking-steps').innerHTML = '';
        $('thinking-process-panel')?.classList.add('hidden');
    }

    function finishAssistantMessage() {
        if (currentAssistantEl) {
            const contentEl = currentAssistantEl.querySelector('.message-content');
            contentEl.innerHTML = parseMarkdown(currentAssistantText);
        }
        currentAssistantEl = null;
        currentAssistantText = '';
        $('thinking-indicator').classList.add('hidden');
        $('stop-chat-btn')?.classList.add('hidden');
        $('thinking-process-panel')?.classList.add('hidden');
        if (state.reactor) state.reactor.setState('idle');

        // TTS (Only in Voice View)
        if ($('setting-voice')?.checked && currentAssistantText && state.currentView === 'voice') {
            speak(currentAssistantText);
        }
    }

    function appendSystemMessage(text) {
        const container = $('chat-messages');
        const msg = document.createElement('div');
        msg.className = 'message assistant';
        msg.innerHTML = `<div class="message-avatar" style="background:rgba(239,68,68,0.2);border-color:rgba(239,68,68,0.3);color:var(--accent-red)">!</div><div class="message-content" style="border-color:rgba(239,68,68,0.2)">${escapeHtml(text)}</div>`;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════
    // MARKDOWN PARSER (lightweight)
    // ═══════════════════════════════════════════════════════════

    function parseMarkdown(text) {
        if (!text) return '';
        let html = escapeHtml(text);

        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        // Lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        // Clean empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        // Line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════════════════
    // VOICE
    // ═══════════════════════════════════════════════════════════

    function initVoice() {
        const btn = $('voice-btn');
        if (!btn) return;

        btn.addEventListener('click', toggleVoice);

        // Speech recognition setup
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            state.recognition = new SpeechRecognition();
            state.recognition.continuous = true;
            state.recognition.interimResults = true;
            state.recognition.lang = 'en-US';

            state.recognition.onresult = (e) => {
                let transcript = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                $('voice-transcript').textContent = transcript;

                // If final result
                if (e.results[e.results.length - 1].isFinal) {
                    setTimeout(() => {
                        if (transcript.trim()) {
                            sendMessage(transcript.trim());
                            // Stop recognition to allow AI to speak, but stay in Voice Mode
                            stopVoice();
                        }
                    }, 500);
                }
            };

            state.recognition.onend = () => {
                if (state.isListening) {
                    try { state.recognition.start(); } catch (e) { /* ignore */ }
                }
            };

            state.recognition.onerror = (e) => {
                console.warn('[Voice] Recognition error:', e.error);
                if (e.error === 'not-allowed') {
                    $('voice-status').textContent = 'Microphone access denied';
                }
            };
        }
    }

    function toggleVoice() {
        if (state.isListening) {
            stopVoice();
        } else {
            startVoice();
        }
    }

    async function startVoice() {
        if (!state.recognition) return;
        state.isListening = true;
        $('voice-btn').classList.add('active');
        $('voice-status').textContent = 'Listening...';
        $('voice-status').className = 'voice-status listening';
        $('voice-transcript').textContent = '';

        if (state.voiceReactor) state.voiceReactor.setState('listening');

        // Setup audio visualizer stream
        await setupAudioStream();

        try { state.recognition.start(); } catch (e) { /* already started */ }
    }

    function stopVoice() {
        state.isListening = false;
        $('voice-btn').classList.remove('active');
        $('voice-status').textContent = 'Tap to speak';
        $('voice-status').className = 'voice-status';

        if (state.voiceReactor) state.voiceReactor.setState('idle');

        try { state.recognition.stop(); } catch (e) { /* ignore */ }
    }

    function speak(text) {
        if (!state.synthesis || !$('setting-voice')?.checked) return;

        // Strip markdown
        const clean = text.replace(/[#*`_\[\]()]/g, '').replace(/<[^>]*>/g, '');
        if (!clean.trim()) return;

        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = parseFloat($('setting-tts-rate')?.value || '1');
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            state.isSpeaking = true;
            if (state.reactor) state.reactor.setState('speaking');
            $('stop-voice-btn')?.classList.remove('hidden');
            
            // Auto-stop listening while speaking to avoid feedback
            if (state.isListening) {
                state.wasListeningBeforeSpeech = true;
                stopVoice();
            } else {
                state.wasListeningBeforeSpeech = false;
            }
        };
        utterance.onend = () => {
            state.isSpeaking = false;
            if (state.reactor) state.reactor.setState('idle');
            $('stop-voice-btn')?.classList.add('hidden');
            
            // Auto-resume listening if we were listening before
            if (state.wasListeningBeforeSpeech && state.currentView === 'voice') {
                startVoice();
            }
        };

        state.synthesis.cancel();
        state.synthesis.speak(utterance);
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    function initDashboard() {
        // Simulated metrics update
        updateMetrics();
        setInterval(updateMetrics, 3000);
    }

    function updateMetrics() {
        // Simulated values (real values come from socket system-metrics events)
        const cpu = 15 + Math.random() * 30;
        const mem = 40 + Math.random() * 20;
        const disk = 55 + Math.random() * 10;

        updateMetricRing('cpu-metric', cpu, `${Math.round(cpu)}%`);
        $('cpu-value').textContent = `${Math.round(cpu)}%`;

        updateMetricRing('mem-metric', mem, `${Math.round(mem)}%`);
        $('mem-value').textContent = `${Math.round(mem)}%`;

        $('net-value').textContent = state.connected ? 'OK' : '--';
        updateMetricRing('net-metric', state.connected ? 90 : 0);

        updateMetricRing('disk-metric', disk, `${Math.round(disk)}%`);
        $('disk-value').textContent = `${Math.round(disk)}%`;
    }

    function updateMetricRing(cardId, percent) {
        const card = $(cardId);
        if (!card) return;
        const fill = card.querySelector('.metric-ring-fill');
        if (fill) {
            fill.setAttribute('stroke-dasharray', `${percent} ${100 - percent}`);
        }
    }

    function updateSystemMetrics(data) {
        if (data.cpu !== undefined) {
            updateMetricRing('cpu-metric', data.cpu);
            $('cpu-value').textContent = `${Math.round(data.cpu)}%`;
        }
        if (data.memory !== undefined) {
            updateMetricRing('mem-metric', data.memory);
            $('mem-value').textContent = `${Math.round(data.memory)}%`;
        }
    }

    function startClock() {
        function update() {
            const now = new Date();
            const time = now.toLocaleTimeString('en-US', { hour12: false });
            const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const el = $('dash-clock');
            if (el) el.textContent = `${date}  ${time}`;
        }
        update();
        setInterval(update, 1000);
    }

    // ═══════════════════════════════════════════════════════════
    // WEATHER
    // ═══════════════════════════════════════════════════════════

    async function initWeather() {
        const weatherCity = $('weather-city');
        const weatherTemp = $('weather-temp');
        const weatherDesc = $('weather-desc');
        const weatherHumidity = $('weather-humidity');
        const weatherWind = $('weather-wind');

        if (!weatherCity) return;

        try {
            let city = '';
            
            // Try browser geolocation first
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    // If we have coords, we'll let our proxy handle them
                    const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                    const data = await res.json();
                    
                    const current = data.current_condition[0];
                    const area = data.nearest_area[0];
                    city = area.areaName[0].value;
                    
                    weatherCity.textContent = city;
                    weatherTemp.textContent = `${current.temp_C}°C`;
                    weatherDesc.textContent = current.weatherDesc[0].value;
                    weatherHumidity.textContent = current.humidity;
                    weatherWind.textContent = current.windspeedKmph;
                    return; // Done
                } catch (geoErr) {
                    console.log('[Weather] Geolocation failed or denied, falling back to IP detection');
                }
            }

            // Fallback: Use proxy's auto-IP detection (no lat/lon parameters)
            const res = await fetch(`/api/weather`);
            const data = await res.json();

            const current = data.current_condition[0];
            const area = data.nearest_area[0];
            city = area.areaName[0].value;

            weatherCity.textContent = city;
            weatherTemp.textContent = `${current.temp_C}°C`;
            weatherDesc.textContent = current.weatherDesc[0].value;
            weatherHumidity.textContent = current.humidity;
            weatherWind.textContent = current.windspeedKmph;

        } catch (e) {
            console.warn('[Weather] Sync failed:', e);
            weatherCity.textContent = 'Sync Error';
            weatherDesc.textContent = 'Environmental data unavailable';
        }
    }

    // ═══════════════════════════════════════════════════════════
    // EVOLUTION
    // ═══════════════════════════════════════════════════════════

    function initEvolution() {
        const triggerBtn = $('evo-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', triggerEvolution);
        }
        loadEvolutionLog();
    }

    async function triggerEvolution() {
        addEvoLog('Initiating evolution cycle...', 'info');

        let res;
        try {
            res = await fetch('/api/evolution/trigger', { method: 'POST' });
        } catch (e) {
            addEvoLog('Evolution API not reachable - check backend status', 'error');
            return;
        }

        const data = await readJsonSafe(res);
        if (!res.ok) {
            const msg = data?.error || data?.message || res.statusText || 'Request failed';
            addEvoLog(`Evolution failed: ${msg}`, 'error');
            return;
        }

        const payload = (data && data.result) ? data.result : (data || {});
        const success = (payload.success !== undefined) ? payload.success : Boolean(data?.success ?? data?.ok);

        if (success) {
            addEvoLog('Evolution cycle completed successfully', 'success');
            const detail = formatEvolutionEntry(payload);
            if (detail) addEvoLog(detail, 'info', payload.timestamp);
            if (payload.note) addEvoLog(payload.note, 'info', payload.timestamp);
        } else {
            const msg = payload.message || payload.error || data?.message || 'No changes needed';
            addEvoLog('Evolution cycle: ' + msg, 'info');
        }

        const hasStats = data && (data.generation !== undefined || data.fitness !== undefined || data.mutations !== undefined);
        if (data?.generation !== undefined) $('evo-generation').textContent = `Gen ${data.generation}`;
        if (data?.fitness !== undefined) $('evo-fitness').textContent = `${data.fitness}`;
        if (data?.mutations !== undefined) $('evo-mutations').textContent = `${data.mutations}`;

        await loadEvolutionLog({ skipStats: hasStats });
    }

    async function loadEvolutionLog(options = {}) {
        const logEl = $('evo-log');
        if (!logEl) return false;
        const { skipStats = false } = options;

        try {
            const res = await fetch('/api/evolution/log');
            if (!res.ok) return false;
            const data = await res.json();
            if (!Array.isArray(data)) return false;

            logEl.innerHTML = '';
            if (data.length === 0) {
                addEvoLog('Evolution engine standing by...');
                return true;
            }

            const entries = data.slice().reverse();
            entries.forEach((entry) => {
                const message = formatEvolutionEntry(entry);
                if (message) {
                    addEvoLog(message, entry.success ? 'success' : 'error', entry.timestamp);
                }
            });

            if (!skipStats) updateEvolutionStatsFromLog(data);
            return true;
        } catch (e) {
            return false;
        }
    }

    function updateEvolutionStatsFromLog(log) {
        if (!Array.isArray(log) || log.length === 0) return;
        const total = log.length;
        const successes = log.filter((entry) => entry && entry.success).length;
        $('evo-generation').textContent = `Gen ${total}`;
        $('evo-fitness').textContent = `${Math.round((successes / total) * 100)}%`;
        $('evo-mutations').textContent = `${successes}`;
    }

    function formatEvolutionEntry(entry) {
        if (!entry) return '';
        if (entry.success === false) {
            return `Evolution failed: ${entry.error || entry.message || 'Unknown error'}`;
        }

        const parts = [];
        if (entry.capability) parts.push(`Target: ${entry.capability}`);
        if (entry.newPlugin) parts.push(`Staged: ${entry.newPlugin}`);
        if (Array.isArray(entry.dependencies) && entry.dependencies.length > 0) {
            parts.push(`Deps: ${entry.dependencies.join(', ')}`);
        }
        if (entry.duration) parts.push(`Duration: ${entry.duration}s`);
        if (entry.stagedPath) parts.push(`Path: ${entry.stagedPath}`);
        if (entry.note) parts.push(entry.note);

        return parts.join(' | ') || 'Evolution cycle completed';
    }

    async function readJsonSafe(res) {
        if (!res) return null;
        const text = await res.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (e) {
            return { raw: text };
        }
    }

    function addEvoLog(message, type = '', timestamp = null) {
        const log = $('evo-log');
        const entry = document.createElement('div');
        entry.className = `evo-log-entry ${type}`;
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeStr = time.toLocaleTimeString('en-US', { hour12: false });
        entry.textContent = `[${timeStr}] ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════
    // SYSTEM CONTROL
    // ═══════════════════════════════════════════════════════════

    function initSystemControl() {
        // Fetch system info
        fetchSystemInfo();
        setInterval(fetchSystemInfo, 10000);
    }

    async function fetchSystemInfo() {
        try {
            const res = await fetch('/api/system/info');
            const data = await res.json();

            if (data.os) $('sys-os').textContent = data.os;
            if (data.uptime) $('sys-uptime').textContent = formatUptime(data.uptime);
            if (data.cpu) $('sys-cpu').textContent = data.cpu;
            if (data.ram) $('sys-ram').textContent = data.ram;
        } catch (e) {
            // System info API might not exist yet
            $('sys-os').textContent = navigator.platform || 'Windows';
        }
    }

    function formatUptime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }

    // ═══════════════════════════════════════════════════════════
    // REAL-TIME REPAIR
    // ═══════════════════════════════════════════════════════════

    function initRepair() {
        const btn = $('repair-scan-btn');
        if (btn) {
            btn.addEventListener('click', runRepairScan);
        }
    }

    async function runRepairScan() {
        const btn = $('repair-scan-btn');
        const statusEl = $('repair-status');
        const logEl = $('repair-log');

        btn.disabled = true;
        statusEl.textContent = 'Running diagnostics...';
        logEl.innerHTML = '';

        const checks = [
            { name: 'Network connectivity', check: checkNetwork },
            { name: 'AI provider status', check: checkProvider },
            { name: 'Socket connection', check: checkSocket },
            { name: 'Memory usage', check: checkMemory },
            { name: 'Plugin system', check: checkPlugins },
            { name: 'Disk space', check: checkDisk },
        ];

        let issues = 0;

        for (const check of checks) {
            addRepairLine(`Checking ${check.name}...`, '');
            await sleep(400 + Math.random() * 300);

            try {
                const result = await check.check();
                if (result.ok) {
                    addRepairLine(`  ${check.name}: OK`, 'repair-ok');
                } else {
                    addRepairLine(`  ${check.name}: ${result.message}`, 'repair-warn');
                    issues++;

                    // Auto-repair attempt
                    if (result.repair) {
                        addRepairLine(`  Attempting auto-repair...`, '');
                        await sleep(500);
                        try {
                            await result.repair();
                            addRepairLine(`  Repaired successfully`, 'repair-ok');
                        } catch (e) {
                            addRepairLine(`  Auto-repair failed: ${e.message}`, 'repair-err');
                        }
                    }
                }
            } catch (e) {
                addRepairLine(`  ${check.name}: Error - ${e.message}`, 'repair-err');
                issues++;
            }
        }

        addRepairLine('', '');
        if (issues === 0) {
            statusEl.textContent = 'All systems healthy - no issues detected';
            addRepairLine('Diagnostics complete: All systems nominal', 'repair-ok');
        } else {
            statusEl.textContent = `Found ${issues} issue(s) - see log for details`;
            addRepairLine(`Diagnostics complete: ${issues} issue(s) found`, 'repair-warn');
        }

        btn.disabled = false;
    }

    function addRepairLine(text, className) {
        const log = $('repair-log');
        const line = document.createElement('div');
        line.className = `repair-line ${className}`;
        line.textContent = text;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    async function checkNetwork() {
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 3000);
            await fetch('https://1.1.1.1', { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal });
            clearTimeout(t);
            return { ok: true };
        } catch (e) {
            return { ok: false, message: 'No internet connection', repair: () => fetch('https://1.1.1.1', { method: 'HEAD', mode: 'no-cors' }) };
        }
    }

    async function checkProvider() {
        if (state.connected) {
            return { ok: true };
        }
        return { ok: false, message: 'AI provider not connected', repair: () => connectSocket() };
    }

    async function checkSocket() {
        if (state.socket && state.socket.connected) {
            return { ok: true };
        }
        return { ok: false, message: 'Socket disconnected', repair: () => { connectSocket(); return sleep(2000); } };
    }

    async function checkMemory() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize / (1024 * 1024);
            if (used > 500) {
                return { ok: false, message: `High memory usage: ${Math.round(used)}MB` };
            }
        }
        return { ok: true };
    }

    async function checkPlugins() {
        try {
            const res = await fetch('/api/plugins/status');
            const data = await res.json();
            if (data.loaded) {
                return { ok: true };
            }
            return { ok: false, message: 'Some plugins failed to load' };
        } catch (e) {
            return { ok: true }; // Can't check, assume OK
        }
    }

    async function checkDisk() {
        // Can't check disk from browser, assume OK
        return { ok: true };
    }

    // ═══════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════

    function initSettings() {
        // Provider switch
        const provSel = $('setting-provider');
        if (provSel) {
            provSel.addEventListener('change', () => {
                if (state.socket) {
                    state.socket.emit('switch-provider', { provider: provSel.value });
                }
            });
        }

        // Color swatches
        $$('.color-swatch').forEach((swatch) => {
            swatch.addEventListener('click', () => {
                $$('.color-swatch').forEach((s) => s.classList.remove('active'));
                swatch.classList.add('active');

                const colorMap = {
                    cyan: '#00eaff',
                    purple: '#a855f7',
                    green: '#22d3ee',
                    gold: '#f59e0b',
                };
                const color = colorMap[swatch.dataset.color] || '#00eaff';
                document.documentElement.style.setProperty('--accent-cyan', color);

                if (state.reactor) {
                    state.reactor.targetColor = new THREE.Color(color);
                }
            });
        });
    }


    // ═══════════════════════════════════════════════════════════
    // AUDIO VISUALIZATION & TERMINATION
    // ═══════════════════════════════════════════════════════════

    function initAudioVisualizer() {
        const canvas = $('waveform-canvas');
        if (!canvas) return;

        // Event listeners for Stop Buttons
        const stopChatBtn = $('stop-chat-btn');
        const stopVoiceBtn = $('stop-voice-btn');

        if (stopChatBtn) stopChatBtn.addEventListener('click', handleStopChat);
        if (stopVoiceBtn) stopVoiceBtn.addEventListener('click', handleStopVoice);
    }

    async function setupAudioStream() {
        if (state.audioContext) return;
        
        try {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 512;
            state.analyser.smoothingTimeConstant = 0.82;
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            state.audioStream = stream;
            const source = state.audioContext.createMediaStreamSource(stream);
            source.connect(state.analyser);
            
            state.visualizerActive = true;
            renderWaveform();
        } catch (err) {
            console.error('[Audio] Failed to setup stream:', err);
        }
    }

    function renderWaveform() {
        if (!state.visualizerActive) return;
        
        const canvas = $('waveform-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.max(1, Math.floor(rect.width * dpr));
        const targetHeight = Math.max(1, Math.floor(rect.height * dpr));

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const width = rect.width;
        const height = rect.height;
        const bufferLength = state.analyser?.frequencyBinCount || 256;
        const dataArray = new Uint8Array(bufferLength);
        if (state.analyser) state.analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(8, 12, 22, 0.4)';
        ctx.fillRect(0, 0, width, height);

        const centerY = height / 2;
        const maxBarHeight = height * 0.42;
        const barCount = Math.min(96, Math.max(36, Math.floor(width / 10)));
        const binSize = Math.max(1, Math.floor(bufferLength / barCount));

        if (!state.waveformSmooth || state.waveformSmooth.length !== barCount) {
            state.waveformSmooth = new Float32Array(barCount);
        }

        const barWidth = width / barCount;
        const gap = Math.max(1, barWidth * 0.25);
        const drawWidth = Math.max(2, barWidth - gap);

        const gradient = ctx.createLinearGradient(0, centerY - maxBarHeight, 0, centerY + maxBarHeight);
        if (state.isSpeaking) {
            gradient.addColorStop(0, 'rgba(168, 85, 247, 0.1)');
            gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.9)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
            ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
        } else {
            gradient.addColorStop(0, 'rgba(0, 234, 255, 0.1)');
            gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.9)');
            gradient.addColorStop(1, 'rgba(0, 234, 255, 0.1)');
            ctx.shadowColor = 'rgba(0, 234, 255, 0.55)';
        }

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 18;

        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            const start = i * binSize;
            for (let j = 0; j < binSize; j++) {
                sum += dataArray[start + j] || 0;
            }
            let amp = sum / (binSize * 255);
            if (state.isSpeaking) {
                const t = Date.now() / 120;
                amp += Math.sin(i * 0.35 + t) * 0.08;
            }
            amp = Math.max(0, amp);
            const smooth = (state.waveformSmooth[i] = state.waveformSmooth[i] * 0.72 + amp * 0.28);
            const barHeight = Math.max(3, smooth * maxBarHeight);

            const x = i * barWidth + gap / 2;
            const y = centerY - barHeight;
            const h = barHeight * 2;
            const radius = Math.min(6, drawWidth / 2);
            drawRoundedRect(ctx, x, y, drawWidth, h, radius);
        }

        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        requestAnimationFrame(renderWaveform);
    }

    function drawRoundedRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    function handleStopChat() {
        if (state.socket) {
            state.socket.emit('stop-generation');
        }
        state.synthesis.cancel();
        state.isSpeaking = false;
        $('thinking-indicator').classList.add('hidden');
        $('stop-chat-btn').classList.add('hidden');
        console.log('[App] Chat generation terminated');
    }

    function handleStopVoice() {
        state.synthesis.cancel();
        state.isSpeaking = false;
        $('stop-voice-btn').classList.add('hidden');
        if (state.voiceReactor) state.voiceReactor.setState('idle');
        console.log('[App] Voice output terminated');
    }

    function initNeural() {
        if (typeof NeuralThinking !== 'undefined') {
            state.neuralChat = new NeuralThinking('neural-chat-canvas');
            state.neuralVoice = new NeuralThinking('neural-voice-canvas');
            console.log('[UI] Neural Core initialized');
        } else {
            console.warn('[UI] NeuralThinking class not available');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // ═══════════════════════════════════════════════════════════
    // STARTUP
    // ═══════════════════════════════════════════════════════════

    document.addEventListener('DOMContentLoaded', () => {
        runBootSequence();
    });

})();
