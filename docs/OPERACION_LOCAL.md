# Operación local de AgroControl

## Inicio

Abra dos PowerShell en la carpeta del proyecto y ejecute:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-api.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\start-web.ps1
```

Abra `http://localhost:4200`. Swagger está disponible en `http://localhost:3000/api/docs`.

## Verificación

```powershell
.\scripts\test-web.ps1
pnpm --filter @agrocontrol/api test
.\scripts\test-api.ps1
```

La prueba de API requiere que la API esté iniciada. La verificación web compila la interfaz para detectar errores de navegador antes de publicar cambios.

## Respaldo y restauración

Antes de actualizar la aplicación, cierre los registros abiertos y cree un respaldo:

```powershell
.\scripts\backup-postgres.ps1
```

El archivo se guarda en `backups\` y no se incluye en Git. Para restaurar, detenga la API y ejecute:

```powershell
.\scripts\restore-postgres.ps1 -BackupFile .\backups\agrocontrol-AAAAMMDD-HHMMSS.backup
```

Realice un respaldo diario y conserve al menos 7 copias. Pruebe periódicamente una restauración en una base de datos de prueba.
