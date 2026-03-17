// Electron titlebar controls extracted from inline HTML for CSP compatibility.
(function () {
  if (window.electronAPI) {
    document.body.classList.add('electron-app');
    document.getElementById('minimizeBtn')?.addEventListener('click', () => window.electronAPI.minimize());
    document.getElementById('maximizeBtn')?.addEventListener('click', () => window.electronAPI.maximize());
    document.getElementById('closeBtn')?.addEventListener('click', () => window.electronAPI.close());
    console.log('[SENTINAL] Running in Electron Desktop Mode');
  } else {
    const titlebar = document.getElementById('titlebar');
    if (titlebar) titlebar.style.display = 'none';
    console.log('[SENTINAL] Running in Browser Mode');
  }
})();

