$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodeBin = Join-Path $runtimeRoot 'node\bin'
$fallbackBin = Join-Path $runtimeRoot 'bin\fallback'
$pnpm = Join-Path $fallbackBin 'pnpm.cmd'

if (-not (Test-Path -LiteralPath $pnpm)) {
  throw 'No se encontró el entorno de ejecución de Codex. Abre este proyecto desde Codex Desktop o instala Node.js y pnpm.'
}

$env:PATH = "$nodeBin;$fallbackBin;$env:PATH"
Set-Location $projectRoot
& $pnpm dev:web
