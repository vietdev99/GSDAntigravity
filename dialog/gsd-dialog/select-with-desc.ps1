# GSD Dialog - Select with Description (split panel with markdown preview)
# Reads dialog data from a JSON file passed as parameter

param(
  [string]$DataFile = ''
)

if (-not $DataFile -or -not (Test-Path $DataFile)) {
  Write-Output '{"cancelled":true,"selected":null,"error":"No data file"}'
  exit 1
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$data = Get-Content $DataFile -Raw -Encoding UTF8 | ConvertFrom-Json

$Title = $data.title
$Message = $data.message
$Options = @($data.options)
$Descriptions = @($data.descriptions)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Convert-MdToHtml($md) {
  $html = $md
  # Bold
  $html = $html -replace '\*\*(.+?)\*\*', '<b>$1</b>'
  # Italic
  $html = $html -replace '\*(.+?)\*', '<i>$1</i>'
  # Inline code
  $html = $html -replace '`([^`]+)`', '<code style="background:#f0f0f5;padding:2px 6px;border-radius:3px;font-size:13px">$1</code>'
  # Headers
  $html = $html -replace '(?m)^### (.+)$', '<h4 style="margin:8px 0 4px;color:#333;font-size:13px">$1</h4>'
  $html = $html -replace '(?m)^## (.+)$', '<h3 style="margin:8px 0 4px;color:#222;font-size:14px">$1</h3>'
  $html = $html -replace '(?m)^# (.+)$', '<h2 style="margin:8px 0 6px;color:#111;font-size:15px">$1</h2>'
  # List items
  $html = $html -replace '(?m)^- (.+)$', '<div style="margin:2px 0;padding-left:15px">&#8226; $1</div>'
  # Line breaks
  $html = $html -replace "`n", '<br>'
  return $html
}

$form = New-Object System.Windows.Forms.Form
$form.Text = $Title
$form.Size = New-Object System.Drawing.Size(650, 460)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

# Header
$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(15, 15)
$label.Size = New-Object System.Drawing.Size(600, 25)
$label.Text = $Message
$form.Controls.Add($label)

# Left: Options list
$listBox = New-Object System.Windows.Forms.ListBox
$listBox.Location = New-Object System.Drawing.Point(15, 45)
$listBox.Size = New-Object System.Drawing.Size(230, 310)
$listBox.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$listBox.Items.AddRange($Options)
$listBox.Add_DoubleClick({
  if ($listBox.SelectedItem) { $form.DialogResult = 'OK'; $form.Close() }
})
$form.Controls.Add($listBox)

# Right: Description header
$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Location = New-Object System.Drawing.Point(260, 45)
$descLabel.Size = New-Object System.Drawing.Size(360, 22)
$descLabel.Text = 'Description'
$descLabel.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
$descLabel.ForeColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
$form.Controls.Add($descLabel)

# Right: WebBrowser for markdown
$browser = New-Object System.Windows.Forms.WebBrowser
$browser.Location = New-Object System.Drawing.Point(260, 70)
$browser.Size = New-Object System.Drawing.Size(360, 285)
$browser.IsWebBrowserContextMenuEnabled = $false
$browser.AllowNavigation = $false
$browser.ScriptErrorsSuppressed = $true
$defaultHtml = '<html><body style="font-family:Segoe UI;font-size:14px;color:#999;margin:15px"><i>Select an option to see its description.</i></body></html>'
$browser.DocumentText = $defaultHtml
$form.Controls.Add($browser)

# Update on selection
$listBox.Add_SelectedIndexChanged({
  $idx = $listBox.SelectedIndex
  if ($idx -ge 0 -and $idx -lt $Descriptions.Count -and $Descriptions[$idx] -ne '') {
    $mdHtml = Convert-MdToHtml $Descriptions[$idx]
    $fullHtml = '<html><body style="font-family:Segoe UI;font-size:14px;color:#222;margin:12px;line-height:1.6">' + $mdHtml + '</body></html>'
    $browser.DocumentText = $fullHtml
  } else {
    $browser.DocumentText = $defaultHtml
  }
})

# Buttons
$okBtn = New-Object System.Windows.Forms.Button
$okBtn.Location = New-Object System.Drawing.Point(430, 370)
$okBtn.Size = New-Object System.Drawing.Size(85, 35)
$okBtn.Text = 'OK'
$okBtn.DialogResult = 'OK'
$form.Controls.Add($okBtn)
$form.AcceptButton = $okBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(525, 370)
$cancelBtn.Size = New-Object System.Drawing.Size(85, 35)
$cancelBtn.Text = 'Cancel'
$cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn)
$form.CancelButton = $cancelBtn

$result = $form.ShowDialog()
if ($result -eq 'OK' -and $listBox.SelectedItem) {
  $sel = $listBox.SelectedItem -replace '"', '\"'
  $idx = $listBox.SelectedIndex
  $desc = ''
  if ($idx -ge 0 -and $idx -lt $Descriptions.Count) {
    $desc = $Descriptions[$idx] -replace '"', '\"'
  }
  Write-Output ('{"type":"select_with_desc","selected":"' + $sel + '","description":"' + $desc + '"}')
} else {
  Write-Output '{"cancelled":true,"selected":null}'
}
