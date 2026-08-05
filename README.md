# AgroControl

ERP agrícola para administrar una finca con inventario valorizado, aplicaciones, cosechas, ventas, gastos y rentabilidad. La primera versión está enfocada en tomate, pero su modelo soporta cualquier cultivo.

## Propósito

Registrar la operación agrícola con información confiable para tomar decisiones. Toda transacción que afecte existencias deja trazabilidad y todo costo se puede asignar a una aplicación, lote y cultivo.

## Primera versión local para computadora

La primera versión será una aplicación web para computadora, ejecutada localmente. El usuario abrirá Angular en su navegador y trabajará contra la API NestJS y PostgreSQL instalados en el mismo equipo.

La interfaz se mantendrá adaptable para facilitar una futura PWA móvil, pero el registro desde celular, HTTPS público, sincronización y uso sin conexión no forman parte de este primer lanzamiento.

## Arquitectura objetivo

```text
Angular (computadora local)
            |
       localhost HTTP
            |
NestJS REST API + Swagger
            |
 Prisma ORM / PostgreSQL
```

- Backend: NestJS 11 con API REST versionada, DTOs validados y documentación Swagger.
- Datos: PostgreSQL y Prisma; UUID como claves técnicas y códigos consecutivos como claves de negocio.
- Frontend: Angular responsivo con autenticación, control de permisos y PWA.
- Seguridad: JWT de corta duración con renovación, contraseñas protegidas y autorización por rol.

## Invariantes de negocio

1. El inventario se guarda únicamente en la unidad base: `mL`, `g` o `UND`.
2. Las presentaciones solo convierten al ingreso o visualización; no crean existencias independientes.
3. Cada compra recalcula el costo promedio ponderado del producto.
4. Una aplicación descuenta inventario con el costo promedio vigente y conserva el costo unitario histórico en su detalle.
5. Cada variación genera un `MovimientoInventario` con saldo antes, saldo después, referencia y observaciones.
6. `InventoryService` es el único componente autorizado para variar existencias y costos.
7. `SequenceService` es el único componente autorizado para crear códigos como `PRD-000001`.

## Fórmulas de costos

```text
costoPromedioUnitario = valorExistencia / cantidadExistencia
costoDetalleAplicacion = cantidadAplicadaEnUnidadBase * costoPromedioUnitario
costoAplicacion = suma(costoDetalleAplicacion)
costoCultivo = aplicaciones + gastosAsignados + cosechas + otrosCostosAsignados
utilidadNeta = ventasNetas - costoCultivo
rentabilidadPorcentual = (utilidadNeta / ventasNetas) * 100
```

Ejemplo: un litro comprado por ₡10 000 equivale a 1 000 mL y cuesta ₡10/mL. Aplicar 50 mL consume ₡500 y ese monto se registra permanentemente en el detalle de la aplicación.

## Plan de trabajo

El backlog completo y los criterios de terminación están en [docs/ROADMAP.md](docs/ROADMAP.md). Las decisiones de datos y flujos críticos están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
