import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Presentation = { id: string; name: string; contentQuantity: string };
type Item = { productId: string; quantity: string; averageCost: string; product: { name: string; baseUnit: string; minStock: string; presentations: Presentation[] } };
type Move = { id: string; occurredAt: string; type: string; quantity: string; quantityAfter: string; notes?: string; referenceType: string };
type NewPresentation = { name: string; contentQuantity: number };

@Component({
  selector: 'ac-inventory-panel', standalone: true, imports: [CommonModule, FormsModule],
  template: `<section class="workspace"><h2>Inventario</h2>
    <h3>Crear producto y presentaciones</h3>
    <form (ngSubmit)="create()"><input name="name" [(ngModel)]="name" placeholder="Nuevo producto" required><select name="unit" [(ngModel)]="unit"><option value="ML">mL</option><option value="G">g</option><option value="UND">Unidad</option></select><input name="min" [(ngModel)]="minStock" type="number" min="0" placeholder="Existencia mínima"><input name="presentationName" [(ngModel)]="presentationName" placeholder="Presentación (ej. Botella 1 L)"><input name="presentationContent" [(ngModel)]="presentationContent" type="number" min="0.0001" step="0.0001" placeholder="Contenido en unidad base"><button type="button" (click)="addPresentation()">Agregar presentación</button><button>Crear producto</button></form>
    @if(newPresentations.length){<table><thead><tr><th>Presentación a crear</th><th>Contenido</th><th></th></tr></thead><tbody>@for(presentation of newPresentations;track presentation.name){<tr><td>{{presentation.name}}</td><td>{{presentation.contentQuantity}} {{unit}}</td><td><button type="button" (click)="removeNewPresentation(presentation.name)">Quitar</button></td></tr>}</tbody></table>}
    <h3>Agregar presentación a un producto existente</h3>
    <form (ngSubmit)="savePresentation()"><select name="presentationProduct" [(ngModel)]="presentationProductId"><option value="" disabled>Producto</option>@for(i of inventory;track i.productId){<option [value]="i.productId">{{i.product.name}}</option>}</select><input name="existingPresentationName" [(ngModel)]="existingPresentationName" placeholder="Presentación (ej. Botella 500 mL)"><input name="existingPresentationContent" [(ngModel)]="existingPresentationContent" type="number" min="0.0001" step="0.0001" placeholder="Contenido en unidad base"><button>Guardar presentación</button></form>
    <h3>Levantamiento y ajustes</h3><form (ngSubmit)="adjust()"><select name="product" [(ngModel)]="adjustProduct"><option value="" disabled>Producto</option>@for(i of inventory;track i.productId){<option [value]="i.productId">{{i.product.name}}</option>}</select><select name="type" [(ngModel)]="adjustType"><option value="INITIAL">Inventario inicial</option><option value="ADJUSTMENT_IN">Entrada de ajuste</option><option value="ADJUSTMENT_OUT">Salida de ajuste</option></select><input name="quantity" [(ngModel)]="adjustQuantity" type="number" min="0.0001" placeholder="Cantidad">@if(adjustType==='INITIAL'){<input name="cost" [(ngModel)]="unitCost" type="number" min="0.000001" placeholder="Costo unitario obligatorio">}<input name="reason" [(ngModel)]="adjustReason" placeholder="Motivo"><button>{{adjustType==='INITIAL'?'Guardar inventario inicial':'Ajustar inventario'}}</button></form>
    <table><thead><tr><th>Producto</th><th>Presentaciones</th><th>Existencia</th><th>Mínimo</th><th>Costo promedio</th><th></th></tr></thead><tbody>@for(i of inventory;track i.productId){<tr [class.low]="isLow(i)"><td>{{i.product.name}}</td><td>{{presentationLabels(i)}}</td><td>{{i.quantity}} {{i.product.baseUnit}}</td><td>{{i.product.minStock||'—'}}</td><td>₡{{i.averageCost}}</td><td><button type="button" (click)="setMinimum(i)">Definir mínimo</button><button type="button" (click)="kardex(i)">Kardex</button></td></tr>}</tbody></table>
    @if(detail){<div class="detail"><h3>Kardex · {{detail.product.name}}</h3>@for(m of movements;track m.id){<p>{{m.occurredAt|slice:0:10}} · {{m.referenceType}} · {{m.quantity}} · saldo {{m.quantityAfter}} · {{m.notes}}</p>}<button (click)="detail=undefined">Cerrar</button></div>}
  </section>`
})
export class InventoryPanelComponent {
  inventory: Item[] = []; name = ''; unit = 'ML'; minStock: number | null = null; presentationName = ''; presentationContent: number | null = null; newPresentations: NewPresentation[] = [];
  presentationProductId = ''; existingPresentationName = ''; existingPresentationContent: number | null = null;
  adjustProduct = ''; adjustType = 'INITIAL'; adjustQuantity: number | null = null; unitCost: number | null = null; adjustReason = 'Levantamiento inicial'; detail?: Item; movements: Move[] = [];
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { this.load(); }
  load() { this.http.get<Item[]>('http://localhost:3000/api/v1/inventory').subscribe(x => { this.inventory = x; this.cdr.detectChanges(); }); }
  addPresentation() {
    if (!this.presentationName.trim() || !this.presentationContent || this.presentationContent <= 0) { window.alert('Indique el nombre y el contenido de la presentación.'); return; }
    if (this.newPresentations.some(item => item.name.trim().toLocaleLowerCase() === this.presentationName.trim().toLocaleLowerCase())) { window.alert('Esta presentación ya fue agregada.'); return; }
    this.newPresentations = [...this.newPresentations, { name: this.presentationName.trim(), contentQuantity: this.presentationContent }]; this.presentationName = ''; this.presentationContent = null;
  }
  removeNewPresentation(name: string) { this.newPresentations = this.newPresentations.filter(item => item.name !== name); }
  create() {
    if (!this.name.trim()) return;
    if (!this.newPresentations.length) { window.alert('Agregue al menos una presentación comercial para el producto.'); return; }
    this.http.post('http://localhost:3000/api/v1/products', { name: this.name, baseUnit: this.unit, minStock: this.minStock ?? 0, presentations: this.newPresentations }).subscribe({ next: () => { this.name = ''; this.minStock = null; this.newPresentations = []; this.load(); }, error: error => window.alert(error.error?.message ?? 'No fue posible crear el producto.') });
  }
  savePresentation() {
    if (!this.presentationProductId || !this.existingPresentationName.trim() || !this.existingPresentationContent) { window.alert('Seleccione el producto e indique la presentación y su contenido.'); return; }
    this.http.post(`http://localhost:3000/api/v1/products/${this.presentationProductId}/presentations`, { name: this.existingPresentationName, contentQuantity: this.existingPresentationContent }).subscribe({ next: () => { this.existingPresentationName = ''; this.existingPresentationContent = null; this.load(); }, error: error => window.alert(error.error?.message ?? 'No fue posible guardar la presentación.') });
  }
  adjust() { const initial = this.adjustType === 'INITIAL'; if (!this.adjustProduct || !this.adjustQuantity || this.adjustReason.trim().length < 3 || (initial && !this.unitCost)) { window.alert(initial ? 'Indique producto, cantidad, costo unitario y motivo.' : 'Indique producto, cantidad y motivo.'); return; } this.http.post('http://localhost:3000/api/v1/inventory/adjustments', { productId: this.adjustProduct, type: initial ? 'ADJUSTMENT_IN' : this.adjustType, quantity: this.adjustQuantity, unitCost: initial ? this.unitCost : undefined, isInitial: initial, reason: this.adjustReason }).subscribe({ next: () => { this.adjustQuantity = null; this.unitCost = null; this.adjustReason = initial ? 'Levantamiento inicial' : ''; this.load(); }, error: error => window.alert(error.error?.message ?? 'No fue posible ajustar el inventario.') }); }
  isLow(i: Item) { return Number(i.product.minStock) > 0 && Number(i.quantity) <= Number(i.product.minStock); }
  presentationLabels(i: Item) { return i.product.presentations.length ? i.product.presentations.map(item => `${item.name} (${item.contentQuantity} ${i.product.baseUnit})`).join(' · ') : 'Sin presentaciones'; }
  setMinimum(i: Item) { const value = window.prompt(`Existencia mínima para ${i.product.name}:`, i.product.minStock); if (value === null) return; const minStock = Number(value); if (!Number.isFinite(minStock) || minStock < 0) return; this.http.patch(`http://localhost:3000/api/v1/products/${i.productId}`, { name: i.product.name, baseUnit: i.product.baseUnit, minStock }).subscribe(() => this.load()); }
  kardex(i: Item) { this.detail = i; this.http.get<Move[]>(`http://localhost:3000/api/v1/inventory/movements?productId=${i.productId}`).subscribe(x => { this.movements = x; this.cdr.detectChanges(); }); }
}
