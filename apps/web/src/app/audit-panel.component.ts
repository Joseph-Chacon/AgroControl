import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';

type AuditEntry = { id: string; document: string; action: string; reason?: string; actor: string; createdAt: string };

@Component({
  selector: 'ac-audit-panel',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `<section class="workspace audit">
    <div class="heading">
      <div>
        <p class="eyebrow">TRAZABILIDAD</p>
        <h2>Historial de auditoría</h2>
      </div>
      <button type="button" (click)="load()">Actualizar</button>
    </div>
    <p>Consulta de acciones que cambian registros. No permite modificaciones.</p>
    @if (entries.length) {
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Documento</th>
            <th>Acción</th>
            <th>Motivo</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          @for (entry of entries; track entry.id) {
            <tr>
              <td>{{ entry.createdAt | date: 'dd/MM/yyyy, HH:mm' }}</td>
              <td>{{ entry.document }}</td>
              <td>{{ labelAction(entry.action) }}</td>
              <td>{{ entry.reason || '—' }}</td>
              <td>{{ entry.actor }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="status">Aún no hay acciones auditadas para mostrar.</p>
    }
  </section>`,
  styles: `
    .audit {
      margin-top: 28px;
      padding: 24px;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 8px 24px rgb(18 63 34 / 10%);
    }
    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .heading h2 {
      margin: 4px 0;
    }
    .heading button {
      padding: 10px 14px;
      border: 0;
      border-radius: 9px;
      background: #eaf6ed;
      color: #1f6339;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      text-align: left;
    }
    th,
    td {
      padding: 12px 8px;
      border-bottom: 1px solid #e3ece4;
      vertical-align: top;
    }
    th {
      color: #52725c;
      font-size: 0.8rem;
      text-transform: uppercase;
    }
    @media (max-width: 700px) {
      table {
        font-size: 0.78rem;
      }
      th,
      td {
        padding: 8px 4px;
      }
    }
  `,
})
export class AuditPanelComponent {
  entries: AuditEntry[] = [];
  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.load();
  }
  load() {
    this.http.get<AuditEntry[]>('http://localhost:3000/api/v1/audit-logs').subscribe((entries) => {
      this.entries = entries;
      this.cdr.detectChanges();
    });
  }
  labelAction(action: string) {
    return action === 'VOIDED'
      ? 'Anulación'
      : action === 'ADJUSTMENT_IN'
        ? 'Ajuste de entrada'
        : action === 'ADJUSTMENT_OUT'
          ? 'Ajuste de salida'
          : action;
  }
}
