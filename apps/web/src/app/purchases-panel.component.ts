import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Supplier = { id: string; name: string };
type Presentation = { id: string; name: string; contentQuantity: string };
type Product = { productId: string; product: { name: string; baseUnit: string; presentations: Presentation[] } };
type Line = { presentationId: string; name: string; presentationName: string; baseUnit: string; packageQuantity: number; quantity: number; totalCost: number };
type Purchase = { id: string; code: string; receivedAt: string; total: string; supplier: Supplier; items: { product: { name: string; baseUnit: string }; presentation?: Presentation; packageQuantity?: string; quantity: string; totalCost: string }[] };
type SupplierReport = { id: string; name: string; purchaseCount: number; totalPurchased: string };

@Component({
  selector: 'ac-purchases-panel', standalone: true, imports: [CommonModule, FormsModule],
  template: `<section class="workspace">
    <h2>Registrar compra</h2>
    <form (ngSubmit)="addLine()">
      <select name="supplier" [(ngModel)]="supplierId" required><option value="" disabled>Seleccione un proveedor</option>@for(supplier of suppliers;track supplier.id){<option [value]="supplier.id">{{supplier.name}}</option>}</select>
      <select name="product" [(ngModel)]="productId" (ngModelChange)="presentationId=''" required><option value="" disabled>Producto</option>@for(product of inventory;track product.productId){<option [value]="product.productId">{{product.product.name}}</option>}</select>
      <select name="presentation" [(ngModel)]="presentationId" required><option value="" disabled>Presentación</option>@for(presentation of selectedProduct?.product?.presentations ?? [];track presentation.id){<option [value]="presentation.id">{{presentation.name}} · {{presentation.contentQuantity}} {{selectedProduct?.product?.baseUnit}}</option>}</select>
      <input name="packages" [(ngModel)]="packageQuantity" type="number" min="0.0001" step="0.0001" placeholder="Envases" required>
      <input name="totalCost" [(ngModel)]="totalCost" type="number" min="0.01" step="0.01" placeholder="Costo total (₡)" required>
      <button>Agregar producto</button>
    </form>
    @if (!selectedProduct && inventory.length) { <p class="status">Seleccione el producto y luego su presentación comercial.</p> }
    <table><thead><tr><th>Producto</th><th>Presentación</th><th>Envases</th><th>Entrada a inventario</th><th>Costo</th><th></th></tr></thead><tbody>
      @for(line of lines;track line.presentationId){<tr><td>{{line.name}}</td><td>{{line.presentationName}}</td><td>{{line.packageQuantity}}</td><td>{{line.quantity}} {{line.baseUnit}}</td><td>₡{{line.totalCost}}</td><td><button type="button" (click)="remove(line.presentationId)">Quitar</button></td></tr>}
    </tbody></table>
    <p><strong>Total de compra: ₡{{total}}</strong></p><button [disabled]="!supplierId||!lines.length" (click)="save()">Guardar compra</button>
    <h3>Compras registradas</h3><table><thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Total</th><th></th></tr></thead><tbody>@for(purchase of purchases;track purchase.id){<tr><td>{{purchase.code}}</td><td>{{purchase.receivedAt|slice:0:10}}</td><td>{{purchase.supplier.name}}</td><td>₡{{purchase.total}}</td><td><button type="button" (click)="detail=purchase">Ver detalle</button><button type="button" (click)="voidPurchase(purchase)">Anular</button></td></tr>}</tbody></table>
    <h3>Compras por proveedor</h3><table><thead><tr><th>Proveedor</th><th>Compras</th><th>Total comprado</th></tr></thead><tbody>@for(item of supplierReport;track item.id){<tr><td>{{item.name}}</td><td>{{item.purchaseCount}}</td><td>₡{{item.totalPurchased}}</td></tr>}</tbody></table>
    @if(detail){<div class="detail"><h3>{{detail.code}} · {{detail.supplier.name}}</h3>@for(item of detail.items;track item.product.name + item.quantity){<p>{{item.product.name}} · {{item.presentation?.name || 'Presentación anterior'}}: {{item.packageQuantity || 1}} envase(s) · {{item.quantity}} {{item.product.baseUnit}} · ₡{{item.totalCost}}</p>}<button type="button" (click)="detail=undefined">Cerrar</button></div>}
  </section>`
})
export class PurchasesPanelComponent {
  suppliers: Supplier[] = []; inventory: Product[] = []; purchases: Purchase[] = []; supplierReport: SupplierReport[] = []; lines: Line[] = [];
  supplierId = ''; productId = ''; presentationId = ''; packageQuantity = 1; totalCost: number | null = null; detail?: Purchase;
  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.http.get<Supplier[]>('http://localhost:3000/api/v1/suppliers').subscribe(x => { this.suppliers = x; this.cdr.detectChanges(); });
    this.http.get<Product[]>('http://localhost:3000/api/v1/inventory').subscribe(x => { this.inventory = x; this.cdr.detectChanges(); });
    this.load();
  }
  get selectedProduct() { return this.inventory.find(item => item.productId === this.productId); }
  get selectedPresentation() { return this.selectedProduct?.product.presentations.find(item => item.id === this.presentationId); }
  get total() { return this.lines.reduce((sum, line) => sum + line.totalCost, 0); }
  addLine() {
    const product = this.selectedProduct; const presentation = this.selectedPresentation;
    if (!product || !presentation || !this.packageQuantity || !this.totalCost || this.lines.some(line => line.presentationId === presentation.id)) return;
    this.lines = [...this.lines, { presentationId: presentation.id, name: product.product.name, presentationName: presentation.name, baseUnit: product.product.baseUnit, packageQuantity: this.packageQuantity, quantity: Number(presentation.contentQuantity) * this.packageQuantity, totalCost: this.totalCost }];
    this.presentationId = ''; this.packageQuantity = 1; this.totalCost = null;
  }
  remove(presentationId: string) { this.lines = this.lines.filter(line => line.presentationId !== presentationId); }
  load() {
    this.http.get<Purchase[]>('http://localhost:3000/api/v1/purchases').subscribe(x => { this.purchases = x; this.cdr.detectChanges(); });
    this.http.get<SupplierReport[]>('http://localhost:3000/api/v1/purchases/report/by-supplier').subscribe(x => { this.supplierReport = x; this.cdr.detectChanges(); });
  }
  save() {
    if (!this.supplierId || !this.lines.length) return;
    this.http.post('http://localhost:3000/api/v1/purchases', { supplierId: this.supplierId, items: this.lines.map(line => ({ presentationId: line.presentationId, packageQuantity: line.packageQuantity, totalCost: line.totalCost })) }).subscribe({ next: () => { this.lines = []; this.load(); }, error: error => window.alert(error.error?.message ?? 'No fue posible guardar la compra.') });
  }
  voidPurchase(purchase: Purchase) { const reason = window.prompt(`Motivo para anular ${purchase.code}:`); if (!reason || reason.trim().length < 3) return; this.http.patch(`http://localhost:3000/api/v1/purchases/${purchase.id}/void`, { reason }).subscribe({ next: () => this.load(), error: error => window.alert(error.error?.message ?? 'No fue posible anular la compra.') }); }
}
