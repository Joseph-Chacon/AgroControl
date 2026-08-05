param([Parameter(Mandatory=$true)][string]$BackupFile)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $BackupFile)) { throw 'No se encontró el archivo de respaldo.' }
$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) 'apps\api\.env'
$databaseUrl = (Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1) -replace '^DATABASE_URL=', ''
$databaseUrl = $databaseUrl -replace '\?schema=[^&]+', ''
$pgRestore = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_restore.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $pgRestore -or -not $databaseUrl) { throw 'No se encontró pg_restore o DATABASE_URL.' }
Write-Warning 'La restauración reemplazará los objetos existentes de AgroControl.'
& $pgRestore --clean --if-exists --no-owner --dbname=$databaseUrl $BackupFile
if ($LASTEXITCODE -ne 0) { throw 'La restauración falló.' }
Write-Host 'Restauración completada.' -ForegroundColor Green
