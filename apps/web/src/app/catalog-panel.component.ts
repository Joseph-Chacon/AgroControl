import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';

type Product = { id: string; name: string; baseUnit: string; isActive: boolean };
type Supplier = { id: string; name: string; phone?: string; email?: string };
type Customer = { id: string; name: string };
type Crop = { id: string; name: string; isActive: boolean };
type Lot = { id: string; name: string; crops: Crop[] };
type Farm = { id: string; name: string; lots: Lot[] };
@Component({
  selector: 'ac-catalog-panel',
  standalone: true,
  imports: [CommonModule],
  template: `<section class="workspace">
    <h2>Administración de catálogos</h2>
    <p>Editar o desactivar conserva el historial; no elimina datos.</p>
    <h3>Productos</h3>
    <table>
      <tbody>
        @for (p of products; track p.id) {
          <tr>
            <td>{{ p.name }} · {{ p.baseUnit }}</td>
            <td><button (click)="editProduct(p)">Editar</button><button (click)="deactivate('products', p.id)">Desactivar</button></td>
          </tr>
        }
      </tbody>
    </table>
    <h3>Proveedores</h3>
    <table>
      <tbody>
        @for (s of suppliers; track s.id) {
          <tr>
            <td>{{ s.name }}</td>
            <td><button (click)="editSupplier(s)">Editar</button><button (click)="deactivate('suppliers', s.id)">Desactivar</button></td>
          </tr>
        }
      </tbody>
    </table>
    <h3>Clientes</h3>
    <table>
      <tbody>
        @for (c of customers; track c.id) {
          <tr>
            <td>{{ c.name }}</td>
            <td>
              <button (click)="editCustomer(c)">Editar</button><button (click)="deactivate('finance/customers', c.id)">Desactivar</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
    <h3>Fincas, lotes y cultivos</h3>
    @for (f of farms; track f.id) {
      <article>
        <strong>{{ f.name }}</strong
        ><button (click)="editName('agriculture/farms', f)">Editar</button
        ><button (click)="deactivate('agriculture/farms', f.id)">Desactivar</button>
        @for (l of f.lots; track l.id) {
          <p>
            {{ l.name }} <button (click)="editName('agriculture/lots', l)">Editar</button
            ><button (click)="deactivate('agriculture/lots', l.id)">Desactivar</button>
          </p>
          @for (c of l.crops; track c.id) {
            <p>
              {{ c.name }} <button (click)="editName('agriculture/crops', c)">Editar</button>
              @if (c.isActive) {
                <button (click)="closeCrop(c.id)">Finalizar</button>
              }
            </p>
          }
        }
      </article>
    }
  </section>`,
  styles: `
    .workspace {
      margin-top: 28px;
      padding: 24px;
      background: #fff;
      border-radius: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e3ece4;
    }
    button {
      margin-left: 6px;
    }
    article {
      margin: 12px 0;
      padding: 10px;
      border: 1px solid #e3ece4;
      border-radius: 8px;
    }
  `,
})
export class CatalogPanelComponent {
  products: Product[] = [];
  suppliers: Supplier[] = [];
  customers: Customer[] = [];
  farms: Farm[] = [];
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.load();
  }
  load() {
    this.http.get<Product[]>('http://localhost:3000/api/v1/products').subscribe((x) => (this.products = x));
    this.http.get<Supplier[]>('http://localhost:3000/api/v1/suppliers').subscribe((x) => (this.suppliers = x));
    this.http.get<Customer[]>('http://localhost:3000/api/v1/finance/customers').subscribe((x) => (this.customers = x));
    this.http.get<Farm[]>('http://localhost:3000/api/v1/agriculture/farms').subscribe((x) => {
      this.farms = x;
      this.cdr.detectChanges();
    });
  }
  deactivate(path: string, id: string) {
    if (!window.confirm('¿Desactivar este registro?')) return;
    this.http.patch(`http://localhost:3000/api/v1/${path}/${id}/deactivate`, {}).subscribe(() => this.load());
  }
  editName(path: string, item: { id: string; name: string }) {
    const name = window.prompt('Nuevo nombre:', item.name);
    if (!name || name.trim().length < 2) return;
    this.http.patch(`http://localhost:3000/api/v1/${path}/${item.id}`, { name }).subscribe(() => this.load());
  }
  editProduct(p: Product) {
    const name = window.prompt('Nombre:', p.name);
    if (!name) return;
    this.http.patch(`http://localhost:3000/api/v1/products/${p.id}`, { name, baseUnit: p.baseUnit }).subscribe(() => this.load());
  }
  editSupplier(s: Supplier) {
    const name = window.prompt('Nombre:', s.name);
    if (!name) return;
    this.http
      .patch(`http://localhost:3000/api/v1/suppliers/${s.id}`, { name, phone: s.phone || '', email: s.email || undefined })
      .subscribe(() => this.load());
  }
  editCustomer(c: Customer) {
    this.editName('finance/customers', c);
  }
  closeCrop(id: string) {
    if (!window.confirm('¿Finalizar este ciclo hoy?')) return;
    this.http
      .patch(`http://localhost:3000/api/v1/agriculture/crops/${id}/remove`, { removedAt: new Date().toISOString() })
      .subscribe(() => this.load());
  }
}
