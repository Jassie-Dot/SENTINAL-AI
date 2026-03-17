// Socket/UI bridges extracted from inline HTML for CSP compatibility.
(function () {
  let thoughtTimer = null;

  function showThought(thought) {
    const bubble = document.getElementById('thoughtBubble');
    const textEl = document.getElementById('thoughtBubbleText');
    const metaEl = document.getElementById('thoughtBubbleMeta');
    const progressEl = bubble?.querySelector?.('.thought-bubble-progress');
    const brainIcon = document.getElementById('consciousnessIndicator')?.querySelector?.('.brain-pulse');

    if (!bubble || !textEl) return;

    textEl.textContent = '"' + (thought?.text || '') + '"';
    if (metaEl) {
      metaEl.textContent = `${thought?.category || 'thought'} · ${new Date(thought?.timestamp || Date.now()).toLocaleTimeString()}`;
    }

    if (progressEl) {
      progressEl.style.animation = 'none';
      progressEl.offsetHeight;
      progressEl.style.animation = 'progressDrain 30s linear forwards';
    }

    bubble.classList.add('visible');

    if (brainIcon) {
      brainIcon.classList.add('thinking');
      setTimeout(() => brainIcon.classList.remove('thinking'), 5000);
    }

    clearTimeout(thoughtTimer);
    thoughtTimer = setTimeout(() => bubble.classList.remove('visible'), 30000);
  }

  function showEvolution(data) {
    const toast = document.getElementById('evolutionToast');
    const msg = document.getElementById('evolutionMsg');
    if (!toast) return;
    if (msg) msg.textContent = data?.capability ? `New plugin: ${data.capability}` : 'Capability upgraded';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 6000);
  }

  function updateEmotionDisplay(state) {
    const badge = document.getElementById('emotionBadge');
    const icon = document.getElementById('emotionIcon');
    const label = document.getElementById('emotionLabel');
    const moodEl = document.getElementById('sentinalMood');

    const EMOTION_ICONS = {
      neutral: '💭', happy: '😊', curious: '🔍', excited: '⚡', focused: '🎯',
      analytical: '📊', empathetic: '💙', concerned: '⚠️', annoyed: '😤',
      melancholic: '🌧️', playful: '🎮', proud: '🏆', protective: '🛡️', serene: '🌊'
    };

    const emotionName = state?.emotion || 'neutral';
    const color = state?.color || '#00efff';

    if (icon) icon.textContent = EMOTION_ICONS[emotionName] || '💭';
    if (label) label.textContent = String(emotionName).toUpperCase();
    if (badge) badge.style.setProperty('--emotion-color', color);
    if (moodEl) moodEl.textContent = String(emotionName).toUpperCase();

    const eName = document.getElementById('emotionName');
    const barV = document.getElementById('barValence');
    const barA = document.getElementById('barArousal');
    const barD = document.getElementById('barDominance');
    const userLabel = document.getElementById('userEmotionLabel');

    if (eName) { eName.textContent = String(emotionName).toUpperCase(); eName.style.color = color; }
    if (barV) barV.style.width = `${(((state?.valence || 0) + 1) * 50)}%`;
    if (barA) barA.style.width = `${(((state?.arousal || 0) + 1) * 50)}%`;
    if (barD) barD.style.width = `${((state?.dominance || 0.5) * 100)}%`;
    if (userLabel) userLabel.textContent = String(state?.userRecentEmotion || 'neutral').toUpperCase();

    document.documentElement.style.setProperty('--sentinal-emotion-color', color);

    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
    if (m) {
      const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        document.documentElement.style.setProperty('--sentinal-emotion-rgb', `${r}, ${g}, ${b}`);
      }
    }

    window.dispatchEvent(new CustomEvent('sentinal-emotion-color', { detail: { color } }));

    const histEl = document.getElementById('emotionHistory');
    if (histEl && state?.trajectory?.length) {
      histEl.innerHTML = state.trajectory.slice(-4).reverse().map(t => {
        const ec = t?.sentinalEmotion || 'neutral';
        return `<div class="ehistory-item"><span>${ec}</span></div>`;
      }).join('');
    }
  }

  document.getElementById('dismissThought')?.addEventListener('click', () => {
    document.getElementById('thoughtBubble')?.classList.remove('visible');
    clearTimeout(thoughtTimer);
  });

  window.addEventListener('sentinal-thought', (e) => showThought(e.detail));
  window.addEventListener('sentinal-evolution', (e) => showEvolution(e.detail));
  window.addEventListener('sentinal-evolved', (e) => showEvolution(e.detail));

  // Hook into socket.io once ready
  const socketCheckInterval = setInterval(() => {
    if (window.socket) {
      clearInterval(socketCheckInterval);

      window.socket.on('sentinal:thought', (data) => {
        showThought(data);
        const moodEl = document.getElementById('sentinalMood');
        if (moodEl && data?.mood) moodEl.textContent = data.mood;
      });

      window.socket.on('sentinal:evolved', showEvolution);
      window.socket.on('sentinal:evolving', (data) => {
        const brainIcon = document.getElementById('consciousnessIndicator')?.querySelector('.brain-pulse');
        if (brainIcon) brainIcon.classList.add('thinking');
        const toast = document.getElementById('evolutionToast');
        const msg = document.getElementById('evolutionMsg');
        if (toast && msg) {
          msg.textContent = `Evolving: ${data?.target}...`;
          toast.style.borderColor = 'rgba(0, 239, 255, 0.5)';
          toast.style.color = '#00efff';
          toast.classList.remove('hidden');
        }
      });

      window.socket.on('sentinal:emotion', (state) => {
        updateEmotionDisplay(state);
      });
    }
  }, 300);
})();

