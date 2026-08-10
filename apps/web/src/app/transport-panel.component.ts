import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
type Crop = { id: string; name: string; lot: { name: string; farm: { name: string } } };
type Trip = { id: string; tripDate: string; amount: string; notes?: string; crop: Crop };
@Component({
  selector: 'ac-transport-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="workspace">
    <h2>Viajes</h2>
    <form (ngSubmit)="save()">
      <select name="crop" [(ngModel)]="cropId">
        <option value="" disabled>Finca · lote · cultivo</option>
        @for (c of crops; track c.id) {
          <option [value]="c.id">{{ c.lot.farm.name }} · {{ c.lot.name }} · {{ c.name }}</option>
        }</select
      ><input name="date" [(ngModel)]="tripDate" type="date" /><input
        name="amount"
        [(ngModel)]="amount"
        type="number"
        placeholder="Monto"
      /><input name="notes" [(ngModel)]="notes" placeholder="Observación" /><button>Guardar viaje</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cultivo</th>
          <th>Monto</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (t of trips; track t.id) {
          <tr>
            <td>{{ t.tripDate | slice: 0 : 10 }}</td>
            <td>{{ t.crop.lot.name }} · {{ t.crop.name }}</td>
            <td>₡{{ t.amount }}</td>
            <td><button type="button" (click)="detail = t">Detalle</button><button type="button" (click)="voidTrip(t)">Anular</button></td>
          </tr>
        }
      </tbody>
    </table>
    @if (detail) {
      <div class="detail">
        <h3>Viaje</h3>
        <p>{{ detail.notes || 'Sin observación' }}</p>
        <p>₡{{ detail.amount }}</p>
        <button (click)="detail = undefined">Cerrar</button>
      </div>
    }
  </section>`,
})
export class TransportPanelComponent {
  crops: Crop[] = [];
  trips: Trip[] = [];
  cropId = '';
  tripDate = new Date().toISOString().slice(0, 10);
  amount: number | null = null;
  notes = '';
  detail?: Trip;
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
    this.load();
  }
  load() {
    this.http.get<Trip[]>('http://localhost:3000/api/v1/finance/transport-trips').subscribe((x) => {
      this.trips = x;
      this.cdr.detectChanges();
    });
  }
  save() {
    if (!this.cropId || !this.amount) return;
    this.http
      .post('http://localhost:3000/api/v1/finance/transport-trips', {
        cropId: this.cropId,
        tripDate: this.tripDate,
        amount: this.amount,
        notes: this.notes,
      })
      .subscribe(() => {
        this.amount = null;
        this.notes = '';
        this.load();
      });
  }
  voidTrip(t: Trip) {
    const reason = window.prompt('Motivo de anulación:');
    if (!reason || reason.length < 3) return;
    this.http.patch(`http://localhost:3000/api/v1/finance/transport-trips/${t.id}/void`, { reason }).subscribe(() => this.load());
  }
}
