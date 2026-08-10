import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Crop = { id: string; name: string; lot: { name: string; farm: { name: string } } };
type Customer = { id: string; name: string };
type Sale = { id: string; code: string; soldAt: string; total: string; crop: Crop; customer?: Customer };

@Component({
  selector: 'ac-sales-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="workspace">
    <h2>Ventas</h2>
    <form (ngSubmit)="save()">
      <select name="crop" [(ngModel)]="cropId" required>
        <option value="" disabled>Seleccione finca · lote · cultivo</option>
        @for (c of crops; track c.id) {
          <option [value]="c.id">{{ c.lot.farm.name }} · {{ c.lot.name }} · {{ c.name }}</option>
        }</select
      ><select name="customer" [(ngModel)]="customerId">
        <option value="">Cliente</option>
        @for (c of customers; track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }</select
      ><input name="soldAt" [(ngModel)]="soldAt" type="date" /><input
        name="total"
        [(ngModel)]="total"
        type="number"
        placeholder="Monto (₡)"
      /><button>Guardar venta</button>
    </form>
    <form (ngSubmit)="createCustomer()">
      <input name="customerName" [(ngModel)]="customerName" placeholder="Nuevo cliente" /><button>Guardar cliente</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Monto</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (s of sales; track s.id) {
          <tr>
            <td>{{ s.code }}</td>
            <td>{{ s.soldAt | slice: 0 : 10 }}</td>
            <td>{{ s.customer?.name || '—' }}</td>
            <td>₡{{ s.total }}</td>
            <td><button type="button" (click)="detail = s">Detalle</button><button type="button" (click)="voidSale(s)">Anular</button></td>
          </tr>
        }
      </tbody>
    </table>
    @if (detail) {
      <div class="detail">
        <h3>{{ detail.code }}</h3>
        <p>{{ detail.crop.lot.farm.name }} · {{ detail.crop.lot.name }} · {{ detail.crop.name }}</p>
        <p>Cliente: {{ detail.customer?.name || 'Sin cliente' }}</p>
        <p>₡{{ detail.total }}</p>
        <button (click)="detail = undefined">Cerrar</button>
      </div>
    }
  </section>`,
})
export class SalesPanelComponent {
  crops: Crop[] = [];
  customers: Customer[] = [];
  sales: Sale[] = [];
  cropId = '';
  customerId = '';
  customerName = '';
  soldAt = new Date().toISOString().slice(0, 10);
  total: number | null = null;
  detail?: Sale;
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.http
      .get<{ name: string; lots: { name: string; crops: Crop[] }[] }[]>('http://localhost:3000/api/v1/agriculture/farms')
      .subscribe((x) => {
        this.crops = x.flatMap((f) => f.lots.flatMap((l) => l.crops.map((c) => ({ ...c, lot: { name: l.name, farm: { name: f.name } } }))));
        this.cdr.detectChanges();
      });
    this.loadCustomers();
    this.load();
  }
  loadCustomers() {
    this.http.get<Customer[]>('http://localhost:3000/api/v1/finance/customers').subscribe((x) => (this.customers = x));
  }
  createCustomer() {
    if (!this.customerName) return;
    this.http.post<Customer>('http://localhost:3000/api/v1/finance/customers', { name: this.customerName }).subscribe((x) => {
      this.customerName = '';
      this.customerId = x.id;
      this.loadCustomers();
    });
  }
  load() {
    this.http.get<Sale[]>('http://localhost:3000/api/v1/finance/sales').subscribe((x) => {
      this.sales = x;
      this.cdr.detectChanges();
    });
  }
  save() {
    if (!this.cropId || !this.total) return;
    this.http
      .post('http://localhost:3000/api/v1/finance/sales', {
        cropId: this.cropId,
        customerId: this.customerId || undefined,
        soldAt: this.soldAt,
        total: this.total,
      })
      .subscribe(() => {
        this.total = null;
        this.load();
      });
  }
  voidSale(sale: Sale) {
    const reason = window.prompt('Motivo de anulación:');
    if (!reason) return;
    if (reason.trim().length < 3) {
      window.alert('El motivo de anulación debe tener al menos 3 caracteres.');
      return;
    }
    this.http.patch(`http://localhost:3000/api/v1/finance/sales/${sale.id}/void`, { reason }).subscribe(() => this.load());
  }
}
