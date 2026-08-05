param([string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups'))
$ErrorActionPreference = 'Stop'
$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'apps\api\.env'
if (-not (Test-Path $envFile)) { throw 'No se encontró apps\api\.env.' }
$databaseUrl = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
$databaseUrl = $databaseUrl -replace '\?schema=[^&]+', ''
if (-not $databaseUrl) { throw 'DATABASE_URL no está configurada.' }
$pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $pgDump) { throw 'No se encontró pg_dump. Instale las herramientas de PostgreSQL.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$file = Join-Path $OutputDirectory ("agrocontrol-{0}.backup" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
& $pgDump --format=custom --file=$file --dbname=$databaseUrl
if ($LASTEXITCODE -ne 0) { throw 'El respaldo falló.' }
Write-Host "Respaldo creado: $file" -ForegroundColor Green
