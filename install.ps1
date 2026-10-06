# Install or update these Claude Code add-ons on Windows.
#   irm https://raw.githubusercontent.com/henripper/claude-addons/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$RepoUrl = if ($env:CLAUDE_ADDONS_REPO) { $env:CLAUDE_ADDONS_REPO } else { 'https://github.com/henripper/claude-addons.git' }
$Dest = Join-Path $HOME '.claude\mods'

if (Test-Path (Join-Path $Dest '.git')) { git -C $Dest pull --ff-only }
else { git clone $RepoUrl $Dest }

# Point Claude Code at every add-on folder (each has .claude-plugin\plugin.json).
$dirs = Get-ChildItem $Dest -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName '.claude-plugin\plugin.json') } |
  ForEach-Object { $_.FullName }

$settingsPath = Join-Path $HOME '.claude\settings.json'
$settings = if (Test-Path $settingsPath) { Get-Content $settingsPath -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
if (-not $settings.PSObject.Properties['env']) { $settings | Add-Member env ([pscustomobject]@{}) }
$settings.env | Add-Member CLAUDE_CODE_PLUGIN_DIRS ($dirs -join ';') -Force
$settings | ConvertTo-Json -Depth 20 | Set-Content $settingsPath -Encoding UTF8
Write-Host "Enabled: $($dirs | ForEach-Object { Split-Path $_ -Leaf })"
Write-Host 'Done. Start a new Claude Code session to load them.'
