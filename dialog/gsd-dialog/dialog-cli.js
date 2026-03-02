#!/usr/bin/env node
/**
 * GSD Dialog CLI — Native OS Dialogs
 * 
 * Shows native window dialogs for user input.
 * - Windows: PowerShell WinForms (UTF-8)
 * - macOS: osascript (AppleScript)
 * - Linux: zenity
 * 
 * Types:
 *   single_select    — Pick one option
 *   multi_select     — Pick multiple options (Ctrl+Click)
 *   text_input       — Free text input
 *   select_with_text — Pick option + enter text
 *   select_with_desc — Split panel: options list + description preview
 *   confirm          — Yes/No dialog
 * 
 * Usage:
 *   node dialog-cli.js --title "Pick a stack" --options "React,Vue,Svelte"
 *   node dialog-cli.js --title "Enter description" --type text_input
 *   node dialog-cli.js --title "Features" --options "Auth,DB,API" --type multi_select
 *   node dialog-cli.js --title "Config" --options "React,Vue" --type select_with_text
 *   node dialog-cli.js --title "Stack" --options "React::UI library for SPAs|Vue::Progressive framework|Svelte::Compile-time framework" --type select_with_desc
 *   node dialog-cli.js --title "Continue?" --message "Deploy to production?" --type confirm
 * 
 * For select_with_desc, options format: "Name::Description" separated by commas or pipes (|)
 * 
 * Output (stdout JSON):
 *   {"type":"single_select","selected":"React"}
 *   {"type":"text_input","value":"My text"}
 *   {"type":"multi_select","selected":["Auth","API"]}
 *   {"type":"select_with_text","selected":"React","text":"with TypeScript"}
 *   {"type":"select_with_desc","selected":"React","description":"UI library for SPAs"}
 *   {"type":"confirm","confirmed":true}
 * 
 * IMPORTANT: This script blocks until user responds.
 * AI should run it with background mode and poll with command_status:
 *   run_command(cmd, WaitMsBeforeAsync=500)  → get CommandId
 *   command_status(CommandId, WaitDurationSeconds=300)  → wait for result
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
        descriptions: [],
        type: 'single_select',
        placeholder: '',
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--title': case '-t':
                result.title = args[++i] || result.title; break;
            case '--message': case '-m':
                result.message = args[++i] || ''; break;
            case '--options': case '-o':
                parseOptions(args[++i] || '', result); break;
            case '--type':
                result.type = args[++i] || 'single_select'; break;
            case '--placeholder': case '-p':
                result.placeholder = args[++i] || ''; break;
        }
    }

    return result;
}

function parseOptions(raw, result) {
    // Support both comma and pipe separators
    // Format: "React::Description,Vue::Description" or "React::Desc|Vue::Desc"
    const sep = raw.includes('|') ? '|' : ',';
    const items = raw.split(sep).map(s => s.trim()).filter(Boolean);

    for (const item of items) {
        if (item.includes('::')) {
            const [name, desc] = item.split('::').map(s => s.trim());
            result.options.push(name);
            result.descriptions.push(desc);
        } else {
            result.options.push(item);
            result.descriptions.push('');
        }
    }
}

// ─── PowerShell Helpers ───────────────────────────────────────────────────────

const PS_HEADER = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
`;

function psEscape(s) {
    return (s || '').replace(/'/g, "''");
}

function runPowerShell(psScript) {
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

// ─── Windows Dialogs ──────────────────────────────────────────────────────────

function windowsConfirm(data) {
    const ps = `${PS_HEADER}
$result = [System.Windows.Forms.MessageBox]::Show(
  '${psEscape(data.message || data.title)}',
  '${psEscape(data.title)}',
  'YesNo', 'Question')
if ($result -eq 'Yes') {
  Write-Output '{"type":"confirm","confirmed":true}'
} else {
  Write-Output '{"type":"confirm","confirmed":false}'
}`;
    return runPowerShell(ps);
}

function windowsTextInput(data) {
    const ps = `${PS_HEADER}
$form = New-Object System.Windows.Forms.Form
$form.Text = '${psEscape(data.title)}'
$form.Size = New-Object System.Drawing.Size(450, 230)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false; $form.MinimizeBox = $false; $form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(400, 25)
$label.Text = '${psEscape(data.message || data.title)}'
$form.Controls.Add($label)

$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(15, 50)
$textBox.Size = New-Object System.Drawing.Size(400, 30)
$textBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$textBox.Text = '${psEscape(data.placeholder)}'
$form.Controls.Add($textBox)

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(235, 140)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'; $okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn); $form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(330, 140)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'; $cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn); $form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK') {
  $val = $textBox.Text -replace '"', '\\"'
  Write-Output ('{"type":"text_input","value":"' + $val + '"}')
} else { Write-Output '{"cancelled":true,"selected":null}' }`;
    return runPowerShell(ps);
}

function windowsSelectList(data) {
    const optionItems = data.options.map(o => `'${psEscape(o)}'`).join(',');
    const selectionMode = data.type === 'multi_select' ? 'MultiExtended' : 'One';
    const hint = data.type === 'multi_select' ? 'Ctrl+Click to select multiple' : 'Double-click or select + OK';

    const ps = `${PS_HEADER}
$form = New-Object System.Windows.Forms.Form
$form.Text = '${psEscape(data.title)}'
$form.Size = New-Object System.Drawing.Size(420, 420)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false; $form.MinimizeBox = $false; $form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(370, 25)
$label.Text = '${psEscape(data.message || data.title)}'
$form.Controls.Add($label)

$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(15, 45)
$listBox.Size = New-Object System.Drawing.Size(370, 260)
$listBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$listBox.SelectionMode = '${selectionMode}'
$listBox.Items.AddRange(@(${optionItems}))
$listBox.Add_DoubleClick({ if ($listBox.SelectedItem) { $form.DialogResult = 'OK'; $form.Close() } })
$form.Controls.Add($listBox)

$hint = New-Object System.Windows.Forms.Label
$hint.Location = New-Object System.Drawing.Point(15, 310)
$hint.Size = New-Object System.Drawing.Size(200, 20)
$hint.Text = '${hint}'
$hint.ForeColor = [System.Drawing.Color]::Gray
$hint.Font = New-Object System.Drawing.Font('Segoe UI', 8)
$form.Controls.Add($hint)

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(200, 330)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'; $okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn); $form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(295, 330)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'; $cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn); $form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK' -and $listBox.SelectedItems.Count -gt 0) {
  $selected = @($listBox.SelectedItems) | ForEach-Object { '"' + ($_ -replace '"','\\"') + '"' }
  $json = $selected -join ','
  if ('${data.type}' -eq 'multi_select') {
    Write-Output ('{"type":"multi_select","selected":[' + $json + ']}')
  } else {
    Write-Output ('{"type":"single_select","selected":' + $selected[0] + '}')
  }
} else { Write-Output '{"cancelled":true,"selected":null}' }`;
    return runPowerShell(ps);
}

function windowsSelectWithText(data) {
    const optionItems = data.options.map(o => `'${psEscape(o)}'`).join(',');
    const ps = `${PS_HEADER}
$form = New-Object System.Windows.Forms.Form
$form.Text = '${psEscape(data.title)}'
$form.Size = New-Object System.Drawing.Size(420, 460)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false; $form.MinimizeBox = $false; $form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(370, 25)
$label.Text = '${psEscape(data.message || data.title)}'
$form.Controls.Add($label)

$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(15, 45)
$listBox.Size = New-Object System.Drawing.Size(370, 220)
$listBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$listBox.Items.AddRange(@(${optionItems}))
$form.Controls.Add($listBox)

$textLabel = New-Object System.Windows.Forms.Label
$textLabel.Location = New-Object System.Drawing.Point(15, 275)
$textLabel.Size = New-Object System.Drawing.Size(370, 22)
$textLabel.Text = '${psEscape(data.placeholder || 'Additional details (optional):')}'
$textLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($textLabel)

$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = New-Object System.Drawing.Point(15, 300)
$textBox.Size = New-Object System.Drawing.Size(370, 30)
$textBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$form.Controls.Add($textBox)

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(200, 370)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'; $okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn); $form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(295, 370)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'; $cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn); $form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK' -and $listBox.SelectedItem) {
  $sel = $listBox.SelectedItem -replace '"', '\\"'
  $txt = $textBox.Text -replace '"', '\\"'
  Write-Output ('{"type":"select_with_text","selected":"' + $sel + '","text":"' + $txt + '"}')
} else { Write-Output '{"cancelled":true,"selected":null}' }`;
    return runPowerShell(ps);
}

function windowsSelectWithDesc(data) {
    const optionItems = data.options.map(o => `'${psEscape(o)}'`).join(',');
    // Build description array for PowerShell
    const descArray = data.descriptions.map(d => `'${psEscape(d)}'`).join(',');

    const ps = `${PS_HEADER}
$descriptions = @(${descArray})

$form = New-Object System.Windows.Forms.Form
$form.Text = '${psEscape(data.title)}'
$form.Size = New-Object System.Drawing.Size(600, 440)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false; $form.MinimizeBox = $false; $form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(555, 25)
$label.Text = '${psEscape(data.message || data.title)}'
$form.Controls.Add($label)

# Left panel: options list
$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(15, 45)
$listBox.Size = New-Object System.Drawing.Size(250, 290)
$listBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$listBox.Items.AddRange(@(${optionItems}))
$listBox.Add_DoubleClick({ if ($listBox.SelectedItem) { $form.DialogResult = 'OK'; $form.Close() } })
$form.Controls.Add($listBox)

# Right panel: description
$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Location = New-Object System.Drawing.Point(280, 45)
$descLabel.Size = New-Object System.Drawing.Size(290, 25)
$descLabel.Text = 'Description'
$descLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$descLabel.ForeColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
$form.Controls.Add($descLabel)

$descBox = New-Object System.Windows.Forms.TextBox
$descBox.Location = New-Object System.Drawing.Point(280, 75)
$descBox.Size = New-Object System.Drawing.Size(290, 260)
$descBox.Multiline = $true
$descBox.ReadOnly = $true
$descBox.WordWrap = $true
$descBox.ScrollBars = 'Vertical'
$descBox.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$descBox.BackColor = [System.Drawing.Color]::FromArgb(245, 245, 250)
$descBox.BorderStyle = 'FixedSingle'
$descBox.Text = 'Select an option to see its description.'
$form.Controls.Add($descBox)

# Update description on selection change
$listBox.Add_SelectedIndexChanged({
  $idx = $listBox.SelectedIndex
  if ($idx -ge 0 -and $idx -lt $descriptions.Count) {
    $descBox.Text = $descriptions[$idx]
  } else {
    $descBox.Text = ''
  }
})

$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(385, 350)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'; $okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn); $form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(480, 350)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'; $cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn); $form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK' -and $listBox.SelectedItem) {
  $sel = $listBox.SelectedItem -replace '"', '\\"'
  $idx = $listBox.SelectedIndex
  $desc = ''
  if ($idx -ge 0 -and $idx -lt $descriptions.Count) { $desc = $descriptions[$idx] -replace '"', '\\"' }
  Write-Output ('{"type":"select_with_desc","selected":"' + $sel + '","description":"' + $desc + '"}')
} else { Write-Output '{"cancelled":true,"selected":null}' }`;
    return runPowerShell(ps);
}

function showWindowsDialog(data) {
    switch (data.type) {
        case 'confirm': return windowsConfirm(data);
        case 'text_input': return windowsTextInput(data);
        case 'select_with_text': return windowsSelectWithText(data);
        case 'select_with_desc': return windowsSelectWithDesc(data);
        case 'single_select':
        case 'multi_select': return windowsSelectList(data);
        default: return windowsSelectList(data);
    }
}

// ─── macOS: osascript ─────────────────────────────────────────────────────────

function showMacDialog(data) {
    const escape = (s) => (s || '').replace(/"/g, '\\"');

    if (data.type === 'confirm') {
        const cmd = `osascript -e 'set r to button returned of (display dialog "${escape(data.message || data.title)}" with title "${escape(data.title)}" buttons {"No","Yes"} default button "Yes")' -e 'if r is "Yes" then return "yes"' -e 'return "no"'`;
        try {
            const r = execSync(cmd, { encoding: 'utf8' }).trim();
            return JSON.stringify({ type: 'confirm', confirmed: r === 'yes' });
        } catch { return '{"type":"confirm","confirmed":false}'; }
    }

    if (data.type === 'text_input') {
        const cmd = `osascript -e 'set result to text returned of (display dialog "${escape(data.message || data.title)}" default answer "${escape(data.placeholder)}" with title "${escape(data.title)}")' -e 'return result'`;
        try {
            const result = execSync(cmd, { encoding: 'utf8' }).trim();
            return JSON.stringify({ type: 'text_input', value: result });
        } catch { return '{"cancelled":true,"selected":null}'; }
    }

    // For select_with_desc on macOS, fall back to choose from list (no split panel)
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
        if (data.type === 'select_with_desc') {
            const idx = data.options.indexOf(selected[0]);
            return JSON.stringify({ type: 'select_with_desc', selected: selected[0], description: data.descriptions[idx] || '' });
        }
        return JSON.stringify({ type: 'single_select', selected: selected[0] });
    } catch { return '{"cancelled":true,"selected":null}'; }
}

// ─── Linux: zenity ────────────────────────────────────────────────────────────

function showLinuxDialog(data) {
    const escape = (s) => (s || '').replace(/"/g, '\\"');

    if (data.type === 'confirm') {
        const cmd = `zenity --question --title="${escape(data.title)}" --text="${escape(data.message || data.title)}" 2>/dev/null`;
        try { execSync(cmd); return '{"type":"confirm","confirmed":true}'; }
        catch { return '{"type":"confirm","confirmed":false}'; }
    }

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
        return JSON.stringify({ type: data.type.startsWith('select_with') ? data.type : 'single_select', selected: result });
    } catch { return '{"cancelled":true,"selected":null}'; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const data = parseArgs();
    let result;

    switch (process.platform) {
        case 'win32': result = showWindowsDialog(data); break;
        case 'darwin': result = showMacDialog(data); break;
        default: result = showLinuxDialog(data); break;
    }

    console.log(result);
}

main();
