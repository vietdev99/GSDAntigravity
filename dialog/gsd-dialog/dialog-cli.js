#!/usr/bin/env node
/**
 * GSD Dialog CLI — Native OS Dialogs
 * 
 * Types:
 *   single_select         — Pick one option
 *   multi_select          — Pick multiple (Ctrl+Click)
 *   text_input            — Free text input
 *   select_with_text      — Pick one + enter text
 *   multi_select_with_text — Pick multiple + enter text
 *   select_with_desc      — Split panel: options + markdown description
 *   confirm               — Yes/No dialog
 * 
 * Usage:
 *   node dialog-cli.js -t "Pick" -o "A,B,C"
 *   node dialog-cli.js -t "Pick" -o "A,B,C" --type multi_select
 *   node dialog-cli.js -t "Enter" --type text_input
 *   node dialog-cli.js -t "Pick+Text" -o "A,B,C" --type select_with_text
 *   node dialog-cli.js -t "Pick+Text" -o "A,B" --type multi_select_with_text
 *   node dialog-cli.js -t "Pick" -o "A::Desc A|B::Desc B" --type select_with_desc
 *   node dialog-cli.js -t "Sure?" --type confirm
 * 
 * AI pattern:
 *   run_command(cmd, WaitMsBeforeAsync=500)
 *   command_status(id, WaitDurationSeconds=300)
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ─── Parse Args ───────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const r = { title: 'GSD Dialog', message: '', options: [], descriptions: [], type: 'single_select', placeholder: '' };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--title': case '-t': r.title = args[++i] || r.title; break;
            case '--message': case '-m': r.message = args[++i] || ''; break;
            case '--options': case '-o': parseOptions(args[++i] || '', r); break;
            case '--type': r.type = args[++i] || 'single_select'; break;
            case '--placeholder': case '-p': r.placeholder = args[++i] || ''; break;
        }
    }
    return r;
}

function parseOptions(raw, r) {
    const sep = raw.includes('|') ? '|' : ',';
    for (const item of raw.split(sep).map(s => s.trim()).filter(Boolean)) {
        if (item.includes('::')) {
            const [name, desc] = item.split('::').map(s => s.trim());
            r.options.push(name);
            r.descriptions.push(desc);
        } else {
            r.options.push(item);
            r.descriptions.push('');
        }
    }
}

// ─── PowerShell Helpers ───────────────────────────────────────────────────────

function psEsc(s) { return (s || '').replace(/'/g, "''"); }

function runPS(script) {
    const tmp = path.join(os.tmpdir(), `gsd-dlg-${Date.now()}.ps1`);
    fs.writeFileSync(tmp, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(script, 'utf8')]));
    try {
        const out = execSync(`powershell -ExecutionPolicy Bypass -File "${tmp}"`, { encoding: 'utf8', windowsHide: false }).trim();
        fs.unlinkSync(tmp);
        return out;
    } catch { try { fs.unlinkSync(tmp); } catch { } return '{"cancelled":true,"selected":null}'; }
}

const CANCELLED = '{"cancelled":true,"selected":null}';

// ─── Windows Dialogs ──────────────────────────────────────────────────────────

function winConfirm(d) {
    return runPS(`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
$r = [System.Windows.Forms.MessageBox]::Show('${psEsc(d.message || d.title)}','${psEsc(d.title)}','YesNo','Question')
if ($r -eq 'Yes') { Write-Output '{"type":"confirm","confirmed":true}' }
else { Write-Output '{"type":"confirm","confirmed":false}' }`);
}

function winTextInput(d) {
    return runPS(`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$f = New-Object System.Windows.Forms.Form
$f.Text = '${psEsc(d.title)}'; $f.Size = New-Object System.Drawing.Size(550,250)
$f.StartPosition = 'CenterScreen'; $f.FormBorderStyle = 'FixedDialog'
$f.MaximizeBox = $false; $f.MinimizeBox = $false; $f.TopMost = $true
$f.Font = New-Object System.Drawing.Font('Segoe UI',10)
$l = New-Object System.Windows.Forms.Label
$l.Location = New-Object System.Drawing.Point(15,15); $l.Size = New-Object System.Drawing.Size(500,25)
$l.Text = '${psEsc(d.message || d.title)}'; $f.Controls.Add($l)
$t = New-Object System.Windows.Forms.TextBox
$t.Location = New-Object System.Drawing.Point(15,50); $t.Size = New-Object System.Drawing.Size(500,30)
$t.Font = New-Object System.Drawing.Font('Segoe UI',12); $t.Text = '${psEsc(d.placeholder)}'
$f.Controls.Add($t)
$ok = New-Object System.Windows.Forms.Button
$ok.Location = New-Object System.Drawing.Point(330,150); $ok.Size = New-Object System.Drawing.Size(85,35)
$ok.Text = 'OK'; $ok.DialogResult = 'OK'; $f.Controls.Add($ok); $f.AcceptButton = $ok
$cc = New-Object System.Windows.Forms.Button
$cc.Location = New-Object System.Drawing.Point(425,150); $cc.Size = New-Object System.Drawing.Size(85,35)
$cc.Text = 'Cancel'; $cc.DialogResult = 'Cancel'; $f.Controls.Add($cc); $f.CancelButton = $cc
$r = $f.ShowDialog()
if ($r -eq 'OK') { $v = $t.Text -replace '"','\\"'; Write-Output ('{"type":"text_input","value":"'+$v+'"}') }
else { Write-Output '${CANCELLED}' }`);
}

function winSelectList(d) {
    const opts = d.options.map(o => `'${psEsc(o)}'`).join(',');
    const isMulti = d.type === 'multi_select';
    const mode = isMulti ? 'MultiExtended' : 'One';
    const hint = isMulti ? 'Ctrl+Click to select multiple' : 'Double-click or select + OK';
    return runPS(`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$f = New-Object System.Windows.Forms.Form
$f.Text = '${psEsc(d.title)}'; $f.Size = New-Object System.Drawing.Size(500,520)
$f.StartPosition = 'CenterScreen'; $f.FormBorderStyle = 'FixedDialog'
$f.MaximizeBox = $false; $f.MinimizeBox = $false; $f.TopMost = $true
$f.Font = New-Object System.Drawing.Font('Segoe UI',10)
$l = New-Object System.Windows.Forms.Label
$l.Location = New-Object System.Drawing.Point(15,15); $l.Size = New-Object System.Drawing.Size(450,25)
$l.Text = '${psEsc(d.message || d.title)}'; $f.Controls.Add($l)
$lb = New-Object System.Windows.Forms.ListBox
$lb.Location = New-Object System.Drawing.Point(15,45); $lb.Size = New-Object System.Drawing.Size(450,360)
$lb.Font = New-Object System.Drawing.Font('Segoe UI',12); $lb.SelectionMode = '${mode}'
$lb.Items.AddRange(@(${opts}))
$lb.Add_DoubleClick({ if ($lb.SelectedItem) { $f.DialogResult = 'OK'; $f.Close() } })
$f.Controls.Add($lb)
$h = New-Object System.Windows.Forms.Label
$h.Location = New-Object System.Drawing.Point(15,410); $h.Size = New-Object System.Drawing.Size(250,20)
$h.Text = '${hint}'; $h.ForeColor = [System.Drawing.Color]::Gray
$h.Font = New-Object System.Drawing.Font('Segoe UI',8); $f.Controls.Add($h)
$ok = New-Object System.Windows.Forms.Button
$ok.Location = New-Object System.Drawing.Point(290,430); $ok.Size = New-Object System.Drawing.Size(85,35)
$ok.Text = 'OK'; $ok.DialogResult = 'OK'; $f.Controls.Add($ok); $f.AcceptButton = $ok
$cc = New-Object System.Windows.Forms.Button
$cc.Location = New-Object System.Drawing.Point(385,430); $cc.Size = New-Object System.Drawing.Size(85,35)
$cc.Text = 'Cancel'; $cc.DialogResult = 'Cancel'; $f.Controls.Add($cc); $f.CancelButton = $cc
$r = $f.ShowDialog()
if ($r -eq 'OK' -and $lb.SelectedItems.Count -gt 0) {
  $s = @($lb.SelectedItems) | ForEach-Object { '"'+($_ -replace '"','\\"')+'"' }
  $j = $s -join ','
  if ('${d.type}' -eq 'multi_select') { Write-Output ('{"type":"multi_select","selected":['+$j+']}') }
  else { Write-Output ('{"type":"single_select","selected":'+$s[0]+'}') }
} else { Write-Output '${CANCELLED}' }`);
}

function winSelectWithText(d) {
    const opts = d.options.map(o => `'${psEsc(o)}'`).join(',');
    const isMulti = d.type === 'multi_select_with_text';
    const mode = isMulti ? 'MultiExtended' : 'One';
    const tType = isMulti ? 'multi_select_with_text' : 'select_with_text';
    return runPS(`[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$f = New-Object System.Windows.Forms.Form
$f.Text = '${psEsc(d.title)}'; $f.Size = New-Object System.Drawing.Size(500,560)
$f.StartPosition = 'CenterScreen'; $f.FormBorderStyle = 'FixedDialog'
$f.MaximizeBox = $false; $f.MinimizeBox = $false; $f.TopMost = $true
$f.Font = New-Object System.Drawing.Font('Segoe UI',10)
$l = New-Object System.Windows.Forms.Label
$l.Location = New-Object System.Drawing.Point(15,15); $l.Size = New-Object System.Drawing.Size(450,25)
$l.Text = '${psEsc(d.message || d.title)}'; $f.Controls.Add($l)
$lb = New-Object System.Windows.Forms.ListBox
$lb.Location = New-Object System.Drawing.Point(15,45); $lb.Size = New-Object System.Drawing.Size(450,300)
$lb.Font = New-Object System.Drawing.Font('Segoe UI',12); $lb.SelectionMode = '${mode}'
$lb.Items.AddRange(@(${opts})); $f.Controls.Add($lb)
$tl = New-Object System.Windows.Forms.Label
$tl.Location = New-Object System.Drawing.Point(15,355); $tl.Size = New-Object System.Drawing.Size(450,22)
$tl.Text = '${psEsc(d.placeholder || 'Additional details (optional):')}'
$tl.ForeColor = [System.Drawing.Color]::Gray; $f.Controls.Add($tl)
$tb = New-Object System.Windows.Forms.TextBox
$tb.Location = New-Object System.Drawing.Point(15,380); $tb.Size = New-Object System.Drawing.Size(450,30)
$tb.Font = New-Object System.Drawing.Font('Segoe UI',12); $f.Controls.Add($tb)
$ok = New-Object System.Windows.Forms.Button
$ok.Location = New-Object System.Drawing.Point(290,470); $ok.Size = New-Object System.Drawing.Size(85,35)
$ok.Text = 'OK'; $ok.DialogResult = 'OK'; $f.Controls.Add($ok); $f.AcceptButton = $ok
$cc = New-Object System.Windows.Forms.Button
$cc.Location = New-Object System.Drawing.Point(385,470); $cc.Size = New-Object System.Drawing.Size(85,35)
$cc.Text = 'Cancel'; $cc.DialogResult = 'Cancel'; $f.Controls.Add($cc); $f.CancelButton = $cc
$r = $f.ShowDialog()
if ($r -eq 'OK' -and $lb.SelectedItems.Count -gt 0) {
  $txt = $tb.Text -replace '"','\\"'
  if ('${tType}' -eq 'multi_select_with_text') {
    $s = @($lb.SelectedItems) | ForEach-Object { '"'+($_ -replace '"','\\"')+'"' }
    Write-Output ('{"type":"multi_select_with_text","selected":['+($s -join ',')+'],"text":"'+$txt+'"}')
  } else {
    $sel = $lb.SelectedItem -replace '"','\\"'
    Write-Output ('{"type":"select_with_text","selected":"'+$sel+'","text":"'+$txt+'"}')
  }
} else { Write-Output '${CANCELLED}' }`);
}

function winSelectWithDesc(d) {
    // Write data to temp JSON file — avoids all PS param issues
    const tmp = path.join(os.tmpdir(), `gsd-dlg-data-${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ title: d.title, message: d.message || d.title, options: d.options, descriptions: d.descriptions }), 'utf8');
    const ps1 = path.join(__dirname, 'select-with-desc.ps1');
    try {
        const out = execSync(`powershell -ExecutionPolicy Bypass -File "${ps1}" -DataFile "${tmp}"`, { encoding: 'utf8', windowsHide: false }).trim();
        try { fs.unlinkSync(tmp); } catch { }
        return out || CANCELLED;
    } catch { try { fs.unlinkSync(tmp); } catch { } return CANCELLED; }
}

function showWin(d) {
    switch (d.type) {
        case 'confirm': return winConfirm(d);
        case 'text_input': return winTextInput(d);
        case 'select_with_text':
        case 'multi_select_with_text': return winSelectWithText(d);
        case 'select_with_desc': return winSelectWithDesc(d);
        default: return winSelectList(d);
    }
}

// ─── macOS ────────────────────────────────────────────────────────────────────

function showMac(d) {
    const esc = s => (s || '').replace(/"/g, '\\"');
    if (d.type === 'confirm') {
        try { const r = execSync(`osascript -e 'set r to button returned of (display dialog "${esc(d.message || d.title)}" with title "${esc(d.title)}" buttons {"No","Yes"} default button "Yes")' -e 'if r is "Yes" then return "yes"' -e 'return "no"'`, { encoding: 'utf8' }).trim(); return JSON.stringify({ type: 'confirm', confirmed: r === 'yes' }); } catch { return '{"type":"confirm","confirmed":false}'; }
    }
    if (d.type === 'text_input') {
        try { const r = execSync(`osascript -e 'text returned of (display dialog "${esc(d.message || d.title)}" default answer "${esc(d.placeholder)}" with title "${esc(d.title)}")'`, { encoding: 'utf8' }).trim(); return JSON.stringify({ type: 'text_input', value: r }); } catch { return CANCELLED; }
    }
    const items = d.options.map(o => `"${esc(o)}"`).join(', ');
    const multi = d.type.includes('multi') ? 'with multiple selections allowed' : '';
    try { const r = execSync(`osascript -e 'choose from list {${items}} with title "${esc(d.title)}" with prompt "${esc(d.message || d.title)}" ${multi}'`, { encoding: 'utf8' }).trim(); if (r === 'false') return CANCELLED; const sel = r.split(', '); return d.type.includes('multi') ? JSON.stringify({ type: d.type, selected: sel }) : JSON.stringify({ type: d.type, selected: sel[0] }); } catch { return CANCELLED; }
}

// ─── Linux ────────────────────────────────────────────────────────────────────

function showLinux(d) {
    const esc = s => (s || '').replace(/"/g, '\\"');
    if (d.type === 'confirm') { try { execSync(`zenity --question --title="${esc(d.title)}" --text="${esc(d.message || d.title)}" 2>/dev/null`); return '{"type":"confirm","confirmed":true}'; } catch { return '{"type":"confirm","confirmed":false}'; } }
    if (d.type === 'text_input') { try { const r = execSync(`zenity --entry --title="${esc(d.title)}" --text="${esc(d.message || d.title)}" 2>/dev/null`, { encoding: 'utf8' }).trim(); return JSON.stringify({ type: 'text_input', value: r }); } catch { return CANCELLED; } }
    const items = d.options.map(o => `"${esc(o)}"`).join(' ');
    try { const r = execSync(`zenity --list --title="${esc(d.title)}" --text="${esc(d.message || d.title)}" --column=Option ${items} 2>/dev/null`, { encoding: 'utf8' }).trim(); if (!r) return CANCELLED; return JSON.stringify({ type: 'single_select', selected: r }); } catch { return CANCELLED; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const d = parseArgs();
let result;
switch (process.platform) {
    case 'win32': result = showWin(d); break;
    case 'darwin': result = showMac(d); break;
    default: result = showLinux(d); break;
}
console.log(result);
