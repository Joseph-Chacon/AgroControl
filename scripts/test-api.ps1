$ErrorActionPreference = 'Stop'
$health = Invoke-RestMethod 'http://localhost:3000/api/v1/health'
if ($health.status -ne 'ok') { throw 'La API no respondió correctamente.' }
$inventory = Invoke-RestMethod 'http://localhost:3000/api/v1/inventory/indicators'
if ($null -eq $inventory.productCount) { throw 'El endpoint de indicadores no respondió correctamente.' }
Write-Host 'Prueba de integración API completada correctamente.' -ForegroundColor Green
