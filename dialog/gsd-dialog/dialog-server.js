#!/usr/bin/env node
/**
 * GSD Tabbed Dialog — Browser-based (inside IDE Simple Browser)
 * 
 * 1. Reads questions from JSON file
 * 2. Starts localhost HTTP server with modern HTML form
 * 3. Opens URL in IDE's Simple Browser panel
 * 4. User fills tabs, clicks Submit
 * 5. Server outputs JSON to stdout and exits
 * 
 * Usage:
 *   node dialog-server.js --data /path/to/questions.json
 *   node dialog-server.js --data /path/to/questions.json --port 0
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse args
const args = process.argv.slice(2);
let dataFile = '', port = 0;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--data' || args[i] === '-d') dataFile = args[++i];
  if (args[i] === '--port' || args[i] === '-p') port = parseInt(args[++i]) || 0;
}

// Load data from file or stdin
async function loadData() {
  // Option 1: --data file
  if (dataFile && fs.existsSync(dataFile)) {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
  // Option 2: stdin pipe (echo '{"title":"..."}' | node dialog-server.js)
  if (!process.stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let input = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => input += chunk);
      process.stdin.on('end', () => {
        try { resolve(JSON.parse(input)); }
        catch (e) { reject(new Error('Invalid JSON from stdin')); }
      });
    });
  }
  console.log(JSON.stringify({ error: 'No data. Use --data file.json or pipe JSON via stdin', cancelled: true }));
  process.exit(1);
}

loadData().then(data => startServer(data)).catch(e => {
  console.log(JSON.stringify({ error: e.message, cancelled: true }));
  process.exit(1);
});

function startServer(data) {

  // ─── HTML Template ────────────────────────────────────────────────────────────

  function buildHTML(data) {
    const questionsJSON = JSON.stringify(data.questions);
    const title = data.title || 'GSD Dialog';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, sans-serif;
    background: #1e1e2e; color: #cdd6f4;
    min-height: 100vh; padding: 24px;
  }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #cba6f7; }

  /* Tabs */
  .tabs { display: flex; gap: 2px; border-bottom: 2px solid #313244; margin-bottom: 0; }
  .tab {
    padding: 10px 20px; cursor: pointer; font-size: 14px; font-weight: 500;
    background: #181825; color: #6c7086; border-radius: 8px 8px 0 0;
    border: 1px solid transparent; border-bottom: none; transition: all 0.2s;
  }
  .tab:hover { color: #cdd6f4; background: #1e1e2e; }
  .tab.active { color: #cba6f7; background: #1e1e2e; border-color: #313244; font-weight: 600; }

  /* Tab content */
  .tab-content { display: none; padding: 24px; background: #1e1e2e; border: 1px solid #313244; border-top: none; border-radius: 0 0 8px 8px; min-height: 400px; }
  .tab-content.active { display: block; }

  .q-desc { font-size: 13px; color: #a6adc8; line-height: 1.5; margin-bottom: 16px; padding: 12px 16px; background: #181825; border-radius: 8px; border-left: 3px solid #89b4fa; }
  .q-message { font-size: 15px; font-weight: 600; color: #cdd6f4; margin-bottom: 14px; }

  /* Controls */
  .option-list { list-style: none; max-height: 300px; overflow-y: auto; border: 1px solid #313244; border-radius: 8px; }
  .option-item {
    padding: 10px 16px; cursor: pointer; font-size: 14px;
    border-bottom: 1px solid #313244; transition: all 0.15s;
    display: flex; align-items: center; gap: 10px;
  }
  .option-item:last-child { border-bottom: none; }
  .option-item:hover { background: #313244; }
  .option-item.selected { background: #45475a; color: #cba6f7; }
  .option-item .check { width: 18px; height: 18px; border: 2px solid #6c7086; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
  .option-item.selected .check { border-color: #cba6f7; background: #cba6f7; }
  .option-item.selected .check::after { content: '✓'; color: #1e1e2e; font-size: 12px; font-weight: bold; }
  .radio .check { border-radius: 50%; }

  /* Split panel */
  .split-panel { display: flex; gap: 16px; }
  .split-left { flex: 0 0 250px; }
  .split-right { flex: 1; }
  .desc-preview {
    background: #181825; border: 1px solid #313244; border-radius: 8px;
    padding: 16px; min-height: 300px; font-size: 14px; line-height: 1.6; color: #cdd6f4;
    overflow-y: auto; max-height: 350px;
  }
  .desc-preview h2, .desc-preview h3, .desc-preview h4 { color: #cba6f7; margin: 12px 0 6px; }
  .desc-preview b, .desc-preview strong { color: #f5c2e7; }
  .desc-preview code { background: #313244; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #a6e3a1; }
  .desc-preview ul { padding-left: 20px; margin: 6px 0; }
  .desc-preview li { margin: 3px 0; }
  .desc-placeholder { color: #6c7086; font-style: italic; }

  /* Text input */
  .text-input, .text-area {
    width: 100%; padding: 10px 14px; font-size: 14px; font-family: inherit;
    background: #181825; color: #cdd6f4; border: 1px solid #313244; border-radius: 8px;
    outline: none; transition: border-color 0.2s;
  }
  .text-input:focus, .text-area:focus { border-color: #cba6f7; }
  .text-area { min-height: 100px; resize: vertical; }

  .or-label { font-size: 12px; color: #6c7086; margin: 10px 0 6px; }
  .hint { font-size: 11px; color: #585b70; margin-top: 6px; }

  /* Buttons */
  .buttons { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
  .btn {
    padding: 10px 28px; font-size: 14px; font-weight: 600; border: none;
    border-radius: 8px; cursor: pointer; transition: all 0.2s; font-family: inherit;
  }
  .btn-submit { background: #cba6f7; color: #1e1e2e; }
  .btn-submit:hover:not(:disabled) { background: #b4befe; transform: translateY(-1px); }
  .btn-submit:disabled { background: #45475a; color: #6c7086; cursor: not-allowed; opacity: 0.6; }
  .btn-cancel { background: #313244; color: #cdd6f4; }
  .btn-cancel:hover { background: #45475a; }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="tabs" id="tabs"></div>
<div id="panels"></div>
<div class="buttons">
  <button class="btn btn-cancel" onclick="doCancel()">Cancel</button>
  <button class="btn btn-submit" id="submitBtn" onclick="doSubmit()" disabled>Submit</button>
</div>

<script>
const questions = ${questionsJSON};
const answers = {};

// Simple markdown to HTML
function md(text) {
  if (!text) return '';
  let h = text;
  h = h.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  h = h.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
  h = h.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
  h = h.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>');
  h = h.replace(/\\n/g, '<br>');
  return h;
}

// Build tabs
const tabsEl = document.getElementById('tabs');
const panelsEl = document.getElementById('panels');

questions.forEach((q, i) => {
  // Tab button
  const tab = document.createElement('div');
  tab.className = 'tab' + (i === 0 ? ' active' : '');
  tab.textContent = q.label || q.id;
  tab.onclick = () => switchTab(i);
  tab.id = 'tab-' + i;
  tabsEl.appendChild(tab);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'tab-content' + (i === 0 ? ' active' : '');
  panel.id = 'panel-' + i;

  let html = '';

  // Description
  if (q.description) html += '<div class="q-desc">' + q.description + '</div>';
  // Question
  html += '<div class="q-message">' + (q.message || q.label) + '</div>';

  const type = q.type || 'single_select';
  const opts = q.options || [];
  const descs = q.descriptions || [];

  switch (type) {
    case 'text_input':
      html += '<textarea class="text-area" id="input-' + q.id + '" placeholder="' + (q.placeholder || '') + '">' + (q.placeholder || '') + '</textarea>';
      answers[q.id] = { type: 'text_input', value: q.placeholder || '' };
      break;

    case 'single_select':
      html += '<div class="option-list radio" id="list-' + q.id + '">';
      opts.forEach((o, j) => {
        html += '<div class="option-item" data-idx="' + j + '" onclick="selectSingle(\\'' + q.id + '\\',' + j + ')"><div class="check"></div><span>' + o + '</span></div>';
      });
      html += '</div>';
      answers[q.id] = { type: 'single_select', selected: null };
      break;

    case 'multi_select':
      html += '<div class="option-list" id="list-' + q.id + '">';
      opts.forEach((o, j) => {
        html += '<div class="option-item" data-idx="' + j + '" onclick="selectMulti(\\'' + q.id + '\\',' + j + ')"><div class="check"></div><span>' + o + '</span></div>';
      });
      html += '</div>';
      html += '<div class="hint">Click to toggle selection</div>';
      answers[q.id] = { type: 'multi_select', selected: [] };
      break;

    case 'select_with_text':
      html += '<div class="option-list radio" id="list-' + q.id + '">';
      opts.forEach((o, j) => {
        html += '<div class="option-item" data-idx="' + j + '" onclick="selectSingleText(\\'' + q.id + '\\',' + j + ')"><div class="check"></div><span>' + o + '</span></div>';
      });
      html += '</div>';
      html += '<div class="or-label">' + (q.placeholder || 'Or enter your own answer (clears selection):') + '</div>';
      html += '<input type="text" class="text-input" id="text-' + q.id + '" oninput="onTextInput(\\'' + q.id + '\\')" placeholder="Type custom answer...">';
      answers[q.id] = { type: 'select_with_text', selected: null, text: '' };
      break;

    case 'multi_select_with_text':
      html += '<div class="option-list" id="list-' + q.id + '">';
      opts.forEach((o, j) => {
        html += '<div class="option-item" data-idx="' + j + '" onclick="selectMulti(\\'' + q.id + '\\',' + j + ')"><div class="check"></div><span>' + o + '</span></div>';
      });
      html += '</div>';
      html += '<div class="hint">Click to toggle selection</div>';
      html += '<div class="or-label">' + (q.placeholder || 'Additional notes:') + '</div>';
      html += '<input type="text" class="text-input" id="text-' + q.id + '" oninput="onMultiText(\\'' + q.id + '\\')" placeholder="Extra notes...">';
      answers[q.id] = { type: 'multi_select_with_text', selected: [], text: '' };
      break;

    case 'select_with_desc':
      html += '<div class="split-panel"><div class="split-left">';
      html += '<div class="option-list radio" id="list-' + q.id + '">';
      opts.forEach((o, j) => {
        html += '<div class="option-item" data-idx="' + j + '" onclick="selectDesc(\\'' + q.id + '\\',' + j + ')"><div class="check"></div><span>' + o + '</span></div>';
      });
      html += '</div></div><div class="split-right">';
      html += '<div class="desc-preview" id="desc-' + q.id + '"><span class="desc-placeholder">Select an option to see its description.</span></div>';
      html += '</div></div>';
      // Store descriptions
      answers[q.id] = { type: 'select_with_desc', selected: null, description: '', _descs: descs };
      break;
  }

  panel.innerHTML = html;
  panelsEl.appendChild(panel);
});

// Tab switching
function switchTab(idx) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  document.querySelectorAll('.tab-content').forEach((p, i) => p.classList.toggle('active', i === idx));
}

// Selection handlers
function selectSingle(qid, idx) {
  const list = document.getElementById('list-' + qid);
  list.querySelectorAll('.option-item').forEach((el, i) => el.classList.toggle('selected', i === idx));
  const q = questions.find(q => q.id === qid);
  answers[qid].selected = q.options[idx];
  checkAllAnswered();
}

function selectMulti(qid, idx) {
  const list = document.getElementById('list-' + qid);
  const item = list.querySelectorAll('.option-item')[idx];
  item.classList.toggle('selected');
  const q = questions.find(q => q.id === qid);
  answers[qid].selected = [];
  list.querySelectorAll('.option-item.selected').forEach(el => {
    answers[qid].selected.push(q.options[parseInt(el.dataset.idx)]);
  });
  checkAllAnswered();
}

function selectSingleText(qid, idx) {
  selectSingle(qid, idx);
  const textEl = document.getElementById('text-' + qid);
  if (textEl) { textEl.value = ''; answers[qid].text = ''; }
  checkAllAnswered();
}

function onTextInput(qid) {
  const textEl = document.getElementById('text-' + qid);
  const list = document.getElementById('list-' + qid);
  if (textEl.value !== '') {
    list.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
    answers[qid].selected = null;
  }
  answers[qid].text = textEl.value;
  checkAllAnswered();
}

function onMultiText(qid) {
  const textEl = document.getElementById('text-' + qid);
  answers[qid].text = textEl.value;
  checkAllAnswered();
}

function selectDesc(qid, idx) {
  selectSingle(qid, idx);
  const q = questions.find(q => q.id === qid);
  const descs = answers[qid]._descs || q.descriptions || [];
  const descEl = document.getElementById('desc-' + qid);
  if (descs[idx]) {
    descEl.innerHTML = md(descs[idx]);
    answers[qid].description = descs[idx];
  } else {
    descEl.innerHTML = '<span class="desc-placeholder">No description available.</span>';
  }
  answers[qid].selected = q.options[idx];
  checkAllAnswered();
}

// Update text_input answers on change
document.querySelectorAll('.text-area').forEach(el => {
  el.addEventListener('input', () => {
    const qid = el.id.replace('input-', '');
    answers[qid].value = el.value;
    checkAllAnswered();
  });
});

// Validation: enable Submit only when all tabs answered
function checkAllAnswered() {
  const btn = document.getElementById('submitBtn');
  const allDone = questions.every(q => {
    const a = answers[q.id];
    if (!a) return false;
    switch (a.type) {
      case 'text_input': return a.value && a.value.trim() !== '' && a.value !== (q.placeholder || '');
      case 'single_select': return a.selected !== null;
      case 'multi_select': return a.selected && a.selected.length > 0;
      case 'select_with_text': return a.selected !== null || (a.text && a.text.trim() !== '');
      case 'multi_select_with_text': return (a.selected && a.selected.length > 0) || (a.text && a.text.trim() !== '');
      case 'select_with_desc': return a.selected !== null;
      default: return true;
    }
  });
  btn.disabled = !allDone;
}

// Submit
function doSubmit() {
  const result = questions.map(q => {
    const a = { ...answers[q.id] };
    delete a._descs;
    a.id = q.id;
    return a;
  });
  fetch('/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancelled: false, answers: result }) })
    .then(() => window.close());
}

function doCancel() {
  fetch('/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cancelled: true, answers: [] }) })
    .then(() => window.close());
}
</script>
</body>
</html>`;
  }

  // ─── Server ───────────────────────────────────────────────────────────────────

  const html = buildHTML(data);

  const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'POST' && req.url === '/submit') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font-family:Segoe UI;background:#1e1e2e;color:#a6e3a1;display:flex;align-items:center;justify-content:center;height:100vh;font-size:20px">✓ Submitted! You can close this tab.</body></html>');
        console.log(body);
        setTimeout(() => process.exit(0), 500);
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, '127.0.0.1', () => {
    const actualPort = server.address().port;
    const url = `http://127.0.0.1:${actualPort}`;

    // Open in Chrome app mode (clean window, no address bar)
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      // Try Chrome, Edge, then default browser
      exec(`start chrome --app="${url}" --window-size=800,650`, (err) => {
        if (err) exec(`start msedge --app="${url}" --window-size=800,650`, (err2) => {
          if (err2) exec(`start "" "${url}"`, () => { });
        });
      });
    } else if (process.platform === 'darwin') {
      exec(`open -na "Google Chrome" --args --app="${url}" --window-size=800,650`, (err) => {
        if (err) exec(`open "${url}"`, () => { });
      });
    } else {
      exec(`google-chrome --app="${url}" --window-size=800,650 2>/dev/null || xdg-open "${url}"`, () => { });
    }

    // Timeout after 10 minutes
    setTimeout(() => {
      console.log('{"cancelled":true,"answers":[],"reason":"timeout"}');
      process.exit(1);
    }, 600000);
  });
} // end startServer
