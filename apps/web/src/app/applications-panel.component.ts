import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
type Crop = { lotId: string; cropId: string; label: string };
type Inv = { productId: string; averageCost: string; product: { name: string; baseUnit: string } };
type Line = { productId: string; name: string; quantity: number; cost: number };
type App = {
  id: string;
  code: string;
  appliedAt: string;
  totalCost: string;
  lot: { name: string; farm: { name: string } };
  crop?: { name: string };
  items: { product: { name: string; baseUnit: string }; quantity: string; totalCost: string }[];
};
@Component({
  selector: 'ac-applications-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="workspace">
    <h2>Aplicaciones</h2>
    <form (ngSubmit)="add()">
      <select name="crop" [(ngModel)]="cropId">
        <option value="" disabled>Finca · lote · cultivo</option>
        @for (c of crops; track c.cropId) {
          <option [value]="c.cropId">{{ c.label }}</option>
        }</select
      ><input name="date" [(ngModel)]="appliedAt" type="date" /><select name="product" [(ngModel)]="productId">
        <option value="" disabled>Producto</option>
        @for (p of inventory; track p.productId) {
          <option [value]="p.productId">{{ p.product.name }}</option>
        }</select
      ><input name="qty" [(ngModel)]="quantity" type="number" placeholder="Cantidad" /><button>Agregar producto</button>
    </form>
    <table>
      <tbody>
        @for (l of lines; track l.productId) {
          <tr>
            <td>{{ l.name }}</td>
            <td>{{ l.quantity }}</td>
            <td>₡{{ l.cost }}</td>
            <td><button type="button" (click)="remove(l.productId)">Quitar</button></td>
          </tr>
        }
      </tbody>
    </table>
    <input name="notes" [(ngModel)]="notes" placeholder="Observación" /><button [disabled]="!lines.length" (click)="save()">
      Guardar aplicación
    </button>
    <h3>Registradas</h3>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Fecha</th>
          <th>Costo</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (a of applications; track a.id) {
          <tr>
            <td>{{ a.code }}</td>
            <td>{{ a.appliedAt | slice: 0 : 10 }}</td>
            <td>₡{{ a.totalCost }}</td>
            <td>
              <button type="button" (click)="detail = a">Detalle</button><button type="button" (click)="voidApplication(a)">Anular</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (detail) {
      <div class="detail">
        <h3>{{ detail.code }}</h3>
        <p>
          <strong>Finca:</strong> {{ detail.lot.farm.name }} · <strong>Lote:</strong> {{ detail.lot.name }} · <strong>Cultivo:</strong>
          {{ detail.crop?.name || 'No especificado' }}
        </p>
        @for (i of detail.items; track i.product.name) {
          <p>
            {{ i.product.name }} · {{ i.quantity }}
            {{ i.product.baseUnit === 'ML' ? 'mL' : i.product.baseUnit === 'G' ? 'g' : 'unidades' }} · ₡{{ i.totalCost }}
          </p>
        }
        <button (click)="detail = undefined">Cerrar</button>
      </div>
    }
  </section>`,
})
export class ApplicationsPanelComponent {
  crops: Crop[] = [];
  inventory: Inv[] = [];
  applications: App[] = [];
  lines: Line[] = [];
  cropId = '';
  productId = '';
  quantity: number | null = null;
  appliedAt = new Date().toISOString().slice(0, 10);
  notes = '';
  detail?: App;
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.http
      .get<
        { name: string; lots: { id: string; name: string; crops: { id: string; name: string; isActive: boolean }[] }[] }[]
      >('http://localhost:3000/api/v1/agriculture/farms')
      .subscribe((x) => {
        this.crops = x.flatMap((f) =>
          f.lots.flatMap((l) =>
            l.crops.filter((c) => c.isActive).map((c) => ({ lotId: l.id, cropId: c.id, label: `${f.name} · ${l.name} · ${c.name}` })),
          ),
        );
        this.cdr.detectChanges();
      });
    this.http.get<Inv[]>('http://localhost:3000/api/v1/inventory').subscribe((x) => (this.inventory = x));
    this.load();
  }
  add() {
    const product = this.inventory.find((x) => x.productId === this.productId);
    if (!product || !this.quantity || this.lines.some((x) => x.productId === product.productId)) return;
    this.lines = [
      ...this.lines,
      {
        productId: product.productId,
        name: product.product.name,
        quantity: this.quantity,
        cost: this.quantity * Number(product.averageCost),
      },
    ];
    this.quantity = null;
  }
  remove(id: string) {
    this.lines = this.lines.filter((x) => x.productId !== id);
  }
  load() {
    this.http.get<App[]>('http://localhost:3000/api/v1/applications').subscribe((x) => {
      this.applications = x;
      this.cdr.detectChanges();
    });
  }
  save() {
    const crop = this.crops.find((x) => x.cropId === this.cropId);
    if (!crop) return;
    this.http
      .post('http://localhost:3000/api/v1/applications', {
        lotId: crop.lotId,
        cropId: crop.cropId,
        appliedAt: this.appliedAt,
        notes: this.notes,
        items: this.lines.map((x) => ({ productId: x.productId, quantity: x.quantity })),
      })
      .subscribe(() => {
        this.lines = [];
        this.notes = '';
        this.load();
      });
  }
  voidApplication(application: App) {
    const reason = window.prompt('Motivo de anulación:');
    if (!reason || reason.length < 3) return;
    this.http.patch(`http://localhost:3000/api/v1/applications/${application.id}/void`, { reason }).subscribe(() => this.load());
  }
}
