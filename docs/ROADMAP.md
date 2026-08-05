# Hoja de ruta de AgroControl

Cada tarea se considera terminada cuando pasa pruebas automatizadas, está documentada en Swagger cuando expone API, y cuenta con validación funcional en móvil si tiene interfaz.

## Fase 0 - Definición y base técnica

- [ ] Confirmar nombre legal, moneda, zona horaria y unidades admitidas.
- [ ] Definir matriz de permisos por rol.
- [ ] Confirmar campos obligatorios y ciclos de vida de compra, aplicación, cosecha, venta y gasto.
- [x] Crear monorepo con `api`, `web` e infraestructura local.
- [x] Configurar variables de entorno y compilación estricta para API y PWA.
- [ ] Crear PostgreSQL local con Docker y el esquema/migraciones iniciales de Prisma.
- [ ] Configurar OpenAPI/Swagger, manejo uniforme de errores y registro estructurado.

## Fase 1 - Identidad y catálogos

- [ ] Modelo de usuarios, roles y permisos.
- [ ] Registro inicial de administrador, inicio de sesión, renovación y cierre de sesión.
- [ ] Guardas de autenticación y autorización en API.
- [ ] Catálogos de unidades, categorías, marcas, presentaciones, proveedores, clientes, tipos de caja y gastos.
- [ ] Secuencias de código con transacciones y prefijos configurables.
- [ ] Pantallas web responsivas para inicio de sesión y catálogos.

## Fase 2 - Productos, compras e inventario

- [ ] Modelo de producto con unidad base obligatoria y presentaciones de conversión.
- [ ] Gestión de proveedores y productos.
- [ ] Creación de compras con múltiples detalles.
- [ ] Actualización atómica de saldo, último costo y costo promedio ponderado.
- [ ] Movimientos de inventario para compras y ajustes.
- [ ] Consulta de inventario y kardex por producto y fecha.
- [ ] Pruebas de concurrencia y redondeo monetario/cantidades.

## Fase 3 - Estructura agrícola y aplicaciones locales

- [ ] Gestión de fincas, lotes y cultivos con estados y fechas.
- [ ] Modelo de aplicación y detalles por producto.
- [ ] Validación de disponibilidad, descuento atómico y movimiento `APLICACION`.
- [ ] Persistencia del costo promedio usado por cada detalle.
- [ ] Cálculo y consulta del costo total de cada aplicación.
- [ ] Pantalla de aplicación optimizada para navegador de computadora.
- [ ] Confirmación de registro y manejo de errores de conexión local.
- [ ] Pruebas de flujo completo en navegador de computadora.

## Fase 4 - Producción y finanzas

- [ ] Cosechas asociadas al cultivo y lote.
- [ ] Clientes, ventas y sus detalles.
- [ ] Tipos de gasto y gastos asignables a finca, lote o cultivo.
- [ ] Anulación trazable de documentos y ajustes autorizados.
- [ ] Costeo por lote y cultivo.
- [ ] Reportes de ventas, costos, utilidad neta y rentabilidad.

## Fase 5 - Producto listo para producción

- [ ] Dashboard con indicadores operativos y financieros.
- [ ] Preparar la interfaz para una futura adaptación responsiva/PWA.
- [ ] Accesibilidad, validación de formularios y mensajes de error claros.
- [ ] Auditoría de seguridad, límites de solicitudes y copias de respaldo.
- [ ] Automatización de pruebas unitarias, integración y extremo a extremo.
- [ ] Despliegue de API, PostgreSQL administrado, PWA HTTPS y monitoreo.
- [ ] Manual breve para administrador y operario.

## Iteraciones posteriores - Versión móvil y publicación

- [ ] PWA instalable, HTTPS, acceso por internet y registro de aplicaciones desde teléfono.
- [ ] Sincronización offline completa con cola de operaciones e idempotencia.
- [ ] Fotografías y evidencia de aplicaciones/cosechas.
- [ ] Alertas de inventario mínimo y calendario de aplicaciones.
- [ ] Múltiples empresas/fincas y reportes exportables.
- [ ] Aplicación nativa si la PWA no cubre requisitos de cámara, GPS o funcionamiento offline.
