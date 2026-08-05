# Estado actual de AgroControl

| Fase | Estado |
| --- | --- |
| 1. Datos y rentabilidad | Completada |
| 2. Funciones existentes | Completada |
| 3. Trazabilidad y catálogo | Completada |
| 4. Seguridad y experiencia | No contemplada para esta versión local |
| 5. Reportes y operación | Completada |
| 6. Calidad y entrega | Completada |

## Fase 3 completada

- [x] Verificados tras reiniciar API y web los controles de Catálogos, Ajustes y Anulaciones, incluido el control de Viajes.
- [x] Registrar el usuario de sesión en las auditorías de Compras, Aplicaciones y Ajustes de inventario, además de las anulaciones financieras.
- [x] Crear consulta visual del historial de auditoría (usuario, fecha, motivo, acción y documento).
- [x] Reforzar la validación de ciclo: validar finca y lote activos, y permitir ciclos históricos solo dentro del período entre siembra y retiro.
- [x] Revisar mensajes de anulaciones y ajustes: la interfaz muestra el detalle devuelto por la API y los rechazos incluyen una explicación clara.

## Fase 4 no contemplada

La autenticación JWT obligatoria, roles y permisos se posponen para una versión posterior. Esta versión continuará funcionando de manera local con el inicio de sesión actual.

## Fase 5 completada

- [x] Indicadores en el panel principal.
- [x] Alertas de inventario mínimo configurables por producto.

## Fase 6 completada

- [x] Comando de verificación web actualizado.
- [x] Pruebas unitarias e integración de API ejecutadas; compilación web verificada.
- [x] Documentación de instalación, inicio, respaldo y restauración disponible.
- [x] Rutina de respaldo PostgreSQL creada y comprobada.
- [x] Primer commit de Git creado.
