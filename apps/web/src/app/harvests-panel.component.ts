import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Crop = { id: string; name: string; lot: { name: string; farm: { name: string } } };
type HarvestLine = { grade: string; label: string; boxes: number | null; unitPrice: number | null };
type Harvest = { id: string; harvestedAt: string; quantity: string; crop: Crop; items: { grade: string; boxes: number; unitPrice: string | null; total: string | null }[] };
type PriceLine = { grade: string; label: string; boxes: number; unitPrice: number | null };

const gradeLines = (): HarvestLine[] => [
  ['FIRST', 'Primera'], ['SECOND', 'Segunda'], ['THIRD', 'Tercera'], ['BOLITA', 'Bolita'], ['RAYADO', 'Rayado'], ['ECHADO', 'Echado']
].map(([grade, label]) => ({ grade, label, boxes: null, unitPrice: null }));

@Component({
  selector: 'ac-harvests-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="workspace">
      <h2>Registrar cosecha</h2>
      <form class="harvest-form" (ngSubmit)="save()">
        <select name="crop" [(ngModel)]="cropId" required>
          <option value="" disabled>Seleccione finca · lote · cultivo</option>
          @for (crop of crops; track crop.id) { <option [value]="crop.id">{{ crop.lot.farm.name }} · {{ crop.lot.name }} · {{ crop.name }}</option> }
        </select>
        <input name="harvestedAt" [(ngModel)]="harvestedAt" type="date" required>

        <div class="grades">
          <div class="grade-heading"><span>Calidad</span><span>Cajas</span><span>Precio por caja (₡)</span><span>Total</span></div>
          @for (line of lines; track line.grade) {
            <div class="grade-row">
              <strong>{{ line.label }}</strong>
              <input [name]="'boxes-' + line.grade" [(ngModel)]="line.boxes" type="number" min="0" placeholder="0">
              <input [name]="'price-' + line.grade" [(ngModel)]="line.unitPrice" type="number" min="0" placeholder="Pendiente">
              <span>{{ line.unitPrice === null ? 'Pendiente' : '₡' + lineTotal(line) }}</span>
            </div>
          }
        </div>
        <p class="total"><strong>{{ hasPendingNewPrice ? 'Valor pendiente de precio' : 'Total de la cosecha: ₡' + total }}</strong></p>
        <button type="submit" [disabled]="!cropId || !hasItems">Guardar cosecha</button>
      </form>

      <h3>Cosechas registradas</h3>
      @if (harvests.length) {
        <table>
          <thead><tr><th>Fecha</th><th>Finca · lote · cultivo</th><th>Cajas</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            @for (harvest of harvests; track harvest.id) {
              <tr><td>{{ harvest.harvestedAt | slice:0:10 }}</td><td>{{ harvest.crop.lot.farm.name }} · {{ harvest.crop.lot.name }} · {{ harvest.crop.name }}</td><td>{{ harvest.quantity }}</td><td>{{ isPending(harvest) ? 'Precio pendiente' : '₡' + harvestTotal(harvest) }}</td><td><button type="button" (click)="openPrices(harvest)">{{ isPending(harvest) ? 'Agregar precio' : 'Ver precios' }}</button><button type="button" (click)="voidHarvest(harvest)">Anular</button></td></tr>
            }
          </tbody>
        </table>
      } @else { <p class="empty">Aún no hay cosechas registradas.</p> }

      @if (pricing) {
        <div class="detail" role="dialog" aria-modal="true" aria-label="Registrar precios de cosecha">
          <h3>Precios de la cosecha</h3>
          <p>{{ pricing.crop.lot.farm.name }} · {{ pricing.crop.lot.name }} · {{ pricing.crop.name }}</p>
          <div class="price-lines">
            @for (line of priceLines; track line.grade) {
              <label><span>{{ line.label }} — {{ line.boxes }} cajas</span><input [name]="'update-price-' + line.grade" [(ngModel)]="line.unitPrice" type="number" min="0" placeholder="Precio por caja (₡)"></label>
            }
          </div>
          <button type="button" (click)="savePrices()" [disabled]="!hasPrices">Guardar precios</button>
          <button type="button" class="secondary" (click)="closePrices()">Cerrar</button>
        </div>
      }
    </section>
  `,
  styles: `
    .workspace { margin-top: 28px; padding: 24px; border-radius: 18px; background: #fff; box-shadow: 0 8px 24px rgb(18 63 34 / 10%); }
    .harvest-form { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }
    input, select { padding: 10px; border: 1px solid #bed1c1; border-radius: 8px; }
    .grades { grid-column: 1 / -1; overflow-x: auto; margin-top: 8px; border: 1px solid #e0ece2; border-radius: 12px; }
    .grade-heading, .grade-row { display: grid; min-width: 620px; grid-template-columns: 1.2fr 1fr 1.4fr 1fr; align-items: center; gap: 10px; padding: 10px 12px; }
    .grade-heading { background: #eef7ef; color: #39704a; font-size: .78rem; font-weight: 700; text-transform: uppercase; }
    .grade-row { border-top: 1px solid #e3ece4; }
    .grade-row input { width: 100%; }
    .total { margin: 0; }
    .price-lines { margin-top: 16px; }
    .price-lines label { display: grid; grid-template-columns: 1fr 190px; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e3ece4; }
    .secondary { margin-left: 8px; background: #eaf6ed !important; color: #1f6339 !important; }
    table { width: 100%; margin-top: 20px; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e3ece4; }
    .empty { color: #52725c; }
    @media (max-width: 800px) { .harvest-form { grid-template-columns: 1fr; } }
  `
})
export class HarvestsPanelComponent {
  crops: Crop[] = [];
  harvests: Harvest[] = [];
  cropId = '';
  harvestedAt = new Date().toISOString().slice(0, 10);
  lines = gradeLines();
  pricing?: Harvest;
  priceLines: PriceLine[] = [];

  constructor(private readonly http: HttpClient, private readonly cdr: ChangeDetectorRef) {
    this.http.get<{ name: string; lots: { name: string; crops: Crop[] }[] }[]>('http://localhost:3000/api/v1/agriculture/farms').subscribe(farms => {
      this.crops = farms.flatMap(farm => farm.lots.flatMap(lot => lot.crops.map(crop => ({ ...crop, lot: { name: lot.name, farm: { name: farm.name } } }))));
      this.cdr.detectChanges();
    });
    this.load();
  }

  get hasItems() { return this.lines.some(line => Number(line.boxes) > 0); }
  get hasPendingNewPrice() { return this.lines.some(line => Number(line.boxes) > 0 && line.unitPrice === null); }
  get hasPrices() { return this.priceLines.some(line => line.unitPrice !== null && line.unitPrice !== undefined); }
  get total() { return this.lines.reduce((sum, line) => sum + Number(line.boxes || 0) * Number(line.unitPrice || 0), 0); }
  lineTotal(line: HarvestLine) { return Number(line.boxes || 0) * Number(line.unitPrice || 0); }
  harvestTotal(harvest: Harvest) { return harvest.items.reduce((sum, item) => sum + Number(item.total || 0), 0); }
  isPending(harvest: Harvest) { return harvest.items.some(item => item.unitPrice === null); }

  load() {
    this.http.get<Harvest[]>('http://localhost:3000/api/v1/finance/harvests').subscribe(harvests => {
      this.harvests = harvests;
      this.cdr.detectChanges();
    });
  }

  save() {
    const items = this.lines.filter(line => Number(line.boxes) > 0).map(line => line.unitPrice === null ? ({ grade: line.grade, boxes: Number(line.boxes) }) : ({ grade: line.grade, boxes: Number(line.boxes), unitPrice: Number(line.unitPrice) }));
    if (!this.cropId || !items.length) return;
    this.http.post('http://localhost:3000/api/v1/finance/harvests', { cropId: this.cropId, harvestedAt: this.harvestedAt, items }).subscribe(() => {
      this.lines = gradeLines();
      this.load();
    });
  }

  openPrices(harvest: Harvest) {
    this.pricing = harvest;
    this.priceLines = harvest.items.map(item => ({ grade: item.grade, label: this.gradeLabel(item.grade), boxes: item.boxes, unitPrice: item.unitPrice === null ? null : Number(item.unitPrice) }));
  }

  closePrices() { this.pricing = undefined; this.priceLines = []; }

  savePrices() {
    if (!this.pricing) return;
    const items = this.priceLines.filter(line => line.unitPrice !== null && line.unitPrice !== undefined).map(line => ({ grade: line.grade, unitPrice: Number(line.unitPrice) }));
    if (!items.length) return;
    this.http.patch(`http://localhost:3000/api/v1/finance/harvests/${this.pricing.id}/prices`, { items }).subscribe(() => { this.closePrices(); this.load(); });
  }

  voidHarvest(harvest: Harvest) {
    const reason = window.prompt(`Motivo para anular la cosecha del ${harvest.harvestedAt.slice(0, 10)}:`);
    if (!reason || reason.trim().length < 3) return;
    this.http.patch(`http://localhost:3000/api/v1/finance/harvests/${harvest.id}/void`, { reason }).subscribe(() => this.load());
  }

  gradeLabel(grade: string) { return ({ FIRST: 'Primera', SECOND: 'Segunda', THIRD: 'Tercera', BOLITA: 'Bolita', RAYADO: 'Rayado', ECHADO: 'Echado' } as Record<string, string>)[grade] || grade; }
}
