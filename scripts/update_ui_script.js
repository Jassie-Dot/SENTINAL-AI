
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'public', 'script.js');
let content = fs.readFileSync(filePath, 'utf8');

const injection = `
  /* --- REPAIR MODE LOGIC --- */
  const repairModeBtn = document.getElementById('repairModeBtn');
  const repairOverlay = document.getElementById('repairOverlay');
  const closeRepairBtn = document.getElementById('closeRepairBtn');
  const btnScan = document.getElementById('btnScan');
  const btnDiagnose = document.getElementById('btnDiagnose');
  const repairLog = document.getElementById('repairLog');
  const repairVisualizer = document.getElementById('repairVisualizer');
  const repairInput = document.getElementById('repairInput');
  const repairSubmit = document.getElementById('repairSubmit');

  if (repairModeBtn) {
    repairModeBtn.addEventListener('click', () => {
       if (repairOverlay) repairOverlay.classList.remove('hidden');
       addRepairLog("Diagnostic Mode Activated...");
    });
  }

  if (closeRepairBtn) {
    closeRepairBtn.addEventListener('click', () => {
       if (repairOverlay) repairOverlay.classList.add('hidden');
    });
  }

  function addRepairLog(msg, type = 'info') {
      const div = document.createElement('div');
      div.className = \`log-line \${type}\`;
      div.textContent = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
      if (repairLog) {
         repairLog.appendChild(div);
         repairLog.scrollTop = repairLog.scrollHeight;
      }
  }

  // Socket Events for Repair
  socket.on('repair:status', (data) => {
      addRepairLog(data.message, 'info');
  });

  socket.on('repair:progress', (data) => {
      if (repairVisualizer) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = Math.random() * 90 + '%';
        el.style.top = Math.random() * 90 + '%';
        el.style.color = '#ffaa00';
        el.style.fontSize = '10px';
        el.textContent = data.file;
        el.style.opacity = '1';
        el.style.transition = 'opacity 1s';
        repairVisualizer.appendChild(el);
        
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 1000);
        }, 500);
      }
      addRepairLog(\`Checking: \${data.file}\`);
  });

  socket.on('repair:complete', (report) => {
      addRepairLog(\`SCAN COMPLETE. \${report.totalFiles} files scanned.\`, 'success');
      addRepairLog(\`Found \${report.issues.length} issues.\`);
      if (btnDiagnose) btnDiagnose.disabled = false;
      const integrityEl = document.getElementById('integrityValue');
      if (integrityEl) {
        integrityEl.textContent = report.issues.length === 0 ? "100%" : "WARNING";
        integrityEl.style.color = report.issues.length === 0 ? "#00ff00" : "#ff3333";
      }
  });

  if (btnScan) {
      btnScan.addEventListener('click', () => {
          btnScan.disabled = true;
          addRepairLog("Initiating Full System Scan...");
          socket.emit('chat:message', { message: "system.scan" });
      });
  }

  if (btnDiagnose) {
      btnDiagnose.addEventListener('click', () => {
          addRepairLog("Analyzing scan results with Neural Core...", "warn");
          socket.emit('chat:message', { message: "system.diagnose" });
      });
  }
  
  if (repairSubmit) {
      repairSubmit.addEventListener('click', () => {
          const issue = repairInput.value;
          if (issue && issue.trim()) {
               addRepairLog(\`Manual Issue Report: \${issue}\`);
               socket.emit('chat:message', { message: \`repair: \${issue}\` });
               repairInput.value = '';
          }
      });
  }
`;

// Insert before the last line (which is "});")
const lines = content.trim().split('\\n');
// Check if already injected
if (content.includes("/* --- REPAIR MODE LOGIC --- */")) {
    console.log("Script already updated.");
} else {
    // Remove last line "});"
    lines.pop();
    // Add injection
    lines.push(injection);
    // Add closing
    lines.push('});');

    fs.writeFileSync(filePath, lines.join('\\n'));
    console.log("script.js updated successfully.");
}
