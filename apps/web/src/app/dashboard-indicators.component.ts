import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';

type LowStock = { productId: string; name: string; quantity: string; minStock: string; baseUnit: string };
type Indicators = { productCount: number; activeCrops: number; inventoryValue: string; lowStock: LowStock[] };

@Component({
  selector: 'ac-dashboard-indicators', standalone: true, imports: [CommonModule],
  template: `<section class="indicators"><div class="heading"><div><p class="eyebrow">RESUMEN OPERATIVO</p><h2>Indicadores</h2></div><button type="button" (click)="load()">Actualizar</button></div>@if(data){<div class="metrics"><article><small>Productos activos</small><strong>{{data.productCount}}</strong></article><article><small>Cultivos activos</small><strong>{{data.activeCrops}}</strong></article><article><small>Valor del inventario</small><strong>₡{{data.inventoryValue}}</strong></article><article [class.alert-card]="data.lowStock.length"><small>Alertas de inventario</small><strong>{{data.lowStock.length}}</strong></article></div>@if(data.lowStock.length){<div class="low"><strong>Reponer inventario</strong><ul>@for(item of data.lowStock;track item.productId){<li>{{item.name}}: {{item.quantity}} {{item.baseUnit}} <span>(mínimo {{item.minStock}})</span></li>}</ul></div>}@else{<p class="ok">No hay productos por debajo del mínimo configurado.</p>}}</section>`,
  styles: `.indicators{margin-top:28px;padding:24px;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgb(18 63 34 / 10%)}.heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.heading h2{margin:4px 0}.heading button{padding:10px 14px;border:0;border-radius:9px;background:#eaf6ed;color:#1f6339;font:inherit;font-weight:700;cursor:pointer}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px}.metrics article{padding:16px;border-radius:12px;background:#f3f8f3}.metrics small,.metrics strong{display:block}.metrics small{color:#52725c}.metrics strong{margin-top:5px;color:#153b24;font-size:1.45rem}.alert-card{background:#fff3df!important}.low{margin-top:16px;padding:14px 16px;border-radius:12px;background:#fff3df;color:#754400}.low ul{margin:8px 0 0;padding-left:20px}.low span{color:#8d6932}.ok{margin:16px 0 0;color:#1f6339}@media(max-width:700px){.metrics{grid-template-columns:repeat(2,1fr)}}`
})
export class DashboardIndicatorsComponent {
  data?: Indicators;
  constructor(private readonly http: HttpClient, private readonly cdr: ChangeDetectorRef) { this.load(); }
  load() { this.http.get<Indicators>('http://localhost:3000/api/v1/inventory/indicators').subscribe(data => { this.data = data; this.cdr.detectChanges(); }); }
}
