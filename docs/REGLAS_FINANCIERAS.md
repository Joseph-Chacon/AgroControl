# Reglas financieras de ciclos de cultivo

## Unidad de cálculo

Cada **cultivo/ciclo** es la unidad financiera del sistema. Un lote puede reutilizarse para nuevos cultivos; por ello, aplicaciones, viajes, cosechas, gastos, ventas y reportes se consultan por `cultivo`, nunca mezclando ciclos anteriores del mismo lote.

## Producción y precios

1. La cosecha se registra el día de la corta, con cajas por calidad.
2. El precio por caja puede quedar pendiente.
3. Al registrar los precios, el sistema calcula el valor de cosecha como `cajas × precio por caja`.
4. Ese valor forma la **ganancia estimada** al restar aplicaciones, gastos y transporte del mismo ciclo.

## Pagos y ventas

1. Una venta registrada es un pago/ingreso real del cultivo. Se pueden registrar varias ventas para soportar pagos parciales.
2. Si hay una o más ventas registradas, la suma de sus montos es el ingreso usado para la **ganancia realizada**.
3. Si no hay ventas registradas, los precios confirmados de la cosecha se usan como ingreso realizado. Esto cubre el caso en que el pago se liquida directamente por cajas y calidad.
4. Nunca se suman precios de cosecha y ventas en el mismo reporte: las ventas tienen prioridad cuando existen, para evitar duplicar ingresos.

## Rango de fechas

Los filtros por período usan la fecha propia de cada registro:

- Aplicación: fecha de aplicación.
- Viaje: fecha del viaje.
- Cosecha: fecha de corta.
- Venta: fecha de venta/pago.
- Gasto: fecha del gasto.
