# Arquitectura funcional de AgroControl

## Alcance de la primera versión

La versión inicial permitirá administrar usuarios, catálogos, productos, compras, inventario, fincas, lotes, cultivos y aplicaciones desde una computadora en la red local o en el mismo equipo. Los módulos de cosecha, venta, gasto y reportes completarán el ciclo financiero.

## Roles iniciales

| Rol | Acceso principal |
| --- | --- |
| Administrador | Configuración, usuarios, catálogos, auditoría y todos los módulos. |
| Encargado de finca | Compras, inventario, lotes, cultivos, aplicaciones, cosechas y gastos autorizados. |
| Operario | Consulta de tareas asignadas y registro de aplicaciones propias. |
| Consulta | Reportes y consultas sin modificaciones. |

Los permisos concretos se implementarán como permisos por acción, no solo como validaciones visuales en Angular.

## Entidades centrales

```text
Usuario --< UsuarioRol >-- Rol
Finca --< Lote --< Cultivo
Producto --< Presentacion
Producto --< InventarioProducto --< MovimientoInventario
Proveedor --< Compra --< CompraDetalle >-- Producto
Aplicacion --< AplicacionDetalle >-- Producto
Aplicacion >-- Lote
Cultivo --< Cosecha
Cliente --< Venta --< VentaDetalle
Gasto >-- TipoGasto
```

Las entidades operativas almacenan UUID. Los documentos visibles para el usuario tendrán un código consecutivo inmutable.

## Flujo de compra e inventario

1. Se registra una compra con una o más líneas expresadas en una presentación comercial.
2. Cada línea se convierte a la unidad base del producto.
3. En una transacción de base de datos, se guarda la compra, se actualiza inventario y se genera el movimiento `COMPRA`.
4. El costo promedio se recalcula de forma ponderada:

```text
nuevoCostoPromedio =
 (cantidadAnterior * costoPromedioAnterior + cantidadComprada * costoUnitarioCompra)
 / (cantidadAnterior + cantidadComprada)
```

## Flujo de aplicación local

1. El usuario inicia sesión desde el navegador de la computadora.
2. Elige finca, lote y cultivo activo; luego fecha, observación y los productos usados.
3. Cada cantidad se valida y convierte a unidad base antes de enviarse.
4. La API bloquea los registros de inventario necesarios, valida que exista saldo y toma el `costoPromedio` vigente.
5. En una sola transacción, crea la aplicación, detalles con el costo histórico, movimientos `APLICACION` y los nuevos saldos.
6. La API responde el código de aplicación, cantidades consumidas y costo total. La PWA muestra un comprobante confirmable.

Si se interrumpe la conexión local antes de guardar, no se considera registrada la aplicación. La interfaz conserva el borrador y pide reintento. La sincronización para celular se dejará para una iteración posterior.

## Reglas de consistencia

- No se permiten saldos negativos en la primera versión.
- No se edita una compra o aplicación confirmada que ya afectó existencias; se anula o ajusta mediante un movimiento trazable.
- Los costos almacenados en detalles históricos nunca se recalculan por compras posteriores.
- Los registros de rentabilidad se calculan desde los detalles y gastos asignados, no desde valores manuales.
- Las fechas se guardan en UTC y se muestran en la zona horaria configurada para la finca.

## API inicial

| Área | Rutas principales |
| --- | --- |
| Identidad | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Catálogos | CRUD de categorías, unidades, marcas, proveedores, clientes y tipos de gasto |
| Productos | CRUD de productos y presentaciones |
| Compras | Crear, consultar y anular compras |
| Inventario | Consulta de saldo, costo promedio y movimientos |
| Operación agrícola | CRUD de fincas, lotes y cultivos; crear/consultar/anular aplicaciones |
| Finanzas | Cosechas, ventas, gastos y reportes de costos/rentabilidad |

## Seguridad y operación

- Desarrollo local mediante `localhost`; HTTPS será obligatorio al publicar una futura versión en red o móvil.
- Contraseñas con hash robusto; nunca se almacenan ni registran en texto plano.
- JWT y guardas de roles/permisos en todas las rutas protegidas.
- CORS limitado al dominio de la PWA.
- Migraciones Prisma, respaldos de PostgreSQL, registro de errores y auditoría de acciones sensibles.
