$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$pnpm = Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd'
if (-not (Test-Path -LiteralPath $pnpm)) { throw 'No se encontró pnpm. Abra el proyecto en Codex Desktop o instale Node.js y pnpm.' }
Set-Location $projectRoot
& $pnpm --filter @agrocontrol/web test
