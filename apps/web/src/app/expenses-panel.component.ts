import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
type Crop = { id: string; name: string; lot: { name: string; farm: { name: string } } };
type Expense = { id: string; occurredAt: string; description: string; amount: string; crop: Crop };
@Component({
  selector: 'ac-expenses-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="workspace">
    <h2>Gastos</h2>
    <form (ngSubmit)="save()">
      <select name="crop" [(ngModel)]="cropId">
        <option value="" disabled>Finca · lote · cultivo</option>
        @for (c of crops; track c.id) {
          <option [value]="c.id">{{ c.lot.farm.name }} · {{ c.lot.name }} · {{ c.name }}</option>
        }</select
      ><input name="date" [(ngModel)]="occurredAt" type="date" /><input
        name="description"
        [(ngModel)]="description"
        placeholder="Descripción"
      /><input name="amount" [(ngModel)]="amount" type="number" placeholder="Monto" /><button>Guardar gasto</button>
    </form>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Descripción</th>
          <th>Monto</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (e of expenses; track e.id) {
          <tr>
            <td>{{ e.occurredAt | slice: 0 : 10 }}</td>
            <td>{{ e.description }}</td>
            <td>₡{{ e.amount }}</td>
            <td>
              <button type="button" (click)="detail = e">Detalle</button><button type="button" (click)="voidExpense(e)">Anular</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (detail) {
      <div class="detail">
        <h3>Gasto</h3>
        <p>{{ detail.crop.lot.farm.name }} · {{ detail.crop.lot.name }} · {{ detail.crop.name }}</p>
        <p>{{ detail.description }} · ₡{{ detail.amount }}</p>
        <button (click)="detail = undefined">Cerrar</button>
      </div>
    }
  </section>`,
})
export class ExpensesPanelComponent {
  crops: Crop[] = [];
  expenses: Expense[] = [];
  cropId = '';
  occurredAt = new Date().toISOString().slice(0, 10);
  description = '';
  amount: number | null = null;
  detail?: Expense;
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
    this.http.get<Expense[]>('http://localhost:3000/api/v1/finance/expenses').subscribe((x) => {
      this.expenses = x;
      this.cdr.detectChanges();
    });
  }
  save() {
    if (!this.cropId || !this.description || !this.amount) return;
    this.http
      .post('http://localhost:3000/api/v1/finance/expenses', {
        cropId: this.cropId,
        occurredAt: this.occurredAt,
        description: this.description,
        amount: this.amount,
      })
      .subscribe(() => {
        this.description = '';
        this.amount = null;
        this.load();
      });
  }
  voidExpense(expense: Expense) {
    const reason = window.prompt('Motivo de anulación:');
    if (!reason) return;
    if (reason.trim().length < 3) {
      window.alert('El motivo de anulación debe tener al menos 3 caracteres.');
      return;
    }
    this.http.patch(`http://localhost:3000/api/v1/finance/expenses/${expense.id}/void`, { reason }).subscribe(() => this.load());
  }
}
