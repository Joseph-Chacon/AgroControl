import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
type Supplier = { id: string; name: string };
type Product = { productId: string; product: { name: string; baseUnit: string } };
type Line = { productId: string; name: string; quantity: number; totalCost: number };
type Purchase = {
  id: string;
  code: string;
  receivedAt: string;
  total: string;
  supplier: Supplier;
  items: { product: { name: string; baseUnit: string }; quantity: string; totalCost: string }[];
};
type SupplierReport = { id: string; name: string; purchaseCount: number; totalPurchased: string };
@Component({
  selector: 'ac-purchases-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="workspace">
    <h2>Registrar compra</h2>
    <form (ngSubmit)="addLine()">
      <select name="supplier" [(ngModel)]="supplierId" required>
        <option value="" disabled>Seleccione un proveedor</option>
        @for (supplier of suppliers; track supplier.id) {
          <option [value]="supplier.id">{{ supplier.name }}</option>
        }</select
      ><select name="product" [(ngModel)]="productId">
        <option value="" disabled>Producto</option>
        @for (product of inventory; track product.productId) {
          <option [value]="product.productId">{{ product.product.name }} ({{ product.product.baseUnit }})</option>
        }</select
      ><input name="quantity" [(ngModel)]="quantity" type="number" min="0.0001" placeholder="Cantidad" /><input
        name="totalCost"
        [(ngModel)]="totalCost"
        type="number"
        min="0.01"
        placeholder="Costo total (₡)"
      /><button>Agregar producto</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Costo</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (line of lines; track line.productId) {
          <tr>
            <td>{{ line.name }}</td>
            <td>{{ line.quantity }}</td>
            <td>₡{{ line.totalCost }}</td>
            <td><button type="button" (click)="remove(line.productId)">Quitar</button></td>
          </tr>
        }
      </tbody>
    </table>
    <p>
      <strong>Total de compra: ₡{{ total }}</strong>
    </p>
    <button [disabled]="!supplierId || !lines.length" (click)="save()">Guardar compra</button>
    <h3>Compras registradas</h3>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Fecha</th>
          <th>Proveedor</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (purchase of purchases; track purchase.id) {
          <tr>
            <td>{{ purchase.code }}</td>
            <td>{{ purchase.receivedAt | slice: 0 : 10 }}</td>
            <td>{{ purchase.supplier.name }}</td>
            <td>₡{{ purchase.total }}</td>
            <td>
              <button type="button" (click)="detail = purchase">Ver detalle</button
              ><button type="button" (click)="voidPurchase(purchase)">Anular</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
    <h3>Compras por proveedor</h3>
    <table>
      <thead>
        <tr>
          <th>Proveedor</th>
          <th>Compras</th>
          <th>Total comprado</th>
        </tr>
      </thead>
      <tbody>
        @for (item of supplierReport; track item.id) {
          <tr>
            <td>{{ item.name }}</td>
            <td>{{ item.purchaseCount }}</td>
            <td>₡{{ item.totalPurchased }}</td>
          </tr>
        }
      </tbody>
    </table>
    @if (detail) {
      <div class="detail">
        <h3>{{ detail.code }} · {{ detail.supplier.name }}</h3>
        @for (item of detail.items; track item.product.name) {
          <p>{{ item.product.name }}: {{ item.quantity }} {{ item.product.baseUnit }} · ₡{{ item.totalCost }}</p>
        }
        <button type="button" (click)="detail = undefined">Cerrar</button>
      </div>
    }
  </section>`,
  styles: `
    .workspace {
      margin-top: 28px;
      padding: 24px;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 8px 24px rgb(18 63 34 / 10%);
    }
    form {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 1fr auto;
      gap: 10px;
    }
    input,
    select {
      padding: 10px;
      border: 1px solid #bed1c1;
      border-radius: 8px;
    }
    table {
      width: 100%;
      margin: 14px 0;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e3ece4;
    }
    @media (max-width: 800px) {
      form {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PurchasesPanelComponent {
  suppliers: Supplier[] = [];
  inventory: Product[] = [];
  purchases: Purchase[] = [];
  supplierReport: SupplierReport[] = [];
  lines: Line[] = [];
  supplierId = '';
  productId = '';
  quantity: number | null = null;
  totalCost: number | null = null;
  detail?: Purchase;
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.http.get<Supplier[]>('http://localhost:3000/api/v1/suppliers').subscribe((x) => {
      this.suppliers = x;
      this.cdr.detectChanges();
    });
    this.http.get<Product[]>('http://localhost:3000/api/v1/inventory').subscribe((x) => (this.inventory = x));
    this.load();
  }
  get total() {
    return this.lines.reduce((sum, line) => sum + line.totalCost, 0);
  }
  addLine() {
    const product = this.inventory.find((x) => x.productId === this.productId);
    if (!product || !this.quantity || !this.totalCost || this.lines.some((x) => x.productId === product.productId)) return;
    this.lines = [
      ...this.lines,
      { productId: product.productId, name: product.product.name, quantity: this.quantity, totalCost: this.totalCost },
    ];
    this.quantity = null;
    this.totalCost = null;
  }
  remove(productId: string) {
    this.lines = this.lines.filter((x) => x.productId !== productId);
  }
  load() {
    this.http.get<Purchase[]>('http://localhost:3000/api/v1/purchases').subscribe((x) => {
      this.purchases = x;
      this.cdr.detectChanges();
    });
    this.http.get<SupplierReport[]>('http://localhost:3000/api/v1/purchases/report/by-supplier').subscribe((x) => {
      this.supplierReport = x;
      this.cdr.detectChanges();
    });
  }
  save() {
    if (!this.supplierId || !this.lines.length) return;
    this.http
      .post('http://localhost:3000/api/v1/purchases', {
        supplierId: this.supplierId,
        items: this.lines.map((x) => ({ productId: x.productId, quantity: x.quantity, totalCost: x.totalCost })),
      })
      .subscribe(() => {
        this.lines = [];
        this.load();
      });
  }
  voidPurchase(purchase: Purchase) {
    const reason = window.prompt(`Motivo para anular ${purchase.code}:`);
    if (!reason || reason.trim().length < 3) return;
    this.http.patch(`http://localhost:3000/api/v1/purchases/${purchase.id}/void`, { reason }).subscribe(() => this.load());
  }
}
