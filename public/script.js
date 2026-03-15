/* SENTINAL MARK IV — DUAL MODE INTERFACE */

import { SoundManager } from './sound-manager.js';

window.addEventListener("load", () => {
  // --- SOUND SYSTEM (PROCEDURAL) ---
  const sfx = new SoundManager();

  // Unlock audio context on first user gesture (prevents autoplay warnings).
  const unlockAudio = () => {
    sfx.unlock?.();
  };
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  // Attach sounds to UI
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => sfx.playHover());
    btn.addEventListener('click', () => sfx.playClick());
  });

  // Attach to inputs
  if (document.getElementById('input')) {
    document.getElementById('input').addEventListener('keydown', () => {
      // Subtle typing sound
      sfx.playTone(800 + Math.random() * 200, 'sine', 0.03, 0.05);
    });
  }

  // --- DOM ELEMENTS ---
  const reactorParallax = document.getElementById("reactorParallax");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const micBtn = document.getElementById("mic");
  const messagesEl = document.getElementById("messages");
  const typingEl = document.getElementById("typing");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const hudClock = document.getElementById("hudClock");
  const hudDate = document.getElementById("hudDate");
  const tempBar = document.getElementById("tempBar");
  const powerBar = document.getElementById("powerBar");

  // Mode UI Elements
  const voiceModeBtn = document.getElementById("voice-toggle");
  const chatModeBtn = document.getElementById("chatModeBtn");
  const hackerModeBtn = document.getElementById("hackerModeBtn");
  const modeStatus = document.getElementById("modeStatus");
  const voiceControls = document.getElementById("voiceControls");
  const voiceStatus = document.getElementById("voiceStatus");
  const voiceTerminate = document.getElementById("voiceTerminate");
  const chatTerminate = document.getElementById("chatTerminate");
  const chatPanel = document.getElementById("chatPanel");

  // --- STATE & CONFIG ---
  let micActive = false;
  let currentMode = "chat"; // "voice" or "chat"
  let isVoiceAutoListening = false;
  let currentAbortController = null;
  let voiceOutputEnabled = true; // Toggle for voice output in chat mode
  const synth = window.speechSynthesis;
  const recognition = initSpeechRecognition();

  // WebSocket connection
  const socket = io();
  window.socket = socket; // Expose globally for inline handlers
  let currentStreamingMessage = null;
  let isStreaming = false;
  let lastAssistantMessageText = "";
  let lastAssistantMessageAt = 0;

  // Image Attachment State
  let pendingImages = []; // Array of base64 image strings
  const fileInputEl = document.getElementById("fileInput");
  const attachBtn = document.getElementById("attach");
  const fileArea = document.getElementById("fileArea");

  // --- ADVANCED BOOT SEQUENCE ---
  // --- ADVANCED RETRO BIOS STARTUP ---
  // --- ADVANCED BOOT SEQUENCE ---
  async function runBiosSequence() {
    const biosScreen = document.getElementById("bios-screen");
    const biosLog = document.getElementById("bios-log");
    const memCounter = document.getElementById("memCounter");
    const dateEl = document.getElementById("bios-date");

    if (!biosScreen || !biosLog) {
      initSystem();
      return;
    }

    // Set Assembly Date
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
    }

    // Helper: Add Log Line
    const addLine = (text, type = 'log-info', speed = 0) => {
      return new Promise(resolve => {
        const p = document.createElement("div");
        p.className = `log-line ${type}`;
        biosLog.appendChild(p);
        biosLog.scrollTop = biosLog.scrollHeight;

        if (speed > 0) {
          // Typing effect
          let i = 0;
          p.classList.add('typing-cursor');
          p.textContent = "";
          const timer = setInterval(() => {
            p.textContent += text.charAt(i);
            i++;
            // Randomize typing sound pitch for realism
            sfx.playTone(800 + Math.random() * 200, 'square', 0.02, 0.05);
            if (i >= text.length) {
              clearInterval(timer);
              p.classList.remove('typing-cursor');
              resolve();
            }
          }, speed);
        } else {
          // Instant
          p.textContent = text;
          resolve();
        }
      });
    };

    const delay = ms => new Promise(r => setTimeout(r, ms));

    // START SEQUENCE
    try {
      // Initial Glitch
      biosScreen.classList.add('glitch-text');
      sfx.playTone(50, 'sawtooth', 0.2, 0.1); // Glitch sound
      setTimeout(() => biosScreen.classList.remove('glitch-text'), 400);

      // 1. BIOS Header Info
      await addLine("BIOS DATE 02/03/2026 14:22:56 VER 4.2.0", "white", 10);
      await addLine("CPU: QUANTUM NEURAL PROCESSOR @ 10.5 GHz", "white", 5);

      // 2. Memory Check (Fast)
      let mem = 0;
      const total = 524288; // 512GB (display value)

      // Start memory hum
      sfx.playTone(100, 'square', 1.0, 0.05);

      const memStep = () => {
        mem += Math.floor(Math.random() * 50000) + 10000;
        if (mem > total) mem = total;
        if (memCounter) memCounter.textContent = mem;

        if (mem < total) {
          requestAnimationFrame(memStep);
        }
      };
      memStep();

      await delay(1200); // Wait for mem check to visually finish

      // 3. System Modules
      const modules = [
        "ACPI Controller... OK",
        "Neural Engine... INITIALIZED",
        "Cryptographic Core... MOUNTED",
        "Liquid Cooling... 34°C",
        "Drive 0: QUANTUM_CORE_DRIVE... MOUNTED",
        "Web Interface... LISTENING",
        "Voice Synthesis... READY",
        "Vision Processing... ONLINE",
        "Security Subsystem... ARMED"
      ];

      for (const mod of modules) {
        addLine(mod, "log-info");
        await delay(60);
      }

      await delay(600);

      // 4. Connection Sequence
      await addLine("Initializing AI Core...", "white", 40);
      await addLine(">> LOADING NEURAL WEIGHTS", "log-warn", 20);
      await delay(400);
      await addLine(">> CONNECTING TO SATELLITE UPLINK", "log-warn", 20);
      await delay(800);

      sfx.playTone(2000, 'sine', 0.5, 0.1); // Connection ping
      await addLine(">> UPLINK ESTABLISHED", "log-success", 0);

      await delay(800);

      // 5. Handover
      await addLine("SYSTEM READY.", "log-success");
      await addLine("BOOTING S.E.N.T.I.N.A.L. INTERFACE...", "white");

      // Startup Swell
      sfx.playStartup();

      await delay(1500);

      // 6. Transition
      const flash = document.createElement('div');
      flash.className = 'flash-white';
      document.body.appendChild(flash);

      biosScreen.style.display = 'none';

      // Start Main System
      initSystem();

      // Cleanup
      setTimeout(() => flash.remove(), 2000);

    } catch (e) {
      console.error("Boot Sequence Error:", e);
      // Fallback if anything crashes
      biosScreen.style.display = 'none';
      initSystem();
    }
  }

  function initSystem() {
    setStatus("idle");
    document.body.style.opacity = "1";
    updateClock();
    setInterval(updateClock, 1000);
    simulateTelemetry();
    initArcReactor();
    console.log("sentinal: System initialized.");
  }

  // Start BIOS
  runBiosSequence();





  // ─── MARKDOWN PARSER ────────────────────────────────────────────
  // Converts AI markdown output to clean, styled HTML.
  // Uses the existing CSS classes: md-h2, md-h3, md-h4, md-p,
  // inline-code, code-block, etc.
  function parseMarkdown(text) {
    if (!text) return '';

    // Extract and protect <think> blocks first (handles both finished and streaming/unclosed blocks)
    const thinkBlocks = [];
    text = text.replace(/<think>([\s\S]*?)(?:<\/think>|$)/gi, (match, content) => {
      const idx = thinkBlocks.length;
      const isComplete = match.toLowerCase().includes('</think>');
      thinkBlocks.push({ content: content.trim(), isComplete });
      return `\x00THINK${idx}\x00\n`;
    });

    // Escape HTML entities first (for the regular text)
    const esc = (s) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');


    // Extract and protect code blocks first
    const codeBlocks = [];
    let protected_text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || 'code', code: esc(code.trim()) });
      return `\x00CODEBLOCK${idx}\x00`;
    });

    // Process inline code
    const inlineCodes = [];
    protected_text = protected_text.replace(/`([^`\n]+)`/g, (_, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(esc(code));
      return `\x00INLINE${idx}\x00`;
    });

    // Process lines
    const lines = protected_text.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length) {
        result.push(`<ul class="md-list">${listItems.map(li => `<li class="md-li">${li}</li>`).join('')}</ul>`);
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Headers
      if (/^######\s+/.test(line)) { flushList(); result.push(`<div class="md-h4">${line.replace(/^######\s+/, '')}</div>`); continue; }
      if (/^#####\s+/.test(line)) { flushList(); result.push(`<div class="md-h4">${line.replace(/^#####\s+/, '')}</div>`); continue; }
      if (/^####\s+/.test(line)) { flushList(); result.push(`<div class="md-h4">${line.replace(/^####\s+/, '')}</div>`); continue; }
      if (/^###\s+/.test(line)) { flushList(); result.push(`<div class="md-h3">${line.replace(/^###\s+/, '')}</div>`); continue; }
      if (/^##\s+/.test(line)) { flushList(); result.push(`<div class="md-h2">${line.replace(/^##\s+/, '')}</div>`); continue; }
      if (/^#\s+/.test(line)) { flushList(); result.push(`<div class="md-h2">${line.replace(/^#\s+/, '')}</div>`); continue; }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) { flushList(); result.push('<hr class="md-hr">'); continue; }

      // List items
      if (/^[\*\-]\s+/.test(line)) {
        inList = true;
        listItems.push(applyInline(line.replace(/^[\*\-]\s+/, '')));
        continue;
      }

      // Numbered list
      if (/^\d+\.\s+/.test(line)) {
        inList = true;
        listItems.push(applyInline(line.replace(/^\d+\.\s+/, '')));
        continue;
      }

      // Blockquotes
      if (/^>\s+/.test(line)) {
        flushList();
        result.push(`<blockquote class="md-quote">${applyInline(line.replace(/^>\s+/, ''))}</blockquote>`);
        continue;
      }

      flushList();

      // Empty line
      if (!line.trim()) { result.push('<div class="md-spacer"></div>'); continue; }

      // Normal paragraph line
      result.push(`<div class="md-p">${applyInline(line)}</div>`);
    }

    flushList();

    let html = result.join('');

    // Restore code blocks
    codeBlocks.forEach(({ lang, code }, idx) => {
      html = html.replace(`\x00CODEBLOCK${idx}\x00`,
        `<div class="code-block"><span class="code-lang">${lang.toUpperCase()}</span><pre><code>${code}</code></pre></div>`);
    });

    // Restore inline codes
    inlineCodes.forEach((code, idx) => {
      html = html.replace(`\x00INLINE${idx}\x00`, `<code class="inline-code">${code}</code>`);
    });

    // Restore think blocks
    thinkBlocks.forEach(({ content, isComplete }, idx) => {
      // Basic formatting for think content
      let formatted = applyInline(esc(content)).replace(/\n/g, '<br>');
      const statusIcon = isComplete ? '✓' : '<span class="pulse-ring inline"></span>';

      const blockHtml = `<div class="md-think-block">
                           <div class="md-think-header">
                             <span>⚡ NEURAL PATHWAY</span>
                             <span class="think-status">${statusIcon}</span>
                           </div>
                           <div class="md-think-content">${formatted}</div>
                         </div>`;

      // Replace it whether it got wrapped in a <p> or not by the markdown line processor
      html = html.replace(`<div class="md-p">\x00THINK${idx}\x00</div>`, blockHtml);
      html = html.replace(`\x00THINK${idx}\x00\n`, blockHtml);
      html = html.replace(`\x00THINK${idx}\x00`, blockHtml);
    });

    return html;
  }

  function applyInline(text) {
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>');
  }

  // --- THOUGHT UI HELPERS ---
  let thoughtTimer = null;

  function addThought(text, category = 'system') {
    const msg = typeof text === 'string' ? text.trim() : '';
    if (!msg) return;
    const detail = { text: msg, category, timestamp: Date.now() };
    window.dispatchEvent(new CustomEvent('sentinal-thought', { detail }));
    const live = document.getElementById('sentinalLive');
    if (live) live.textContent = msg;
  }

  function startThinking() {
    setStatus("thinking");
    const bubble = document.getElementById('thoughtBubble');
    if (bubble) {
      const textEl = document.getElementById('thoughtBubbleText');
      const metaEl = document.getElementById('thoughtBubbleMeta');
      const progressEl = bubble.querySelector('.thought-bubble-progress');

      if (textEl) textEl.textContent = '"Analyzing..."';
      if (metaEl) metaEl.textContent = `system · ${new Date().toLocaleTimeString()}`;
      if (progressEl) {
        progressEl.style.animation = 'none';
        progressEl.offsetHeight;
        progressEl.style.animation = 'progressDrain 30s linear forwards';
      }

      bubble.classList.add('visible');
      clearTimeout(thoughtTimer);
      thoughtTimer = setTimeout(() => bubble.classList.remove('visible'), 30000);
    }
    const brainIcon = document.getElementById('consciousnessIndicator')?.querySelector('.brain-pulse');
    if (brainIcon) brainIcon.classList.add('thinking');
  }

  function stopThinking() {
    const bubble = document.getElementById('thoughtBubble');
    if (bubble) bubble.classList.remove('visible');
    const brainIcon = document.getElementById('consciousnessIndicator')?.querySelector('.brain-pulse');
    if (brainIcon) brainIcon.classList.remove('thinking');
    if (thoughtTimer) {
      clearTimeout(thoughtTimer);
      thoughtTimer = null;
    }
  }

  // ─── SOCKET EVENTS ──────────────────────────────────────────────


  socket.on("system:status", (data) => {
    // Pipe status updates to Thought UI instead of Chat
    console.log("[STATUS]", data.status);
    addThought(data.status);
  });

  socket.on("connect", () => {
    setStatus("idle");
    console.log("[Socket] Connected");
    addMessage("SYSTEM ONLINE. S.E.N.T.I.N.A.L. MARK IV READY. AWAITING YOUR COMMAND, SIR.", "assistant");
  });

  socket.on("disconnect", () => {
    console.log("[WebSocket] Disconnected from server");
    setStatus("idle");
    addMessage("⚠️ Connection lost. Attempting to reconnect...", "system");
  });

  socket.on("reconnect", () => {
    console.log("[WebSocket] Reconnected to server");
    addMessage("✓ Connection restored. All systems nominal.", "system");
  });



  socket.on("metrics:update", (metrics) => {
    updateSystemMetrics(metrics);
  });

  socket.on("intent:detected", (intentData) => {
    console.log(`[Intent] ${intentData.intent} (${(intentData.confidence * 100).toFixed(1)}%)`);
  });



  let streamingRawText = ''; // Track raw text during streaming
  function normalizeAssistantText(text) {
    return typeof text === "string" ? text.trim() : "";
  }

  function rememberAssistantMessage(text) {
    const normalized = normalizeAssistantText(text);
    if (!normalized) return;
    lastAssistantMessageText = normalized;
    lastAssistantMessageAt = Date.now();
  }

  function isDuplicateAssistantMessage(text, windowMs = 2500) {
    const normalized = normalizeAssistantText(text);
    if (!normalized || !lastAssistantMessageText) return false;
    return normalized === lastAssistantMessageText && (Date.now() - lastAssistantMessageAt) < windowMs;
  }

  function finalizeStreamingMessage(text) {
    const normalized = normalizeAssistantText(text);
    if (!currentStreamingMessage || !normalized) return false;

    const contentDiv = currentStreamingMessage.querySelector(".streaming-text, .message-content");
    if (contentDiv) {
      contentDiv.className = "message-content formatted";
      contentDiv.innerHTML = parseMarkdown(normalized);
    }

    currentStreamingMessage.classList.remove("streaming");
    currentStreamingMessage.classList.add("sentinal");
    rememberAssistantMessage(normalized);
    return true;
  }

  function renderAssistantMessage(text) {
    const normalized = normalizeAssistantText(text);
    if (!normalized) return;

    if (currentStreamingMessage && finalizeStreamingMessage(normalized)) {
      currentStreamingMessage = null;
      streamingRawText = "";
      streamingIsThinking = false;
      return;
    }

    if (isDuplicateAssistantMessage(normalized)) return;

    addMessage(normalized, "sentinal");
    rememberAssistantMessage(normalized);
  }

  socket.on("chat:stream:start", () => {
    isStreaming = true;
    streamingRawText = '';
    typingEl.classList.add("hidden");
    setStatus("speaking");

    // Create a simple streaming container (will be re-formatted on end)
    currentStreamingMessage = document.createElement("div");
    currentStreamingMessage.className = "message sentinal streaming";
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content streaming-text";
    currentStreamingMessage.appendChild(contentDiv);
    messagesEl.appendChild(currentStreamingMessage);
  });

  let streamingIsThinking = false;

  socket.on("chat:stream:token", (data) => {
    if (currentStreamingMessage) {
      // Reconstruct <think> blocks on the fly based on backend isThought flag
      if (data.isThought && !streamingIsThinking) {
        streamingRawText += "\n<think>\n";
        streamingIsThinking = true;
      } else if (!data.isThought && streamingIsThinking) {
        streamingRawText += "\n</think>\n\n";
        streamingIsThinking = false;
      }

      streamingRawText += data.token;

      // Parse markdown in real-time during streaming
      const contentDiv = currentStreamingMessage.querySelector('.streaming-text');
      if (contentDiv) {
        contentDiv.innerHTML = parseMarkdown(streamingRawText);
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  socket.on("chat:stream:end", () => {
    isStreaming = false;

    // Apply markdown formatting to completed message
    if (currentStreamingMessage && streamingRawText) {
      const contentDiv = currentStreamingMessage.querySelector('.streaming-text');
      if (contentDiv) {
        contentDiv.className = 'message-content formatted';
        contentDiv.innerHTML = parseMarkdown(streamingRawText);
      }
      currentStreamingMessage.classList.remove('streaming');
      rememberAssistantMessage(streamingRawText);
    }

    currentStreamingMessage = null;
    streamingRawText = '';
    streamingIsThinking = false;
    setStatus("idle");

    // Trigger thunder when response completes
    // if (window.triggerThunder) {
    //   setTimeout(() => window.triggerThunder(), 200);
    // }
  });



  socket.on("chat:response", (data) => {
    // Handle standard plugin response
    setStatus("idle");
    typingEl.classList.add("hidden");
    stopThinking(); // Safety: Ensure thought UI is closed
    renderAssistantMessage(data.message);

    // Handle specific actions
    if (data.data) {
      if (data.data.action === "camera_capture") {
        openCamera();
      } else if (data.data.action === "camera_close") {
        closeCamera();
      }
    }
  });

  socket.on("chat:error", (data) => {
    typingEl.classList.add("hidden");
    setStatus("idle");
    addMessage(`⚠️ Error: ${data.error}`, "system");
  });

  socket.on("tts:speak", (data) => {
    // Only speak if voice output is enabled or in voice mode
    if (voiceOutputEnabled || currentMode === "voice") {
      speak(data.text);
    }
  });

  // --- LIVE UI RELOADING ---
  socket.on("sentinal:reload-css", () => {
    console.log("[SENTINAL] Aesthetic override detected. Reloading stylesheets...");
    const links = document.getElementsByTagName("link");
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (link.rel === "stylesheet" && link.href) {
        // Append a cache-busting timestamp
        const newHref = link.href.split('?')[0] + '?v=' + new Date().getTime();
        link.href = newHref;
      }
    }

    // Visual confirmation of aesthetic shift
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = 'rgba(0, 239, 255, 0.2)';
    flash.style.zIndex = '999999';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.5s ease-out';
    document.body.appendChild(flash);

    // Trigger sound
    sfx.playTone(600, 'sine', 0.5, 0.1);

    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 500);
    }, 50);
  });

  // --- SYSTEM METRICS UPDATE ---
  function updateSystemMetrics(metrics) {
    // Update CPU/RAM indicators in the HUD
    if (tempBar && metrics.cpu) {
      tempBar.style.width = `${metrics.cpu.usage}%`;
    }
    if (powerBar && metrics.memory) {
      powerBar.style.width = `${metrics.memory.usagePercent}%`;
    }
  }

  // --- ARC REACTOR (3D HIGH FIDELITY) — FULLY FIXED ---
  function initArcReactor() {
    // FIX: Use correct container ID matching the HTML
    const container = document.getElementById("tesseract-container");
    if (!container) {
      console.warn('[SENTINAL] Arc Reactor container not found — skipping 3D init');
      return;
    }

    // Premium parallax tilt for the orb wrapper (pure CSS transform).
    // The 3D reactor itself is rendered by `core-particles.js` (SentinalCore3D).
    if (reactorParallax && !reactorParallax.dataset.parallaxInit) {
      reactorParallax.dataset.parallaxInit = '1';

      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (!reduceMotion) {
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let rafId = 0;

        const clamp = (v, max) => Math.max(-max, Math.min(max, v));
        const tick = () => {
          currentX += (targetX - currentX) * 0.09;
          currentY += (targetY - currentY) * 0.09;
          reactorParallax.style.setProperty('--tilt-x', `${currentY.toFixed(3)}deg`);
          reactorParallax.style.setProperty('--tilt-y', `${currentX.toFixed(3)}deg`);
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        reactorParallax.addEventListener('pointerenter', () => reactorParallax.classList.add('tilting'));
        reactorParallax.addEventListener('pointerleave', () => {
          reactorParallax.classList.remove('tilting');
          targetX = 0;
          targetY = 0;
        });

        reactorParallax.addEventListener('pointermove', (e) => {
          const r = reactorParallax.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;  // -1..1
          const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;  // -1..1

          // Keep it subtle. Too much tilt reads "toy" instead of "premium".
          targetX = clamp(nx * 7.5, 8);
          targetY = clamp(-ny * 7.5, 8);

          // Feed CSS hotspots for a moving glint.
          const hx = Math.max(0, Math.min(100, (nx * 0.5 + 0.5) * 100));
          const hy = Math.max(0, Math.min(100, (ny * 0.5 + 0.5) * 100));
          reactorParallax.style.setProperty('--hot-x', `${hx.toFixed(2)}%`);
          reactorParallax.style.setProperty('--hot-y', `${hy.toFixed(2)}%`);
        });

        window.addEventListener('beforeunload', () => cancelAnimationFrame(rafId));
      }
    }

    // If the premium core is already initialized, don't spin up a second renderer.
    // A hidden RAF loop would keep running and waste GPU/CPU.
    if (window.sentinalCore3D) return;

    // Cleanup existing
    while (container.firstChild) container.removeChild(container.firstChild);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    const rect = container.getBoundingClientRect();
    const w = Math.max(rect.width, 180);
    const h = Math.max(rect.height, 180);
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    camera.position.z = 5;

    const reactorGroup = new THREE.Group();
    scene.add(reactorGroup);

    // ── MATERIALS ──────────────────────────────────────────────────
    const matCyan = new THREE.MeshBasicMaterial({
      color: 0x00efff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const matGlow = new THREE.MeshBasicMaterial({
      color: 0x00bfff, transparent: true, opacity: 0.55,
      wireframe: true, blending: THREE.AdditiveBlending
    });
    const matCore = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const matRing = new THREE.MeshBasicMaterial({
      color: 0x00efff, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const matSegment = new THREE.MeshBasicMaterial({
      color: 0x00efff, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    // ── GEOMETRY — All declared BEFORE animate() ────────────────────

    // 1. Neural Core
    const neuralCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending })
    );
    reactorGroup.add(neuralCore);

    // 2. Plasma Core (FIX: declared here so animate can use it)
    const plasma = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      matCore
    );
    reactorGroup.add(plasma);

    // 3. Inner Ring (FIX: declared here so animate can use it)
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.04, 8, 64),
      matRing
    );
    reactorGroup.add(innerRing);

    // 4. Outer Shell
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      matGlow
    );
    reactorGroup.add(shell);

    // 5. Orbital Ring
    const orbitalRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.015, 6, 120),
      matCyan
    );
    orbitalRing.rotation.x = Math.PI / 3;
    reactorGroup.add(orbitalRing);

    // 6. Segment Group (FIX: declared and built here so animate can use it)
    const segmentGroup = new THREE.Group();
    const segGeo = new THREE.BoxGeometry(0.08, 0.25, 0.08);
    for (let i = 0; i < 12; i++) {
      const seg = new THREE.Mesh(segGeo, matSegment);
      const angle = (i / 12) * Math.PI * 2;
      seg.position.set(Math.cos(angle) * 2.0, Math.sin(angle) * 2.0, 0);
      seg.lookAt(0, 0, 0);
      segmentGroup.add(seg);
    }
    reactorGroup.add(segmentGroup);

    // 7. Data Particles
    const particleGroup = new THREE.Group();
    const ptGeo = new THREE.BoxGeometry(0.04, 0.15, 0.04);
    for (let i = 0; i < 30; i++) {
      const pt = new THREE.Mesh(ptGeo, matCyan);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 0.6;
      pt.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      pt.userData.offset = Math.random() * Math.PI * 2;
      particleGroup.add(pt);
    }
    reactorGroup.add(particleGroup);

    // ── LIGHTING ───────────────────────────────────────────────────
    const pointLight = new THREE.PointLight(0x00efff, 3.5, 12);
    pointLight.position.set(0, 0, 0);
    reactorGroup.add(pointLight);
    scene.add(new THREE.AmbientLight(0x0a1a2a));

    // Emotion-responsive color
    let currentEmotionColor = new THREE.Color(0x00efff);
    window.addEventListener('sentinal-emotion-color', (e) => {
      const hex = e.detail?.color || '#00efff';
      currentEmotionColor.set(hex);
    });

    // ── ANIMATION LOOP ─────────────────────────────────────────────
    function animate() {
      requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      // Floating drift
      reactorGroup.rotation.x = Math.sin(time * 0.7) * 0.12 + Math.sin(time * 0.3) * 0.04;
      reactorGroup.rotation.y = Math.cos(time * 0.5) * 0.12 + Math.sin(time * 0.2) * 0.04;

      // Inner ring spin
      innerRing.rotation.z -= 0.035;
      innerRing.rotation.x = Math.sin(time * 1.5) * 0.15;
      innerRing.scale.setScalar(1.0 + Math.sin(time * 2) * 0.04);
      innerRing.material.opacity = 0.55 + Math.sin(time * 5) * 0.2;

      // Plasma pulse
      const pulse = Math.sin(time * 4) + Math.sin(time * 13) * 0.3;
      const breathe = (pulse + 1.2) * 0.5;
      plasma.scale.setScalar(0.85 + breathe * 0.22);
      plasma.material.opacity = 0.7 + breathe * 0.3;

      // Point light pulse + emotion color
      pointLight.intensity = 2.5 + breathe * 2.5;
      const shift = Math.max(0, breathe - 0.4) * 1.5;
      pointLight.color.lerp(currentEmotionColor, 0.05);

      // Shell fade
      shell.material.opacity = 0.25 + Math.sin(time * 1.2) * 0.15;

      // Orbital ring rotate
      orbitalRing.rotation.z += 0.008;

      // Segments oscillate
      segmentGroup.rotation.z = Math.sin(time * 0.5) * 0.4;
      segmentGroup.children.forEach((child, i) => {
        const baseDist = 2.0;
        const dist = baseDist + Math.sin(time * 8 + i * 0.5) * 0.06;
        const len = child.position.length();
        if (len > 0) child.position.multiplyScalar(dist / len);
      });

      // Particles drift
      particleGroup.children.forEach((pt) => {
        pt.material.opacity = 0.3 + Math.sin(time * 3 + pt.userData.offset) * 0.3;
      });
      particleGroup.rotation.y += 0.003;

      renderer.render(scene, camera);
    }
    animate();

    // Responsive resize
    const resizeObserver = new ResizeObserver(() => {
      const newRect = container.getBoundingClientRect();
      const nw = Math.max(newRect.width, 180);
      const nh = Math.max(newRect.height, 180);
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);
  }

  // --- STATUS MANAGEMENT ---
  let thunderInterval = null;

  function setStatus(mode) {
    const modes = {
      idle: { text: "IDLE", class: "", dotColor: "#00f2ff" },
      thinking: { text: "PROCESSING", class: "thinking", dotColor: "#ffcc00" },
      speaking: { text: "RESPONDING", class: "speaking", dotColor: "#ff9900" },
      listening: { text: "LISTENING", class: "listening", dotColor: "#00ff88" },
      connected: { text: "CONNECTED", class: "", dotColor: "#00ff88" },
    };

    const config = modes[mode] || modes.idle;
    statusText.textContent = config.text;
    document.body.classList.remove('thinking', 'speaking', 'listening');
    if (config.class) document.body.classList.add(config.class);
    statusDot.style.background = config.dotColor;
    statusDot.style.boxShadow = `0 0 12px ${config.dotColor}, 0 0 25px ${config.dotColor}44`;

    // ── Sync 3D Quantum Core visual state ──────────────────────
    const coreStateMap = {
      idle: 'idle',
      connected: 'idle',
      thinking: 'processing',
      speaking: 'speaking',
      listening: 'listening',
    };
    const coreState = coreStateMap[mode] || 'idle';

    // API via window event (works regardless of script load order)
    window.dispatchEvent(new CustomEvent('sentinal-state', { detail: { state: coreState } }));

    // Also call directly if already initialized
    if (window.sentinalCore3D?.setState) {
      window.sentinalCore3D.setState(coreState);
    }
  }

  // --- CLOCK & DATE ---
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    hudClock.textContent = `${hours}:${minutes}:${seconds}`;

    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const dateStr = `${months[now.getMonth()]}. ${String(now.getDate()).padStart(2, "0")}, ${now.getFullYear()}`;
    hudDate.textContent = dateStr;
  }

  // --- TELEMETRY SIMULATION (Enhanced) ---
  function simulateTelemetry() {
    // Faster, smoother updates
    setInterval(() => {
      const tempBase = 42;
      const tempJitter = (Math.random() - 0.5) * 5;
      const temp = tempBase + tempJitter;

      const powerBase = 8.8;
      const powerJitter = (Math.random() - 0.5) * 0.4;
      const power = powerBase + powerJitter;

      if (tempBar) {
        tempBar.style.width = `${Math.min(100, Math.max(0, temp))}%`;
        const tempValEl = tempBar.parentElement.nextElementSibling;
        if (tempValEl) tempValEl.textContent = `${temp.toFixed(1)}°C`;

        // Color warning
        if (temp > 50) tempBar.style.background = "#ff3b3b";
        else tempBar.style.background = "#00efff";
      }

      if (powerBar) {
        powerBar.style.width = `${Math.min(100, Math.max(0, power * 10))}%`;
        const powerValEl = powerBar.parentElement.nextElementSibling;
        if (powerValEl) powerValEl.textContent = `${power.toFixed(2)} GW`;
      }
    }, 800); // 800ms updates
  }

  // --- TEXT DECRYPTION EFFECT ---
  function decryptText(element, originalText, speed = 50) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
    let iterations = 0;

    const interval = setInterval(() => {
      element.textContent = originalText
        .split("")
        .map((letter, index) => {
          if (index < iterations) {
            return originalText[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");

      if (iterations >= originalText.length) {
        clearInterval(interval);
      }

      iterations += 1 / 3;
    }, speed);
  }

  // Apply decryption to headers on load
  setTimeout(() => {
    document.querySelectorAll('.telemetry-item .label, .sentinal-title, .mode-label').forEach(el => {
      decryptText(el, el.textContent.trim());
    });
  }, 1000);

  // --- LIVE LOCATION ---
  async function initGeolocation() {
    const locationEl = document.getElementById("weatherLocation");
    if (!locationEl) return;

    locationEl.textContent = "LOCATING...";

    const useServerLocation = Boolean(window.electronAPI);
    if (useServerLocation) {
      try {
        // 1. Prioritize Server-side configuration/override
        const response = await fetch('/api/config/location');
        const config = await response.json();

        if (config.ok && config.location) {
          const { city, countryCode } = config.location;
          locationEl.textContent = `${city.toUpperCase()}, ${countryCode.toUpperCase()}`;
          console.log(`[SENTINAL] Location (Server): ${city}, ${countryCode}`);
          return;
        }
      } catch (e) {
        console.warn("[SENTINAL] Server location API unavailable, falling back to browser sensors.");
      }
    }

    // 2. Fallback to Browser Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "UNKNOWN";
            const country = data.address?.country_code?.toUpperCase() || "";
            locationEl.textContent = `${city.toUpperCase()}${country ? ', ' + country : ''}`;
            console.log(`[SENTINAL] Location (Browser): ${city}, ${country}`);
          } catch (err) {
            locationEl.textContent = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
          }
        },
        (error) => {
          console.warn("[SENTINAL] Geolocation error:", error.message);
          locationEl.textContent = "LOCATION N/A";
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      locationEl.textContent = "GEO UNAVAILABLE";
    }
  }

  // Initialize location on boot
  initGeolocation();

  // --- IMAGE ATTACHMENT HANDLERS ---

  // Create image preview container if not exists
  function createImagePreviewContainer() {
    let container = document.getElementById('imagePreviewContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'imagePreviewContainer';
      container.className = 'image-preview-container';
      // Insert before the input area
      const inputArea = document.querySelector('.input-area');
      if (inputArea && inputArea.parentNode) {
        inputArea.parentNode.insertBefore(container, inputArea);
      }
    }
    return container;
  }

  // Add image preview to UI
  function addImagePreview(imageData, index) {
    const container = createImagePreviewContainer();
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    preview.dataset.index = index;
    preview.innerHTML = `
      <img src="data:image/jpeg;base64,${imageData}" alt="Attached image" />
      <button class="remove-image" title="Remove">&times;</button>
    `;

    preview.querySelector('.remove-image').addEventListener('click', () => {
      pendingImages.splice(index, 1);
      refreshImagePreviews();
    });

    container.appendChild(preview);
    container.classList.remove('hidden');
  }





  // Refresh all image previews
  function refreshImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    if (container) {
      container.innerHTML = '';
      if (pendingImages.length === 0) {
        container.classList.add('hidden');
      } else {
        pendingImages.forEach((img, i) => addImagePreview(img, i));
      }
    }
  }

  // Clear all image previews
  function clearImagePreviews() {
    pendingImages = [];
    const container = document.getElementById('imagePreviewContainer');
    if (container) {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  // Attach button click handler
  if (attachBtn && fileInputEl) {
    attachBtn.addEventListener('click', () => {
      fileInputEl.click();
    });

    // File input change handler
    fileInputEl.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);

      files.forEach(file => {
        if (!file.type.startsWith('image/')) {
          console.warn('[SENTINAL] Skipping non-image file:', file.name);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          // Extract base64 data (remove the "data:image/...;base64," prefix)
          const base64Data = event.target.result.split(',')[1];
          pendingImages.push(base64Data);
          addImagePreview(base64Data, pendingImages.length - 1);
          console.log(`[SENTINAL] Image attached: ${file.name}`);
        };
        reader.readAsDataURL(file);
      });

      // Reset file input for future selections
      fileInputEl.value = '';
    });
  }

  // Handle paste events for clipboard images (Ctrl+V)
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result.split(',')[1];
          pendingImages.push(base64Data);
          addImagePreview(base64Data, pendingImages.length - 1);
          console.log('[SENTINAL] Image pasted from clipboard');
        };
        reader.readAsDataURL(file);
      }
    }
  });

  // Handle drag and drop for images
  if (fileArea) {
    fileArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileArea.classList.add('drag-over');
    });

    fileArea.addEventListener('dragleave', () => {
      fileArea.classList.remove('drag-over');
    });

    fileArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileArea.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result.split(',')[1];
          pendingImages.push(base64Data);
          addImagePreview(base64Data, pendingImages.length - 1);
          console.log(`[SENTINAL] Image dropped: ${file.name}`);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // --- SEND MESSAGE ---
  function sendMessage(text) {
    const hasText = text && text.trim();
    const hasImages = pendingImages.length > 0;

    if (!hasText && !hasImages) return;

    const msg = hasText ? text.trim() : 'Analyze this image.';
    inputEl.value = "";

    // Display user message (with image indicator if applicable)
    if (hasImages) {
      addMessage(`📷 [Image attached] ${msg}`, "user");
    } else {
      addMessage(msg, "user");
    }

    // Show typing indicator
    typingEl.classList.remove("hidden");
    setStatus("thinking");

    // If images are pending, send via chat:image
    if (hasImages) {
      // Send first image (or loop for multiple)
      socket.emit("chat:image", {
        imageData: pendingImages[0],
        prompt: msg
      });
      clearImagePreviews();
    } else {
      // Send via WebSocket for text-only
      socket.emit("chat:message", {
        message: msg,
        history: []
      });
    }
  }



  // Copy code function
  window.copyCode = function (btn) {
    const codeBlock = btn.previousElementSibling;
    const code = codeBlock.textContent;
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  };

  // --- MESSAGE CREATION ---
  function createMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `message ${sender}`;

    if (sender === 'sentinal' || sender === 'system') {
      // Parse markdown for SENTINAL responses
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content formatted';
      contentDiv.innerHTML = parseMarkdown(text);
      div.appendChild(contentDiv);
    } else {
      // Plain text for user messages
      div.textContent = text;
    }

    return div;
  }

  function addMessage(text, sender) {
    const div = createMessage(text, sender);
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (sender === "sentinal") {
      rememberAssistantMessage(text);
    }
  }

  function speak(text) {
    if (!synth) return;

    // Safety check: ensure voices are loaded
    if (synth.getVoices().length === 0) {
      console.warn("[TTS] Voices not loaded yet. Waiting...");
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null; // Prevent re-triggering
        speak(text);
      };
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    console.log(`[TTS] Speaking: "${text.substring(0, 50)}..."`);

    // Extremely Deep, Threatening Bass Tuning
    const voices = synth.getVoices();
    const voice = voices.find(v =>
      v.name.includes("Mark") ||
      v.name.includes("Google UK English Male") ||
      v.name.includes("David") ||
      v.name.includes("Male") ||
      v.name.includes("Daniel")
    ) || voices.find(v => v.lang.startsWith("en-GB")) || voices[0];

    if (voice) utter.voice = voice;

    // Lowest possible pitch for maximum bass and danger
    utter.pitch = 0.05;
    utter.rate = 0.7; // Deliberate, calculating, slow paced

    // Clean text for TTS (remove markdown, code blocks, URLs, and thought tags)
    let cleanText = text
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '') // Remove thought tags content
      .replace(/```[\s\S]*?```/g, ' [Code Block] ')   // Replace code blocks with short pause descriptive text
      .replace(/`([^`]+)`/g, '$1')                    // Inline code to normal text
      .replace(/\[.*?\]\(.*?\)/g, '')                 // Remove markdown links
      .replace(/(https?:\/\/[^\s]+)/g, 'Link')        // Replace raw URLs with "Link"
      .replace(/[*_#]/g, '')                          // Remove formatting chars
      .replace(/\n/g, '. ');                          // Newlines to pauses

    utter.text = cleanText;

    // Track what is being said for Echo Cancellation
    window.lastSpokenText = cleanText;
    window.lastSpeakTime = Date.now(); // Track WHEN it was said

    // Increment active speech counter
    window.activeSpeechCount = (window.activeSpeechCount || 0) + 1;

    utter.onstart = () => {
      console.log("[TTS] Speech start");
      setStatus("speaking");
      // Stop mic to prevent echo (Hard Echo Cancellation)
      if (micActive && recognition) {
        try { recognition.stop(); } catch (e) { console.log('Mic stop error:', e); }
      }
    };

    utter.onend = () => {
      console.log("[TTS] Speech end");
      window.activeSpeechCount--;

      // Only reset to idle and restart mic if NO more speech is queued
      if (window.activeSpeechCount <= 0) {
        window.activeSpeechCount = 0;

        setStatus("idle");

        // Wait a moment for the audio buffer to clear
        setTimeout(() => {
          // Force restart mic if voice mode or mic was manually active
          if (micActive || currentMode === "voice") {
            console.log("[Voice] Resuming listener...");
            try {
              // Sometimes synth.speaking stays true slightly longer than the audio plays
              recognition.start();
            } catch (e) {
              console.log('Mic restart error:', e);
            }
          }
        }, 600);
      }
    };

    utter.onerror = (e) => {
      console.error("[TTS] Speech error:", e.error);
      window.activeSpeechCount--;
      if (window.activeSpeechCount <= 0) {
        setStatus("idle");
        window.activeSpeechCount = 0;
      }
    };

    synth.speak(utter);
  }

  // --- SPEECH RECOGNITION ---
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("[Voice] SpeechRecognition API not supported in this environment");
      return null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true; // Key for real-time interaction
    rec.interimResults = true; // Required for faster barge-in detection

    let silenceTimer = null;
    let lastProcessedTranscript = "";

    rec.onresult = (e) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }

      // Handle Silence Detection (Barge-in / Forced Commit)
      clearTimeout(silenceTimer);
      if (interimTranscript.trim().length > 0) {
        // AI-Driven Adaptive Threshold: Faster during chat, more patient for long thoughts
        const adaptiveThreshold = interimTranscript.length > 50 ? 2500 : 1200;

        silenceTimer = setTimeout(() => {
          const transcriptToProcess = interimTranscript.trim();
          if (transcriptToProcess !== lastProcessedTranscript) {
            console.log(`[Voice] Silence detected (${adaptiveThreshold}ms). Committing: "${transcriptToProcess}"`);
            lastProcessedTranscript = transcriptToProcess;
            sendMessage(transcriptToProcess);
            // Optional: Restart recognition to clear buffer
            try { rec.stop(); } catch (err) { }
          }
        }, adaptiveThreshold);
      }

      // Only send FINAL results to the AI logic
      if (finalTranscript && finalTranscript.trim().length > 1) {
        lastProcessedTranscript = ""; // Reset since we got a final
        clearTimeout(silenceTimer);

        // --- ECHO CANCELLATION ---
        const cleanInput = finalTranscript.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const cleanLastSpoken = (window.lastSpokenText || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const isEcho = cleanLastSpoken.includes(cleanInput) || cleanInput.includes(cleanLastSpoken);

        if (isEcho && cleanInput.length > 3) {
          console.log(`[Voice] Echo Detected (Ignored): "${finalTranscript}"`);
          return;
        }

        console.log(`[Voice] Processing Final: "${finalTranscript}"`);
        sendMessage(finalTranscript);
      }
    };

    rec.onstart = () => {
      // BARGE-IN: Stop talking ONLY if we aren't already speaking (to avoid race conditions)
      if (synth.speaking && currentMode === "voice" && !isStreaming) {
        console.log("[Voice] Barge-in detected. Canceling speech output.");
        synth.cancel();
      }
    };

    rec.onerror = (e) => {
      console.warn("[Voice] Error:", e.error);
      if (e.error === 'no-speech') return;

      // Auto-restart on error if in voice mode
      if (currentMode === "voice" && micActive && e.error !== 'aborted') {
        setTimeout(() => {
          try { rec.start(); } catch (err) { }
        }, 100);
      }
    };

    rec.onend = () => {
      // Auto-restart if we want the mic active and SENTINAL is not speaking
      // Wait briefly to check synth status in case of race condition
      setTimeout(() => {
        if (micActive || currentMode === "voice") {
          if (!synth.speaking) {
            console.log("[Voice] Auto-Restarting listener...");
            try { rec.start(); } catch (e) { }
          } else {
            console.log("[Voice] Listener paused during speech. Awaiting utter.onend.");
          }
        } else {
          micActive = false;
          micBtn.classList.remove("active");
          if (statusText.textContent === "LISTENING") setStatus("idle");
        }
      }, 50);
    };

    return rec;
  }

  // --- EVENT LISTENERS ---
  sendBtn.addEventListener("click", () => sendMessage(inputEl.value));
  inputEl.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(inputEl.value); });

  micBtn.addEventListener("click", () => {
    if (micActive || !recognition) return;
    micActive = true;
    micBtn.classList.add("active");
    setStatus("listening");
    recognition.start();
  });

  // Voice Output Toggle
  const voiceToggleBtn = document.getElementById("voiceToggle");
  if (voiceToggleBtn) {
    voiceToggleBtn.addEventListener("click", () => {
      voiceOutputEnabled = !voiceOutputEnabled;
      voiceToggleBtn.classList.toggle("active", voiceOutputEnabled);
      voiceToggleBtn.textContent = voiceOutputEnabled ? "🔊" : "🔇";
      voiceToggleBtn.title = voiceOutputEnabled ? "Voice Output: ON" : "Voice Output: OFF";

      // Stop any current speech if disabling
      if (!voiceOutputEnabled && synth) {
        synth.cancel();
      }

      console.log(`[SENTINAL] Voice output ${voiceOutputEnabled ? 'enabled' : 'disabled'}`);
    });
  }

  // === NOVA AI ENHANCEMENTS ===

  // Voice Visualizer
  const voiceVisualizer = document.getElementById('voiceVisualizer');
  const waveformCanvas = document.getElementById('waveformCanvas');
  let audioContext = null;
  let analyser = null;
  let animationId = null;

  function initVoiceVisualizer() {
    if (!waveformCanvas) return;
    const ctx = waveformCanvas.getContext('2d');

    // Resize with high DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = waveformCanvas.parentElement.getBoundingClientRect();
    if (rect.width > 0) {
      waveformCanvas.width = rect.width * dpr;
      waveformCanvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    let phase = 0;

    // Configuration for the 4 overlapping waves
    const waves = [
      { amplitude: 1.0, frequency: 0.02, speed: 0.08, opacity: 1.0, lineWidth: 2.5 },
      { amplitude: 0.6, frequency: 0.03, speed: 0.12, opacity: 0.5, lineWidth: 1.5 },
      { amplitude: 0.3, frequency: 0.045, speed: 0.16, opacity: 0.3, lineWidth: 1.0 },
      { amplitude: 0.8, frequency: 0.015, speed: 0.05, opacity: 0.2, lineWidth: 3.0 }
    ];

    function drawWaveform() {
      // Re-measure exact CSS dimensions
      const width = waveformCanvas.offsetWidth;
      const height = waveformCanvas.offsetHeight;
      const centerY = height / 2;

      // Dynamic clearing for motion blur
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Lower alpha for trail
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      let audioImpact = 0;

      // If we have real audio data attached to the analyser
      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];

        // Normalize 0.0 to 1.0
        const avg = sum / dataArray.length;
        audioImpact = avg / 255.0;
      }

      // Idle state keeps a small continuous ripple; audio boosts amplitude
      const targetAmplitude = 15 + (audioImpact * height * 0.4);

      phase += 0.08 + (audioImpact * 0.1);

      // Draw each overlapping wave layer
      waves.forEach(wave => {
        ctx.beginPath();
        ctx.lineWidth = wave.lineWidth;
        ctx.strokeStyle = `rgba(0, 242, 255, ${wave.opacity})`; // Cyan tint

        // Optional glow
        ctx.shadowBlur = wave.opacity > 0.6 ? 15 : 5;
        ctx.shadowColor = '#00f2ff';

        // Draw sine path
        for (let x = 0; x < width; x += 2) {
          // Attenuate the edges (Hanning window) so it fades out at L/R boundaries
          const progress = x / width;
          const window = Math.sin(progress * Math.PI);

          const y = centerY + Math.sin(x * wave.frequency + phase * wave.speed) * targetAmplitude * wave.amplitude * window;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      animationId = requestAnimationFrame(drawWaveform);
    }

    if (animationId) cancelAnimationFrame(animationId);
    drawWaveform();
  }

  // Command Palette
  const commandPalette = document.getElementById('commandPalette');
  const paletteInput = document.getElementById('paletteInput');
  const paletteResults = document.getElementById('paletteResults');
  const paletteClose = document.getElementById('paletteClose');

  const quickCommands = [
    { name: 'Where am I?', command: 'where am i', icon: '📍' },
    { name: 'Take Screenshot', command: 'take screenshot', icon: '📸' },
    { name: 'Show Clipboard', command: 'show clipboard', icon: '📋' },
    { name: 'List Processes', command: 'show running processes', icon: '⚙️' },
    { name: 'System Status', command: 'system status', icon: '💻' },
    { name: 'Recent Files', command: 'show recent files', icon: '📁' },
    { name: 'Weather', command: 'whats the weather', icon: '🌤️' }
  ];

  function openCommandPalette() {
    commandPalette.classList.remove('hidden');
    paletteInput.value = '';
    paletteInput.focus();
    updatePaletteResults('');
  }

  function closeCommandPalette() {
    commandPalette.classList.add('hidden');
  }

  function updatePaletteResults(query) {
    const filtered = query ? quickCommands.filter(cmd =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.command.toLowerCase().includes(query.toLowerCase())
    ) : quickCommands;

    paletteResults.innerHTML = filtered.map(cmd =>
      `<div class="palette-result-item" data-command="${cmd.command}">
        <span style="font-size: 1.2rem; margin-right: 10px;">${cmd.icon}</span>
        <span>${cmd.name}</span>
      </div>`
    ).join('');

    paletteResults.querySelectorAll('.palette-result-item').forEach(item => {
      item.addEventListener('click', () => {
        sendMessage(item.dataset.command);
        closeCommandPalette();
      });
    });
  }

  paletteInput?.addEventListener('input', (e) => updatePaletteResults(e.target.value));
  paletteInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && paletteInput.value.trim() !== "") {
      const text = paletteInput.value;
      sendMessage(text);
      paletteInput.value = "";
      startThinking(); // Start thought timer
      closeCommandPalette();
    }
  });
  paletteClose?.addEventListener('click', closeCommandPalette);
  commandPalette?.querySelector('.palette-backdrop')?.addEventListener('click', closeCommandPalette);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    if (e.key === 'Escape' && !commandPalette.classList.contains('hidden')) {
      closeCommandPalette();
    }
  });

  // Notification Toast System
  function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${type.toUpperCase()}</span>
        <button class="toast-close">✕</button>
      </div>
      <div class="toast-message">${message}</div>
    `;

    toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => toast.remove());

    setTimeout(() => toast.remove(), duration);
  }

  // Quick Actions
  document.getElementById('quickLocation')?.addEventListener('click', () => sendMessage('where am i'));
  document.getElementById('quickScreenshot')?.addEventListener('click', () => sendMessage('take screenshot'));
  document.getElementById('quickClipboard')?.addEventListener('click', () => sendMessage('show clipboard'));
  document.getElementById('quickProcesses')?.addEventListener('click', () => sendMessage('show running processes'));

  // Enhanced voice recognition with visualizer
  if (recognition && voiceVisualizer) {
    recognition.addEventListener('start', () => {
      voiceVisualizer.classList.remove('hidden');
      initVoiceVisualizer();
    });

    recognition.addEventListener('end', () => {
      voiceVisualizer.classList.add('hidden');
      if (animationId) cancelAnimationFrame(animationId);

      // Auto-restart in voice mode
      if (currentMode === "voice" && isVoiceAutoListening && !isStreaming) {
        setTimeout(() => startVoiceListening(), 500);
      }
    });
  }

  // Initialize
  initVoiceVisualizer();

  // === MODE SWITCHING ===
  function setMode(mode) {
    currentMode = mode;
    document.body.setAttribute("data-mode", mode);

    voiceModeBtn.classList.toggle("active", mode === "voice");
    chatModeBtn.classList.toggle("active", mode === "chat");
    modeStatus.textContent = mode === "voice" ? "VOICE MODE" : "CHAT MODE";

    if (mode === "voice") {
      startVoiceMode();
    } else {
      stopVoiceMode();
    }
  }

  function startVoiceMode() {
    isVoiceAutoListening = true;
    updateVoiceStatus("LISTENING");
    startVoiceListening();
  }

  function stopVoiceMode() {
    isVoiceAutoListening = false;
    if (recognition && micActive) {
      recognition.stop();
      micActive = false;
    }
    synth.cancel();
  }

  function startVoiceListening() {
    if (!recognition || micActive || isStreaming) return;
    micActive = true;
    micBtn.classList.add("active");
    setStatus("listening");
    updateVoiceStatus("LISTENING");
    recognition.start();
  }

  function updateVoiceStatus(status) {
    const voiceLabel = document.querySelector(".voice-label");
    const pulseRing = document.querySelector(".pulse-ring");

    if (voiceLabel) voiceLabel.textContent = status;

    if (pulseRing) {
      if (status === "PROCESSING") {
        pulseRing.style.background = "#ffcc00";
      } else if (status === "SPEAKING") {
        pulseRing.style.background = "#ff3b3b";
      } else {
        pulseRing.style.background = "#00ff88";
      }
    }
  }

  voiceModeBtn.addEventListener("click", () => {
    setMode("voice");
    setTimeout(() => {
      vpResizeWaveform();
      vpStartSession();
      vpSetState('listening');
      vpUpdateTranscript('', false, 0);
      vpUpdateResponse('', false);
      setTimeout(vpResizeWaveform, 100);
      initVoiceVisualizer();
    }, 50);
  });
  chatModeBtn.addEventListener("click", () => {
    setMode("chat");
    vpStopSession();
  });

  // ═══════════════════════════════════════════════════════
  // VOICE PANEL CONTROLLER — wires the new voice-panel UI
  // ═══════════════════════════════════════════════════════
  const vpTranscript = document.getElementById('voiceTranscriptText');
  const vpResponse = document.getElementById('voiceResponseText');
  const vlsTextEl = document.getElementById('vlsText');
  const vlsModeEl = document.getElementById('vlsMode');
  const vmLatencyEl = document.getElementById('vmLatency');
  const vmConfidenceEl = document.getElementById('vmConfidence');
  const vmTokensEl = document.getElementById('vmTokens');
  const vmSessionEl = document.getElementById('vmSession');
  const tcConfEl = document.getElementById('transcriptConfidence');
  const wCanvas = document.getElementById('waveformCanvas');

  let vpSessionStart = null;
  let vpSessionInterval = null;
  let vpTokenCount = 0;
  let vpResponseBuffer = '';
  let vpResponseAnimFrame = null;

  // Update the live status labels in the voice panel
  function vpSetState(state) {
    const map = {
      listening: { text: 'AUDIO CAPTURE ACTIVE', mode: 'LISTENING' },
      thinking: { text: 'NEURAL PROCESSING', mode: 'THINKING' },
      speaking: { text: 'SYNTHESIZING RESPONSE', mode: 'SPEAKING' },
      idle: { text: 'AWAITING ACTIVATION', mode: 'STAND BY' },
    };
    const cfg = map[state] || map.idle;
    if (vlsTextEl) vlsTextEl.textContent = cfg.text;
    if (vlsModeEl) vlsModeEl.textContent = cfg.mode;
  }

  // Update transcript in voice panel
  function vpUpdateTranscript(text, isFinal, confidence) {
    if (!vpTranscript) return;
    vpTranscript.innerHTML = text
      ? `<span class="${isFinal ? 'transcript-final' : 'transcript-interim'}">${text}</span>`
      : `<span class="transcript-placeholder">Speak to interact with SENTINAL...</span>`;
    if (confidence && tcConfEl) {
      tcConfEl.textContent = `${Math.round(confidence * 100)}% CONF`;
      if (vmConfidenceEl) vmConfidenceEl.textContent = `${Math.round(confidence * 100)}%`;
    }
  }

  // Update SENTINAL response in voice panel
  function vpUpdateResponse(text, isDone) {
    if (!vpResponse) return;
    vpResponseBuffer = text;
    vpResponse.classList.toggle('typing', !isDone);
    vpResponse.textContent = text || '';
    if (!text) vpResponse.innerHTML = '<span class="response-placeholder">Awaiting your command, Sir.</span>';
  }

  // Session timer
  function vpStartSession() {
    vpSessionStart = Date.now();
    vpTokenCount = 0;
    if (vpSessionInterval) clearInterval(vpSessionInterval);
    vpSessionInterval = setInterval(() => {
      if (!vmSessionEl) return;
      const elapsed = Math.floor((Date.now() - vpSessionStart) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      vmSessionEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function vpStopSession() {
    if (vpSessionInterval) clearInterval(vpSessionInterval);
    vpSessionInterval = null;
  }

  // Resize waveform canvas properly when voice panel becomes visible
  function vpResizeWaveform() {
    if (!wCanvas) return;
    const rect = wCanvas.parentElement.getBoundingClientRect();
    if (rect.width > 0) {
      wCanvas.width = rect.width;
      wCanvas.height = rect.height;
    }
  }

  // SetStatus transitions are handled by the MutationObserver below instead.

  // Hook into recognition to update transcript in panel
  if (recognition) {
    const _origOnResult = recognition.onresult;
    recognition.onresult = (e) => {
      // Update voice panel transcript
      if (currentMode === 'voice') {
        let interimText = '';
        let finalText = '';
        let bestConf = 0;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) { finalText += r[0].transcript; bestConf = r[0].confidence || bestConf; }
          else { interimText += r[0].transcript; bestConf = r[0].confidence || bestConf; }
        }
        vpUpdateTranscript(finalText || interimText, !!finalText, bestConf);
        if (finalText && vmLatencyEl) {
          // Latency from listen → final result
          vmLatencyEl.textContent = '< 1s';
        }
      }
      // Call original
      if (_origOnResult) _origOnResult.call(recognition, e);
    };
  }

  // Track streaming response → show in voice panel
  let _vpStreamAccum = '';
  socket.on('chat:stream:start', () => {
    _vpStreamAccum = '';
    vpTokenCount = 0;
    if (currentMode === 'voice') {
      vpUpdateResponse('', false);
      vpSetState('thinking');
    }
  });

  // Add listener on streaming tokens for voice panel
  socket.on('chat:stream:token', (data) => {
    if (currentMode === 'voice' && data?.token) {
      _vpStreamAccum += data.token;
      vpTokenCount++;
      if (vmTokensEl) vmTokensEl.textContent = vpTokenCount;
      // Update every ~5 tokens for smooth display
      if (vpTokenCount % 5 === 0 || data.token.includes('\n')) {
        vpUpdateResponse(_vpStreamAccum, false);
        vpSetState('speaking');
      }
    }
  });

  socket.on('chat:stream:end', () => {
    if (currentMode === 'voice') {
      vpUpdateResponse(_vpStreamAccum, true);
      vpSetState('listening');
    }
  });

  socket.on('chat:response', (data) => {
    if (currentMode === 'voice' && data?.message) {
      vpUpdateResponse(data.message, true);
      vpSetState('listening');
      vpTokenCount += (data.message.split(' ').length);
      if (vmTokensEl) vmTokensEl.textContent = vpTokenCount;
    }
  });

  // Wire the vpSetState into setStatus without redefining the function
  // We patch by observing status transitions via a MutationObserver on statusText
  if (typeof statusText !== 'undefined' && statusText) {
    const statusObserver = new MutationObserver(() => {
      if (currentMode !== 'voice') return;
      const t = statusText.textContent.toLowerCase();
      if (t.includes('listen')) vpSetState('listening');
      else if (t.includes('process') || t.includes('think')) vpSetState('thinking');
      else if (t.includes('respond') || t.includes('speak')) vpSetState('speaking');
      else vpSetState('idle');
    });
    statusObserver.observe(statusText, { childList: true, characterData: true, subtree: true });
  }



  // === TERMINATE FUNCTIONALITY ===
  function terminateResponse() {
    // Stop streaming
    if (isStreaming) {
      isStreaming = false;
      socket.emit("chat:abort");
    }

    // Stop TTS
    synth.cancel();

    // Stop listening
    if (recognition && micActive) {
      recognition.stop();
      micActive = false;
    }

    // Clear thunder effects
    // if (thunderInterval) {
    //   clearInterval(thunderInterval);
    //   thunderInterval = null;
    // }

    setStatus("idle");
    updateVoiceStatus("LISTENING");

    // Resume listening in voice mode
    if (currentMode === "voice" && isVoiceAutoListening) {
      setTimeout(() => startVoiceListening(), 300);
    }

    console.log("[SENTINAL] Response terminated");
  }

  voiceTerminate.addEventListener("click", terminateResponse);
  chatTerminate.addEventListener("click", terminateResponse);

  // === INTERRUPT FEATURE ===
  // (Removed audiostart listener because laptop speakers trigger it and cause SENTINAL to self-terminate.
  // Real barge-ins are now handled exclusively by interim text matching in rec.onresult)

  // Update voice status based on SENTINAL state
  socket.on("chat:stream:start", () => {
    updateVoiceStatus("PROCESSING");
  });

  // === CAMERA REALITY SYSTEM (Restored & Enhanced) ===
  const cameraOverlay = document.getElementById('cameraOverlay');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraCountdown = document.getElementById('cameraCountdown');
  const captureBtn = document.getElementById('captureBtn');
  const closeCameraBtn = document.getElementById('closeCameraBtn');

  let cameraStream = null;

  async function openCamera() {
    try {
      if (!cameraOverlay) return;
      cameraOverlay.classList.remove('hidden');

      // 1. Enumerate all devices to find the "Integrated" or "Webcam" specifically
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      console.log("[CAMERA] Available Devices:", videoDevices.map(d => d.label));

      // 2. Try to find the built-in laptop camera
      // Keywords: "integrated", "webcam", "facetime", "internal"
      const laptopCamera = videoDevices.find(device => {
        const label = device.label.toLowerCase();
        return label.includes("integrated") ||
          label.includes("webcam") ||
          label.includes("internal") ||
          label.includes("hp") ||
          label.includes("dell") ||
          label.includes("lenovo");
      });

      let constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      if (laptopCamera) {
        console.log("[CAMERA] Selecting Laptop Camera:", laptopCamera.label);
        constraints = {
          video: {
            deviceId: { exact: laptopCamera.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
      } else {
        console.log("[CAMERA] No specific laptop camera found, using default 'user' mode details.");
      }

      console.log("[CAMERA] Requesting access with constraints:", JSON.stringify(constraints));

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("[CAMERA] Specific device request failed, falling back to default 'user'...", e);
        // Fallback: Just ask for any user-facing camera
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      }

      if (cameraVideo) {
        cameraVideo.srcObject = cameraStream;
        await cameraVideo.play();
        console.log("[CAMERA] Stream active and playing.");

        // Start periodic empathy analysis
        startEmpathyCycle();
      }

      speak("Visual sensors online.");
    } catch (err) {
      console.error("[CAMERA] Access error:", err);
      speak("Unable to access the primary camera. Please check your device settings.");
      if (cameraOverlay) cameraOverlay.classList.add('hidden');
    }
  }

  function closeCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) cameraVideo.srcObject = null;
    if (cameraOverlay) cameraOverlay.classList.add('hidden');
    if (cameraCountdown) cameraCountdown.classList.add('hidden');
  }

  async function takePicture() {
    if (!cameraStream) return;
    if (!cameraCountdown || !cameraCanvas || !cameraVideo) return;

    // Countdown
    cameraCountdown.classList.remove('hidden');
    const countSequence = ['3', '2', '1'];

    for (const count of countSequence) {
      cameraCountdown.textContent = count;
      speak(count);
      await new Promise(r => setTimeout(r, 1000));
    }

    cameraCountdown.classList.add('hidden');

    // Capture
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    const ctx = cameraCanvas.getContext('2d');

    // Mirror effect for user experience
    ctx.translate(cameraVideo.videoWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraVideo, 0, 0, cameraVideo.videoWidth, cameraVideo.videoHeight);

    // Convert to Base64
    const imageData = cameraCanvas.toDataURL('image/jpeg', 0.9);

    // Close camera immediately after capture
    closeCamera();

    // Send to backend
    socket.emit("camera:capture", { imageData });

    speak("Image captured.");
  }

  // Handle manual buttons
  if (captureBtn) captureBtn.addEventListener('click', takePicture);
  if (closeCameraBtn) closeCameraBtn.addEventListener('click', closeCamera);

  if (hackerModeBtn) {
    hackerModeBtn.addEventListener('click', () => {
      openDashboard();
    });
  }

  // Expose to window for external calls if needed (though we use local functions here)
  window.openCamera = openCamera;
  window.closeCamera = closeCamera;

  // --- EMPATHIC SENSING LOGIC ---
  let empathyInterval = null;

  function startEmpathyCycle() {
    if (empathyInterval) clearInterval(empathyInterval);
    // Initial check after 2 seconds
    setTimeout(captureFaceForEmotion, 2000);
    // Periodic check every 5 minutes
    empathyInterval = setInterval(captureFaceForEmotion, 5 * 60 * 1000);
  }

  async function captureFaceForEmotion() {
    if (!cameraStream || !cameraVideo || !cameraCanvas) return;

    console.log("[EMPATHY] Capturing face for emotional sensing...");

    const context = cameraCanvas.getContext('2d');
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    context.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

    const imageData = cameraCanvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    socket.emit("camera:face_emotion", { imageData });
  }

  // Trigger empathy check on interaction end
  socket.on("chat:stream:end", () => {
    // Occasionally check emotion after a conversation
    if (Math.random() < 0.3) setTimeout(captureFaceForEmotion, 1000);
  });


  socket.on("tts:speak", () => {
    updateVoiceStatus("SPEAKING");
  });

  socket.on("chat:stream:end", () => {
    if (currentMode === "voice") {
      setTimeout(() => {
        updateVoiceStatus("LISTENING");
        if (isVoiceAutoListening && !synth.speaking) {
          startVoiceListening();
        }
      }, 1000);
    }
  });


  // === CYBER SECURITY MODULE (DASHBOARD) ===
  const hackerDashboard = document.getElementById('hackerDashboard');
  const consoleOutput = document.getElementById('consoleOutput');
  const consoleInput = document.getElementById('consoleInput');
  const closeDashBtn = document.getElementById('closeDashBtn');
  const matrixBg = document.getElementById('matrixBg');
  const deviceList = document.getElementById('deviceList');
  let matrixInterval = null;

  socket.on('security:activate', (data) => {
    openDashboard(data.mode);
  });

  socket.on('security:output', (data) => {
    openDashboard();
    printToConsole(data.content, data.type);

    // Update specific panels if data type matches
    if (data.type === 'local_scan' || data.type === 'wifi_scan') {
      updateNetworkPanel(data.content);
    }
  });

  // --- THREAT MAP VISUALIZATION ---
  const threatCanvas = document.getElementById('threatMapCanvas');
  let threatCtx = null;
  let threatInterval = null;
  const threats = [];

  function initThreatMap() {
    if (!threatCanvas) return;
    threatCanvas.width = threatCanvas.parentElement.offsetWidth;
    threatCanvas.height = threatCanvas.parentElement.offsetHeight;
    threatCtx = threatCanvas.getContext('2d');

    // Generate random initial threats
    for (let i = 0; i < 5; i++) spawnThreat();
  }

  function spawnThreat() {
    if (!threatCanvas) return;
    threats.push({
      x: Math.random() * threatCanvas.width,
      y: Math.random() * threatCanvas.height,
      life: 100,
      color: Math.random() > 0.8 ? '#ff0000' : '#ffaa00'
    });
  }

  function drawThreatMap() {
    if (!threatCtx) return;
    // Fade out trail
    threatCtx.fillStyle = 'rgba(0, 20, 30, 0.1)';
    threatCtx.fillRect(0, 0, threatCanvas.width, threatCanvas.height);

    // Draw Grid
    threatCtx.strokeStyle = 'rgba(0, 239, 255, 0.05)';
    threatCtx.lineWidth = 1;

    // Update Threats
    for (let i = threats.length - 1; i >= 0; i--) {
      const t = threats[i];
      t.life--;

      // Draw target
      threatCtx.beginPath();
      threatCtx.strokeStyle = t.color;
      threatCtx.arc(t.x, t.y, 20 - (t.life / 5), 0, Math.PI * 2);
      threatCtx.stroke();

      // Draw connecting line
      if (i > 0) {
        const prev = threats[i - 1];
        threatCtx.beginPath();
        threatCtx.strokeStyle = `rgba(255, 50, 50, ${t.life / 100})`;
        threatCtx.moveTo(t.x, t.y);
        threatCtx.lineTo(prev.x, prev.y);
        threatCtx.stroke();
      }

      if (t.life <= 0) threats.splice(i, 1);
    }

    // Randomly spawn new
    if (Math.random() > 0.95) spawnThreat();

    // Text update
    const countEl = document.getElementById('threatCount');
    if (countEl) countEl.textContent = threats.length;
  }

  function startThreatSimulation() {
    initThreatMap();
    if (threatInterval) clearInterval(threatInterval);
    threatInterval = setInterval(drawThreatMap, 50);
  }

  function stopThreatSimulation() {
    if (threatInterval) clearInterval(threatInterval);
  }

  function openDashboard(mode = 'idle') {
    if (hackerDashboard) {
      hackerDashboard.classList.remove('hidden');
      startThreatSimulation(); // Start Map
      if (consoleInput) setTimeout(() => consoleInput.focus(), 100);

      // Handle Illegal Mode
      if (mode === 'illegal') {
        hackerDashboard.classList.add('illegal-mode');
        printToConsole("WARNING: ROOT ACCESS GRANTED. ILLEGAL MODE ACTIVE.", 'warning');
      } else {
        hackerDashboard.classList.remove('illegal-mode');
      }
    }
    if (mode !== 'idle') printToConsole(`System Access Granted. Mode: ${mode.toUpperCase()}`);

    startMatrixEffect();
  }

  function closeDashboard() {
    if (hackerDashboard) hackerDashboard.classList.add('hidden');
    stopMatrixEffect();
    stopThreatSimulation(); // Stop Map
  }

  if (closeDashBtn) {
    closeDashBtn.addEventListener('click', closeDashboard);
  }

  // CLI Input Handling
  if (consoleInput) {
    consoleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = consoleInput.value.trim();
        if (cmd) {
          printToConsole(`root@sentinal:~# ${cmd}`);
          // Send as chat message
          socket.emit('chat:message', { message: cmd });
          consoleInput.value = '';
        }
      }
    });
  }

  // Toolbox Button Handling
  document.querySelectorAll('.hack-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      if (cmd) {
        // Intercept Root Access for immediate visual feedback
        if (btn.id === 'rootAccessBtn') {
          openDashboard('illegal');
          return;
        }

        printToConsole(`Executing: ${cmd}...`);
        socket.emit('chat:message', { message: cmd });
      }
    });
  });

  function printToConsole(text, type) {
    if (!consoleOutput) return;

    // Check for AI Analysis separator
    const parts = text.split('=== 🧠 SYSTEM ANALYSIS ===');
    const mainText = parts[0];
    const analysisText = parts[1];

    // Print main text normally
    if (mainText.trim()) {
      const lines = mainText.split('\n');
      lines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'line';
        if (type === 'warning') div.style.color = '#ff0000';
        div.textContent = `> ${line}`;
        consoleOutput.insertBefore(div, consoleOutput.lastElementChild);
      });
    }

    // Print AI Analysis with special typing effect
    if (analysisText) {
      const div = document.createElement('div');
      div.className = 'line analysis-block';
      div.style.color = '#00ffff';
      div.style.marginTop = '10px';
      div.style.padding = '10px';
      div.style.border = '1px dashed #00ffff';
      div.innerHTML = `<strong>[AI INTELLIGENCE]</strong><br>`;
      consoleOutput.insertBefore(div, consoleOutput.lastElementChild);

      let i = 0;
      const typingSpeed = 10;
      const rawText = analysisText.trim();

      function typeWriter() {
        if (i < rawText.length) {
          div.innerHTML += rawText.charAt(i) === '\n' ? '<br>' : rawText.charAt(i);
          i++;
          consoleOutput.scrollTop = consoleOutput.scrollHeight;
          setTimeout(typeWriter, typingSpeed);
        }
      }
      typeWriter();
    }

    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  function updateNetworkPanel(content) {
    if (!deviceList) return;
    deviceList.innerHTML = '';
    const lines = content.split('\n');
    lines.forEach(line => {
      if (!line.trim()) return;
      const div = document.createElement('div');
      div.className = 'device-item';
      div.textContent = line;
      deviceList.appendChild(div);
    });
  }

  function startMatrixEffect() {
    if (matrixInterval) clearInterval(matrixInterval); // Restart to apply color change

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    matrixBg.innerHTML = '';
    matrixBg.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const chars = "01010101ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const columns = canvas.width / 20;
    const drops = Array(Math.floor(columns)).fill(1);

    // Check for Illegal Mode
    const isIllegal = hackerDashboard && hackerDashboard.classList.contains('illegal-mode');
    const color = isIllegal ? "#FF0000" : "#0F0";

    matrixInterval = setInterval(() => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = "15px monospace";

      drops.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 20, y * 20);
        if (y * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }, 50);
  }

  // --- DDoS SIMULATION (VISUAL ONLY) ---
  socket.on('security:activate', (data) => {
    if (data.mode === 'simulation_flood') {
      startFloodSimulation(data.target);
    } else {
      openDashboard(data.mode);
    }
  });

  function startFloodSimulation(target) {
    openDashboard('illegal'); // Force illegal mode visuals
    printToConsole(`[SIMULATION] TARGET: ${target}`, 'warning');
    printToConsole(`[SIMULATION] LAUNCHING ORBITAL ION CANNON (LOIC) PROTOCOL...`, 'warning');

    let packets = 0;
    const protocols = ['UDP', 'TCP-SYN', 'HTTP-GET', 'ICMP'];

    const floodInterval = setInterval(() => {
      packets += Math.floor(Math.random() * 500) + 100;
      const proto = protocols[Math.floor(Math.random() * protocols.length)];
      const size = Math.floor(Math.random() * 1500) + 64;
      const src = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      const log = `[${proto}] ${src} -> ${target} | Len:${size} | Seq=${packets}`;

      // Direct DOM manipulation for speed
      const div = document.createElement('div');
      div.className = 'line';
      div.style.color = '#ff0000';
      div.style.fontSize = '12px';
      div.textContent = log;
      consoleOutput.appendChild(div);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;

      // Random "Server Status" updates
      if (packets % 2000 > 1800) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'line';
        statusDiv.style.background = '#ff0000';
        statusDiv.style.color = '#000';
        statusDiv.style.fontWeight = 'bold';
        statusDiv.textContent = `>>> TARGET SERVER LOAD: ${Math.floor(Math.random() * 20) + 80}% [CRITICAL]`;
        consoleOutput.appendChild(statusDiv);
      }

    }, 50); // Fast scroll

    // Stop after 10 seconds
    setTimeout(() => {
      clearInterval(floodInterval);
      printToConsole(`[SIMULATION] ATTACK STOPPED. PACKETS SENT: ${packets}`, 'warning');
      printToConsole(`[SIMULATION] TARGET STATUS: 503 SERVICE UNAVAILABLE (SIMULATED)`, 'warning');
    }, 10000);
  }

  function stopMatrixEffect() {
    if (matrixInterval) clearInterval(matrixInterval);
    matrixInterval = null;
    if (matrixBg) matrixBg.innerHTML = '';
  }

  /* --- REPAIR MODE LOGIC (POPUP) --- */
  const repairModeBtn = document.getElementById('repairModeBtn');

  if (repairModeBtn) {
    repairModeBtn.addEventListener('click', () => {
      sfx.playClick();
      // Open in a new dedicated window
      window.open('repair.html', 'SentinalRepair', 'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no,resizable=yes');
    });
  }
});
