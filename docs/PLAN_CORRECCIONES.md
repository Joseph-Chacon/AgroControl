# Plan de correcciones y consolidación de AgroControl

Este plan no contempla nuevos módulos. Su objetivo es corregir, completar y asegurar los módulos existentes antes de ampliar el sistema.

## Estado actual

| Fase | Estado | Resumen |
| --- | --- | --- |
| Fase 1 | Completada | Reportes por ciclo, fechas operativas y reglas de ingresos. |
| Fase 2 | En progreso | Gastos, clientes, compras múltiples, historial y kardex terminados; faltan detalles consultables en todos los documentos. |
| Fase 3 | En progreso | Auditoría y anulaciones en API; Compras y Cosechas ya pueden anularse desde interfaz. |
| Fases 4 a 6 | Pendientes | Seguridad, reportes operativos, pruebas, documentación y respaldos. |

## Fase 1 — Correcciones de datos y rentabilidad

- [x] Cambiar el reporte para que consulte por **ciclo de cultivo** además de lote; un lote puede tener varios ciclos históricos y no se deben mezclar sus costos, cosechas e ingresos.
- [x] Ajustar el selector de Reportes para enviar el identificador del cultivo seleccionado, no solo el del lote.
- [x] Agregar filtros de reporte por finca, lote, cultivo y rango de fechas.
- [x] Corregir Viajes para enviar, guardar y mostrar la fecha seleccionada por el usuario.
- [x] Agregar fecha de aplicación al formulario de Aplicaciones y conservarla en el historial.
- [x] Permitir escoger la fecha real de retiro de matas al cerrar un cultivo.
- [x] Definir el flujo definitivo de ingresos: precio confirmado de cosecha, venta registrada y pagos parciales, evitando duplicar ingresos.
- [x] Diseñar la relación entre cosecha, liquidación y venta para soportar varios pagos de una misma cosecha.
- [x] Revisar fórmulas de costo, ingreso, ganancia estimada, ganancia realizada y porcentajes de rentabilidad.

**Terminado cuando:** cada reporte de un cultivo muestra únicamente sus propios registros y las fechas/ganancias coinciden con los documentos registrados.

## Fase 2 — Completar funciones ya existentes

- [x] Crear la pantalla para registrar gastos existentes en la API, vinculados al cultivo y con fecha, descripción y monto.
- [x] Incorporar el costo de gastos en reportes de cultivo, lote y finca.
- [x] Crear la interfaz de clientes que ya existen en la base de datos y permitir asociarlos a las ventas.
- [x] Ampliar Ventas para registrar cliente, fecha, cultivo, monto y detalle de liquidación cuando corresponda.
- [x] Permitir crear una compra con varias líneas de productos en una sola factura, como la API ya admite.
- [x] Mostrar historial de compras y consulta/resumen de compras por proveedor.
- [x] Mostrar el kardex de movimientos de cada producto desde Inventario.
- [ ] Permitir consultar el detalle de compras, aplicaciones, cosechas, viajes y ventas mediante modal.

**Terminado cuando:** los datos que ya existen en la API pueden ser registrados y consultados desde la interfaz sin usar Swagger.

## Fase 3 — Corrección, trazabilidad y catálogo

- [ ] Agregar edición y desactivación controlada de productos, proveedores, clientes, fincas, lotes y cultivos.
- [ ] Crear anulaciones trazables para compras, aplicaciones, cosechas, viajes y ventas; no editar documentos que ya afectaron costos o inventario.
- [ ] Agregar ajustes controlados de inventario con motivo y movimiento de kardex.
- [ ] Registrar usuario, fecha y motivo en anulaciones y ajustes.
- [ ] Validar que un viaje, gasto, venta o cosecha pertenezca al cultivo y ciclo correcto.
- [ ] Evitar registros duplicados de producto dentro de compras, aplicaciones y ajustes.

**Terminado cuando:** cualquier corrección deja un historial verificable y nunca altera silenciosamente los costos históricos.

## Fase 4 — Seguridad y experiencia de uso

- [ ] Proteger todas las rutas de la API con autenticación JWT.
- [ ] Enviar automáticamente el token desde la interfaz en cada solicitud.
- [ ] Implementar permisos por rol: administrador, encargado, operario y consulta.
- [ ] Ocultar y bloquear acciones no permitidas según el rol.
- [ ] Unificar mensajes de carga, éxito y error para todos los formularios.
- [ ] Validar formularios antes de enviar y explicar el campo que falta o es inválido.
- [ ] Estandarizar estilos de formularios, tablas, botones, modales y estados vacíos.
- [ ] Separar la lógica del panel principal en componentes y servicios mantenibles.

**Terminado cuando:** un usuario no autorizado no puede consultar ni modificar datos y todos los flujos comunican claramente su resultado.

## Fase 5 — Reportes y operación diaria

- [ ] Agregar resumen por finca, lote, cultivo y período: producción, cajas por calidad, costos, ingresos y utilidad.
- [ ] Incorporar filtros por fecha a inventario, compras, aplicaciones, cosechas, viajes, ventas y gastos.
- [ ] Agregar exportación de reportes a Excel y PDF.
- [ ] Crear indicadores en el panel principal: inventario bajo, costo por cultivo, producción, ingresos y utilidad.
- [ ] Agregar alertas de inventario mínimo, sin crear un módulo nuevo.

**Terminado cuando:** el administrador puede revisar la operación y rentabilidad sin calcular datos fuera del sistema.

## Fase 6 — Calidad, documentación y respaldo

- [ ] Corregir el comando de pruebas de la interfaz (`ng test --watch=false` no es válido en la versión actual).
- [ ] Crear pruebas unitarias para fórmulas, inventario, aplicaciones, cosechas, pagos y reportes.
- [ ] Crear pruebas de integración para compras, descuento de inventario y rentabilidad.
- [ ] Crear pruebas de navegador para los flujos principales.
- [ ] Actualizar `docs/ROADMAP.md` y `docs/ARQUITECTURA.md` con el estado real del proyecto.
- [ ] Documentar instalación, inicio de API/web, respaldo y restauración de PostgreSQL.
- [ ] Definir y probar una rutina de copias de seguridad de la base de datos.
- [ ] Crear el primer commit de Git y establecer una práctica de commits por corrección terminada.

**Terminado cuando:** el proyecto se puede instalar, verificar, respaldar y mantener de forma segura.

## Orden recomendado de ejecución

1. Fase 1: datos y cálculos correctos.
2. Fase 2: completar pantallas para datos existentes.
3. Fase 3: trazabilidad y correcciones seguras.
4. Fase 4: seguridad y experiencia de uso.
5. Fase 5: reportes operativos.
6. Fase 6: pruebas, documentación y respaldo.
