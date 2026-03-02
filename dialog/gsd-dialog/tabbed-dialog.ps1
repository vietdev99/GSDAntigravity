# GSD Dialog - Tabbed Multi-Question Form
# Input: JSON file with array of questions
# Output: JSON with all answers

param([string]$DataFile = '')

if (-not $DataFile -or -not (Test-Path $DataFile)) {
  Write-Output '{"error":"No data file"}'
  exit 1
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$data = Get-Content $DataFile -Raw -Encoding UTF8 | ConvertFrom-Json
$windowTitle = if ($data.title) { $data.title } else { 'GSD Dialog' }
$questions = @($data.questions)

# ─── Markdown to HTML ──────────────────────────────────────────────────────────

function Convert-MdToHtml($md) {
  $h = $md
  $h = $h -replace '\*\*(.+?)\*\*', '<b>$1</b>'
  $h = $h -replace '\*(.+?)\*', '<i>$1</i>'
  $h = $h -replace '`([^`]+)`', '<code style="background:#eef;padding:1px 5px;border-radius:3px;font-size:13px">$1</code>'
  $h = $h -replace '(?m)^### (.+)$', '<h4 style="margin:8px 0 4px;color:#333">$1</h4>'
  $h = $h -replace '(?m)^## (.+)$', '<h3 style="margin:8px 0 4px;color:#222">$1</h3>'
  $h = $h -replace '(?m)^# (.+)$', '<h2 style="margin:8px 0 6px;color:#111">$1</h2>'
  $h = $h -replace '(?m)^- (.+)$', '<div style="margin:2px 0;padding-left:15px">&#8226; $1</div>'
  $h = $h -replace "`n", '<br>'
  return $h
}

# ─── Build Form ────────────────────────────────────────────────────────────────

$form = New-Object System.Windows.Forms.Form
$form.Text = $windowTitle
$form.Size = New-Object System.Drawing.Size(720, 600)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Location = New-Object System.Drawing.Point(10, 10)
$tabs.Size = New-Object System.Drawing.Size(685, 490)
$tabs.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$controls = @{}

# Global storage for desc panel data (avoids closure issues)
$script:descData = @{}

foreach ($q in $questions) {
  $page = New-Object System.Windows.Forms.TabPage
  $page.Text = if ($q.label) { $q.label } else { $q.id }
  $page.Padding = New-Object System.Windows.Forms.Padding(10)

  $yPos = 10
  $W = 645

  # ── Description (context) ──
  if ($q.description -and $q.description -ne '') {
    $descBox = New-Object System.Windows.Forms.Label
    $descBox.Location = New-Object System.Drawing.Point(10, $yPos)
    $descBox.Size = New-Object System.Drawing.Size($W, 40)
    $descBox.Text = $q.description
    $descBox.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)
    $descBox.ForeColor = [System.Drawing.Color]::FromArgb(80, 80, 80)
    $page.Controls.Add($descBox)
    $yPos += 48
  }

  # ── Question (bold) ──
  $msg = New-Object System.Windows.Forms.Label
  $msg.Location = New-Object System.Drawing.Point(10, $yPos)
  $msg.Size = New-Object System.Drawing.Size($W, 25)
  $msg.Text = if ($q.message) { $q.message } else { $q.label }
  $msg.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
  $page.Controls.Add($msg)
  $yPos += 30

  $qType = if ($q.type) { $q.type } else { 'single_select' }
  $opts = if ($q.options) { @($q.options) } else { @() }
  $descs = if ($q.descriptions) { @($q.descriptions) } else { @() }
  $remain = 455 - $yPos

  switch ($qType) {

    'text_input' {
      $tb = New-Object System.Windows.Forms.TextBox
      $tb.Location = New-Object System.Drawing.Point(10, $yPos)
      $tb.Size = New-Object System.Drawing.Size($W, [Math]::Min(120, $remain))
      $tb.Multiline = $true
      $tb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $tb.ScrollBars = 'Vertical'
      if ($q.placeholder) { $tb.Text = $q.placeholder }
      $page.Controls.Add($tb)
      $controls[$q.id] = @{ type = 'text_input'; control = $tb }
    }

    { $_ -eq 'single_select' -or $_ -eq 'multi_select' } {
      $lbH = $remain - 25
      $lb = New-Object System.Windows.Forms.ListBox
      $lb.Location = New-Object System.Drawing.Point(10, $yPos)
      $lb.Size = New-Object System.Drawing.Size($W, $lbH)
      $lb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $lb.SelectionMode = if ($qType -eq 'multi_select') { 'MultiExtended' } else { 'One' }
      $lb.Items.AddRange($opts)
      $page.Controls.Add($lb)

      if ($qType -eq 'multi_select') {
        $hint = New-Object System.Windows.Forms.Label
        $hint.Location = New-Object System.Drawing.Point(10, ($yPos + $lbH + 3))
        $hint.Size = New-Object System.Drawing.Size(300, 20)
        $hint.Text = 'Ctrl+Click to select multiple'
        $hint.ForeColor = [System.Drawing.Color]::Gray
        $hint.Font = New-Object System.Drawing.Font('Segoe UI', 8)
        $page.Controls.Add($hint)
      }
      $controls[$q.id] = @{ type = $qType; control = $lb }
    }

    'select_with_text' {
      # Single choice OR custom text (mutually exclusive)
      $lbH = $remain - 95
      $lb = New-Object System.Windows.Forms.ListBox
      $lb.Location = New-Object System.Drawing.Point(10, $yPos)
      $lb.Size = New-Object System.Drawing.Size($W, $lbH)
      $lb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $lb.SelectionMode = 'One'
      $lb.Items.AddRange($opts)
      $page.Controls.Add($lb)

      $orLabel = New-Object System.Windows.Forms.Label
      $orLabel.Location = New-Object System.Drawing.Point(10, ($yPos + $lbH + 5))
      $orLabel.Size = New-Object System.Drawing.Size($W, 22)
      $orLabel.Text = if ($q.placeholder) { $q.placeholder } else { 'Or enter your own answer (clears selection above):' }
      $orLabel.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 120)
      $page.Controls.Add($orLabel)

      $tb = New-Object System.Windows.Forms.TextBox
      $tb.Location = New-Object System.Drawing.Point(10, ($yPos + $lbH + 30))
      $tb.Size = New-Object System.Drawing.Size($W, 30)
      $tb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $page.Controls.Add($tb)

      # Mutual exclusion: typing clears listbox, selecting clears textbox
      $tb.Tag = $lb
      $tb.Add_TextChanged({
        if ($this.Text -ne '' -and $this.Focused) {
          $this.Tag.ClearSelected()
        }
      })
      $lb.Tag = $tb
      $lb.Add_SelectedIndexChanged({
        if ($this.SelectedItem -and $this.Focused) {
          $this.Tag.Text = ''
        }
      })

      $controls[$q.id] = @{ type = 'select_with_text'; listbox = $lb; textbox = $tb }
    }

    'multi_select_with_text' {
      # Multiple choice + additional text
      $lbH = $remain - 95
      $lb = New-Object System.Windows.Forms.ListBox
      $lb.Location = New-Object System.Drawing.Point(10, $yPos)
      $lb.Size = New-Object System.Drawing.Size($W, $lbH)
      $lb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $lb.SelectionMode = 'MultiExtended'
      $lb.Items.AddRange($opts)
      $page.Controls.Add($lb)

      $tl = New-Object System.Windows.Forms.Label
      $tl.Location = New-Object System.Drawing.Point(10, ($yPos + $lbH + 5))
      $tl.Size = New-Object System.Drawing.Size($W, 22)
      $tl.Text = if ($q.placeholder) { $q.placeholder } else { 'Additional notes or items (optional):' }
      $tl.ForeColor = [System.Drawing.Color]::FromArgb(120, 120, 120)
      $page.Controls.Add($tl)

      $tb = New-Object System.Windows.Forms.TextBox
      $tb.Location = New-Object System.Drawing.Point(10, ($yPos + $lbH + 30))
      $tb.Size = New-Object System.Drawing.Size($W, 30)
      $tb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $page.Controls.Add($tb)

      $hint = New-Object System.Windows.Forms.Label
      $hint.Location = New-Object System.Drawing.Point(10, ($yPos + $lbH + 62))
      $hint.Size = New-Object System.Drawing.Size(300, 18)
      $hint.Text = 'Ctrl+Click to select multiple'
      $hint.ForeColor = [System.Drawing.Color]::Gray
      $hint.Font = New-Object System.Drawing.Font('Segoe UI', 8)
      $page.Controls.Add($hint)

      $controls[$q.id] = @{ type = 'multi_select_with_text'; listbox = $lb; textbox = $tb }
    }

    'select_with_desc' {
      $pH = $remain
      # Left: options
      $lb = New-Object System.Windows.Forms.ListBox
      $lb.Location = New-Object System.Drawing.Point(10, $yPos)
      $lb.Size = New-Object System.Drawing.Size(250, $pH)
      $lb.Font = New-Object System.Drawing.Font('Segoe UI', 11)
      $lb.Items.AddRange($opts)
      $page.Controls.Add($lb)

      # Right: header
      $dl = New-Object System.Windows.Forms.Label
      $dl.Location = New-Object System.Drawing.Point(275, $yPos)
      $dl.Size = New-Object System.Drawing.Size(370, 20)
      $dl.Text = 'Details'
      $dl.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
      $dl.ForeColor = [System.Drawing.Color]::FromArgb(100, 100, 100)
      $page.Controls.Add($dl)

      # Right: WebBrowser
      $br = New-Object System.Windows.Forms.WebBrowser
      $br.Location = New-Object System.Drawing.Point(275, ($yPos + 23))
      $br.Size = New-Object System.Drawing.Size(370, ($pH - 23))
      $br.IsWebBrowserContextMenuEnabled = $false
      $br.AllowNavigation = $false
      $br.ScriptErrorsSuppressed = $true
      $defaultH = '<html><body style="font-family:Segoe UI;font-size:14px;color:#999;margin:15px"><i>Select an option to see its description.</i></body></html>'
      $br.DocumentText = $defaultH
      $page.Controls.Add($br)

      # Store desc data globally using question ID as key
      $qid = $q.id
      $script:descData[$qid] = @{ browser = $br; descs = $descs; defaultHtml = $defaultH }

      # Use Name property to carry the question ID into the event handler
      $lb.Name = $qid
      $lb.Add_SelectedIndexChanged({
        $qid = $this.Name
        $info = $script:descData[$qid]
        $idx = $this.SelectedIndex
        if ($idx -ge 0 -and $info -and $idx -lt $info.descs.Count -and $info.descs[$idx] -ne '') {
          $mdH = Convert-MdToHtml $info.descs[$idx]
          $info.browser.DocumentText = '<html><body style="font-family:Segoe UI;font-size:14px;color:#222;margin:12px;line-height:1.6">' + $mdH + '</body></html>'
        } elseif ($info) {
          $info.browser.DocumentText = $info.defaultHtml
        }
      })

      $controls[$q.id] = @{ type = 'select_with_desc'; control = $lb; descs = $descs }
    }
  }

  $tabs.TabPages.Add($page)
}

$form.Controls.Add($tabs)

# ─── Submit / Cancel ───────────────────────────────────────────────────────────

$submitBtn = New-Object System.Windows.Forms.Button
$submitBtn.Location = New-Object System.Drawing.Point(475, 510)
$submitBtn.Size = New-Object System.Drawing.Size(110, 40)
$submitBtn.Text = 'Submit'
$submitBtn.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$submitBtn.BackColor = [System.Drawing.Color]::FromArgb(99, 102, 241)
$submitBtn.ForeColor = [System.Drawing.Color]::White
$submitBtn.FlatStyle = 'Flat'
$submitBtn.DialogResult = 'OK'
$form.Controls.Add($submitBtn)
$form.AcceptButton = $submitBtn

$cancelBtn = New-Object System.Windows.Forms.Button
$cancelBtn.Location = New-Object System.Drawing.Point(595, 510)
$cancelBtn.Size = New-Object System.Drawing.Size(95, 40)
$cancelBtn.Text = 'Cancel'
$cancelBtn.Font = New-Object System.Drawing.Font('Segoe UI', 10)
$cancelBtn.DialogResult = 'Cancel'
$form.Controls.Add($cancelBtn)
$form.CancelButton = $cancelBtn

# ─── Show & Collect ────────────────────────────────────────────────────────────

$result = $form.ShowDialog()

if ($result -ne 'OK') {
  Write-Output '{"cancelled":true,"answers":[]}'
  exit 0
}

$answers = @()
foreach ($q in $questions) {
  $c = $controls[$q.id]
  if (-not $c) { continue }
  $answer = @{ id = $q.id; type = $c.type }

  switch ($c.type) {
    'text_input' {
      $answer['value'] = $c.control.Text
    }
    'single_select' {
      $answer['selected'] = if ($c.control.SelectedItem) { $c.control.SelectedItem.ToString() } else { $null }
    }
    'multi_select' {
      $answer['selected'] = @($c.control.SelectedItems | ForEach-Object { $_.ToString() })
    }
    'select_with_text' {
      # Mutually exclusive: selected item OR custom text
      $txt = $c.textbox.Text
      if ($txt -ne '') {
        $answer['selected'] = $null
        $answer['text'] = $txt
      } else {
        $answer['selected'] = if ($c.listbox.SelectedItem) { $c.listbox.SelectedItem.ToString() } else { $null }
        $answer['text'] = ''
      }
    }
    'multi_select_with_text' {
      $answer['selected'] = @($c.listbox.SelectedItems | ForEach-Object { $_.ToString() })
      $answer['text'] = $c.textbox.Text
    }
    'select_with_desc' {
      $sel = if ($c.control.SelectedItem) { $c.control.SelectedItem.ToString() } else { $null }
      $answer['selected'] = $sel
      $idx = $c.control.SelectedIndex
      $answer['description'] = if ($idx -ge 0 -and $idx -lt $c.descs.Count) { $c.descs[$idx] } else { '' }
    }
  }
  $answers += $answer
}

$json = $answers | ConvertTo-Json -Compress
if ($questions.Count -eq 1) { $json = '[' + $json + ']' }
Write-Output ('{"cancelled":false,"answers":' + $json + '}')
