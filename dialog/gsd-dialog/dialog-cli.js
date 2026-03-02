#!/usr/bin/env node
/**
 * GSD Dialog CLI — Native OS Dialogs
 * 
 * Shows native window dialogs for user input.
 * - Windows: PowerShell WinForms (UTF-8)
 * - macOS: osascript (AppleScript)
 * - Linux: zenity
 * 
 * Usage:
 *   node dialog-cli.js --title "Pick a stack" --options "React,Vue,Svelte"
 *   node dialog-cli.js --title "Enter description" --type text_input
 *   node dialog-cli.js --title "Select features" --options "Auth,DB,API" --type multi_select
 *   node dialog-cli.js --title "Config" --options "React,Vue,Other" --type select_with_text --placeholder "Custom choice..."
 * 
 * Output (stdout JSON):
 *   {"type":"single_select","selected":"React"}
 *   {"type":"text_input","value":"My custom text"}
 *   {"type":"multi_select","selected":["Auth","API"]}
 *   {"type":"select_with_text","selected":"React","text":""}
 *   {"type":"select_with_text","selected":"Other","text":"Remix"}
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ─── Parse CLI Args ───────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const result = {
        title: 'GSD Dialog',
        message: '',
        options: [],
        type: 'single_select',
        placeholder: 'Enter your answer...',
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--title': case '-t':
                result.title = args[++i] || result.title; break;
            case '--message': case '-m':
                result.message = args[++i] || ''; break;
            case '--options': case '-o':
                result.options = (args[++i] || '').split(',').map(s => s.trim()).filter(Boolean); break;
            case '--type':
                result.type = args[++i] || 'single_select'; break;
            case '--placeholder': case '-p':
                result.placeholder = args[++i] || ''; break;
        }
    }

    return result;
}

// ─── Windows: PowerShell WinForms ─────────────────────────────────────────────

function showWindowsDialog(data) {
    const psEscape = (s) => s.replace(/'/g, "''");
    const title = psEscape(data.title);
    const message = psEscape(data.message || data.title);

    let psScript;

    if (data.type === 'text_input') {
        psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = '${title}'
$form.Size = New-Object System.Drawing.Size(450, 220)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(400, 25)
$label.Text = '${message}'
$form.Controls.Add($label)

$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(15, 50)
$textBox.Size = New-Object System.Drawing.Size(400, 30)
$textBox.Text = '${psEscape(data.placeholder)}'
$textBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$form.Controls.Add($textBox)

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(235, 130)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'
$okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn)
$form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(330, 130)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'
$cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn)
$form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK') {
  $val = $textBox.Text -replace '"', '\\"'
  Write-Output ('{"type":"text_input","value":"' + $val + '"}')
} else {
  Write-Output '{"cancelled":true,"selected":null}'
}
`;
    } else if (data.type === 'select_with_text') {
        // Combo: ListBox + TextBox
        const optionItems = data.options.map(o => `'${psEscape(o)}'`).join(',');
        psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = '${title}'
$form.Size = New-Object System.Drawing.Size(420, 440)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(370, 25)
$label.Text = '${message}'
$form.Controls.Add($label)

$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(15, 45)
$listBox.Size = New-Object System.Drawing.Size(370, 220)
$listBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$listBox.SelectionMode = 'One'
$listBox.Items.AddRange(@(${optionItems}))
$form.Controls.Add($listBox)

$textLabel = New-Object System.Windows.Forms.Label
$textLabel.Location = New-Object System.Drawing.Point(15, 275)
$textLabel.Size = New-Object System.Drawing.Size(370, 25)
$textLabel.Text = '${psEscape(data.placeholder || 'Additional details (optional):')}'
$textLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($textLabel)

$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(15, 300)
$textBox.Size = New-Object System.Drawing.Size(370, 30)
$textBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$form.Controls.Add($textBox)

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(200, 350)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'
$okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn)
$form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(295, 350)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'
$cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn)
$form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK' -and $listBox.SelectedItem) {
  $sel = $listBox.SelectedItem -replace '"', '\\"'
  $txt = $textBox.Text -replace '"', '\\"'
  Write-Output ('{"type":"select_with_text","selected":"' + $sel + '","text":"' + $txt + '"}')
} else {
  Write-Output '{"cancelled":true,"selected":null}'
}
`;
    } else {
        // single_select or multi_select
        const optionItems = data.options.map(o => `'${psEscape(o)}'`).join(',');
        const selectionMode = data.type === 'multi_select' ? 'MultiExtended' : 'One';

        psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = '${title}'
$form.Size = New-Object System.Drawing.Size(420, 400)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(370, 25)
$label.Text = '${message}'
$form.Controls.Add($label)

$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(15, 45)
$listBox.Size = New-Object System.Drawing.Size(370, 250)
$listBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$listBox.SelectionMode = '${selectionMode}'
$listBox.Items.AddRange(@(${optionItems}))
$listBox.Add_DoubleClick({ if ($listBox.SelectedItem) { $form.DialogResult = 'OK'; $form.Close() } })
$form.Controls.Add($listBox)

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(200, 310)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'
$okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn)
$form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(295, 310)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'
$cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn)
$form.CancelButton = $cancelBtn

$hint = New-Object System.Windows.Forms.Label
$hint.Location = New-Object System.Drawing.Point(15, 315)
$hint.Size = New-Object System.Drawing.Size(180, 20)
$hint.Text = if ('${selectionMode}' -eq 'MultiExtended') { 'Ctrl+Click to select multiple' } else { 'Double-click or select + OK' }
$hint.ForeColor = [System.Drawing.Color]::Gray
$hint.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$form.Controls.Add($hint)

$result = $form.ShowDialog()

if ($result -eq 'OK' -and $listBox.SelectedItems.Count -gt 0) {
  $selected = @($listBox.SelectedItems) | ForEach-Object { '"' + ($_ -replace '"','\\"') + '"' }
  $json = $selected -join ','
  if ('${data.type}' -eq 'multi_select') {
    Write-Output ('{"type":"multi_select","selected":[' + $json + ']}')
  } else {
    Write-Output ('{"type":"single_select","selected":' + $selected[0] + '}')
  }
} else {
  Write-Output '{"cancelled":true,"selected":null}'
}
`;
    }

    // Write PS1 with UTF-8 BOM for proper encoding
    const tmpFile = path.join(os.tmpdir(), `gsd-dialog-${Date.now()}.ps1`);
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const content = Buffer.from(psScript, 'utf8');
    fs.writeFileSync(tmpFile, Buffer.concat([bom, content]));

    try {
        const output = execSync(
            `powershell -ExecutionPolicy Bypass -File "${tmpFile}"`,
            { encoding: 'utf8', windowsHide: false }
        ).trim();
        fs.unlinkSync(tmpFile);
        return output;
    } catch (e) {
        try { fs.unlinkSync(tmpFile); } catch { }
        return '{"cancelled":true,"selected":null}';
    }
}

// ─── macOS: osascript ─────────────────────────────────────────────────────────

function showMacDialog(data) {
    const escape = (s) => s.replace(/"/g, '\\"');

    if (data.type === 'text_input') {
        const cmd = `osascript -e 'set result to text returned of (display dialog "${escape(data.message || data.title)}" default answer "${escape(data.placeholder)}" with title "${escape(data.title)}")' -e 'return result'`;
        try {
            const result = execSync(cmd, { encoding: 'utf8' }).trim();
            return JSON.stringify({ type: 'text_input', value: result });
        } catch { return '{"cancelled":true,"selected":null}'; }
    }

    if (data.type === 'select_with_text') {
        // macOS: choose from list + follow-up text input
        const items = data.options.map(o => `"${escape(o)}"`).join(', ');
        const cmd = `osascript -e 'set sel to choose from list {${items}} with title "${escape(data.title)}" with prompt "${escape(data.message || data.title)}"' -e 'if sel is false then return "CANCELLED"' -e 'set txt to text returned of (display dialog "Additional details:" default answer "" with title "${escape(data.title)}")' -e 'return (item 1 of sel) & "|" & txt'`;
        try {
            const result = execSync(cmd, { encoding: 'utf8' }).trim();
            if (result === 'CANCELLED') return '{"cancelled":true,"selected":null}';
            const [selected, text] = result.split('|');
            return JSON.stringify({ type: 'select_with_text', selected, text: text || '' });
        } catch { return '{"cancelled":true,"selected":null}'; }
    }

    const items = data.options.map(o => `"${escape(o)}"`).join(', ');
    const multi = data.type === 'multi_select' ? 'with multiple selections allowed' : '';
    const cmd = `osascript -e 'choose from list {${items}} with title "${escape(data.title)}" with prompt "${escape(data.message || data.title)}" ${multi}'`;

    try {
        const result = execSync(cmd, { encoding: 'utf8' }).trim();
        if (result === 'false') return '{"cancelled":true,"selected":null}';
        const selected = result.split(', ').map(s => s.trim());
        if (data.type === 'multi_select') {
            return JSON.stringify({ type: 'multi_select', selected });
        }
        return JSON.stringify({ type: 'single_select', selected: selected[0] });
    } catch { return '{"cancelled":true,"selected":null}'; }
}

// ─── Linux: zenity ────────────────────────────────────────────────────────────

function showLinuxDialog(data) {
    const escape = (s) => s.replace(/"/g, '\\"');

    if (data.type === 'text_input') {
        const cmd = `zenity --entry --title="${escape(data.title)}" --text="${escape(data.message || data.title)}" --entry-text="${escape(data.placeholder)}" 2>/dev/null`;
        try {
            const result = execSync(cmd, { encoding: 'utf8' }).trim();
            return JSON.stringify({ type: 'text_input', value: result });
        } catch { return '{"cancelled":true,"selected":null}'; }
    }

    const items = data.options.map(o => `"${escape(o)}"`).join(' ');
    const cmd = `zenity --list --title="${escape(data.title)}" --text="${escape(data.message || data.title)}" --column="Option" ${items} 2>/dev/null`;

    try {
        const result = execSync(cmd, { encoding: 'utf8' }).trim();
        if (!result) return '{"cancelled":true,"selected":null}';
        return JSON.stringify({ type: 'single_select', selected: result });
    } catch { return '{"cancelled":true,"selected":null}'; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const data = parseArgs();
    let result;

    switch (process.platform) {
        case 'win32':
            result = showWindowsDialog(data);
            break;
        case 'darwin':
            result = showMacDialog(data);
            break;
        default:
            result = showLinuxDialog(data);
            break;
    }

    console.log(result);
}

main();
