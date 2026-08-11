import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Item = { productId: string; quantity: string; averageCost: string; product: { name: string; baseUnit: string; minStock: string } };
type Move = {
  id: string;
  occurredAt: string;
  type: string;
  quantity: string;
  quantityAfter: string;
  notes?: string;
  referenceType: string;
};
type TransformationLine = { productId: string; name: string; baseUnit: string; quantity: number; totalCost: number };
type Transformation = {
  id: string;
  code: string;
  createdAt: string;
  outputQuantity: string;
  totalCost: string;
  notes?: string;
  outputProduct: { name: string; baseUnit: string };
  items: { product: { name: string; baseUnit: string }; quantity: string; totalCost: string }[];
};
type InventoryModal = 'create' | 'transform' | 'adjust' | null;

@Component({
  selector: 'ac-inventory-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<section class="workspace inventory-workspace">
    <div class="inventory-heading">
      <div>
        <p class="eyebrow">CONTROL DE EXISTENCIAS</p>
        <h2>Inventario</h2>
        <p class="status">Consulta productos, costos y preparaciones registradas.</p>
      </div>
      <div class="inventory-actions">
        <button type="button" (click)="openModal('create')">+ Crear producto</button
        ><button type="button" (click)="openModal('transform')">⚗ Preparar productos</button
        ><button type="button" (click)="openModal('adjust')">↕ Ajustar inventario</button>
      </div>
    </div>

    <h3>Existencias actuales</h3>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Existencia</th>
          <th>Mínimo</th>
          <th>Costo promedio</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (i of inventory; track i.productId) {
          <tr [class.low]="isLow(i)">
            <td>{{ i.product.name }}</td>
            <td>{{ i.quantity }} {{ i.product.baseUnit }}</td>
            <td>{{ i.product.minStock || '—' }}</td>
            <td>₡{{ i.averageCost }}</td>
            <td>
              <button type="button" (click)="setMinimum(i)">Definir mínimo</button><button type="button" (click)="kardex(i)">Kardex</button>
            </td>
          </tr>
        }
      </tbody>
    </table>

    <h3>Preparaciones recientes</h3>
    @if (transformations.length) {
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Fecha</th>
            <th>Producto obtenido</th>
            <th>Cantidad</th>
            <th>Costo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (transformation of transformations; track transformation.id) {
            <tr>
              <td>{{ transformation.code }}</td>
              <td>{{ transformation.createdAt | slice: 0 : 10 }}</td>
              <td>{{ transformation.outputProduct.name }}</td>
              <td>{{ transformation.outputQuantity }} {{ transformation.outputProduct.baseUnit }}</td>
              <td>₡{{ transformation.totalCost }}</td>
              <td>
                <button type="button" (click)="transformationDetail = transformation">Detalle</button
                ><button type="button" (click)="voidTransformation(transformation)">Anular</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="status">Aún no hay preparaciones registradas.</p>
    }

    @if (activeModal) {
      <div class="modal-backdrop" role="presentation">
        <section class="modal-card inventory-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div>
              @if (activeModal === 'create') {
                <p class="eyebrow">CATÁLOGO</p>
                <h3>Crear producto</h3>
              } @else if (activeModal === 'transform') {
                <p class="eyebrow">PREPARACIÓN</p>
                <h3>Preparar o combinar productos</h3>
              } @else {
                <p class="eyebrow">MOVIMIENTO</p>
                <h3>Levantamiento y ajuste</h3>
              }
            </div>
            <button type="button" class="modal-close" (click)="closeModal()" aria-label="Cerrar">×</button>
          </header>

          @if (activeModal === 'create') {
            <p class="modal-description">Crea el producto que después podrás comprar, ajustar o usar como resultado de una preparación.</p>
            <form (ngSubmit)="create()">
              <input name="name" [(ngModel)]="name" placeholder="Nombre del producto" required /><select name="unit" [(ngModel)]="unit">
                <option value="ML">mL</option>
                <option value="G">g</option>
                <option value="UND">Unidad</option></select
              ><input name="min" [(ngModel)]="minStock" type="number" min="0" placeholder="Existencia mínima" />
              <div class="modal-footer">
                <button type="button" class="secondary-button" (click)="closeModal()">Cancelar</button><button>Guardar producto</button>
              </div>
            </form>
          }

          @if (activeModal === 'transform') {
            <p class="modal-description">
              El producto obtenido recibirá la suma de los costos de cada insumo usado, aunque tengan unidades diferentes.
            </p>
            <form (ngSubmit)="addTransformationLine()">
              <select name="outputProduct" [(ngModel)]="outputProductId" required>
                <option value="" disabled>Producto obtenido</option>
                @for (i of inventory; track i.productId) {
                  <option [value]="i.productId">{{ i.product.name }} ({{ i.product.baseUnit }})</option>
                }</select
              ><select name="inputProduct" [(ngModel)]="inputProductId" required>
                <option value="" disabled>Producto origen</option>
                @for (i of availableInputs; track i.productId) {
                  <option [value]="i.productId">{{ i.product.name }} · disponible {{ i.quantity }} {{ i.product.baseUnit }}</option>
                }</select
              ><input
                name="inputQuantity"
                [(ngModel)]="inputQuantity"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Cantidad a usar"
                required
              /><button>Agregar insumo</button>
            </form>
            @if (transformationLines.length) {
              <div class="modal-table">
                <table>
                  <thead>
                    <tr>
                      <th>Producto origen</th>
                      <th>Cantidad</th>
                      <th>Costo usado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (line of transformationLines; track line.productId) {
                      <tr>
                        <td>{{ line.name }}</td>
                        <td>{{ line.quantity }} {{ line.baseUnit }}</td>
                        <td>₡{{ line.totalCost }}</td>
                        <td><button type="button" (click)="removeTransformationLine(line.productId)">Quitar</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            <form (ngSubmit)="saveTransformation()">
              <input
                name="outputQuantity"
                [(ngModel)]="outputQuantity"
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Cantidad obtenida"
                required
              /><input name="transformationNotes" [(ngModel)]="transformationNotes" placeholder="Observación de preparación" />
              <p class="cost-summary">
                Costo de insumos: <strong>₡{{ transformationCost }}</strong>
              </p>
              <div class="modal-footer">
                <button type="button" class="secondary-button" (click)="closeModal()">Cancelar</button
                ><button [disabled]="transformationLines.length < 2">Guardar preparación</button>
              </div>
            </form>
          }

          @if (activeModal === 'adjust') {
            <p class="modal-description">
              Registra el inventario inicial o una corrección con su motivo para conservar el kardex trazable.
            </p>
            <form (ngSubmit)="adjust()">
              <select name="product" [(ngModel)]="adjustProduct" required>
                <option value="" disabled>Producto</option>
                @for (i of inventory; track i.productId) {
                  <option [value]="i.productId">{{ i.product.name }}</option>
                }</select
              ><select name="type" [(ngModel)]="adjustType">
                <option value="INITIAL">Inventario inicial</option>
                <option value="ADJUSTMENT_IN">Entrada de ajuste</option>
                <option value="ADJUSTMENT_OUT">Salida de ajuste</option></select
              ><input name="quantity" [(ngModel)]="adjustQuantity" type="number" min="0.0001" placeholder="Cantidad" required />
              @if (adjustType === 'INITIAL') {
                <input name="cost" [(ngModel)]="unitCost" type="number" min="0.000001" placeholder="Costo unitario obligatorio" required />
              }
              <input name="reason" [(ngModel)]="adjustReason" placeholder="Motivo" required />
              <div class="modal-footer">
                <button type="button" class="secondary-button" (click)="closeModal()">Cancelar</button
                ><button>{{ adjustType === 'INITIAL' ? 'Guardar inventario inicial' : 'Guardar ajuste' }}</button>
              </div>
            </form>
          }
        </section>
      </div>
    }

    @if (detail) {
      <div class="modal-backdrop" role="presentation">
        <section class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-header">
            <h3>Kardex · {{ detail.product.name }}</h3>
            <button type="button" class="modal-close" (click)="detail = undefined" aria-label="Cerrar">×</button>
          </header>
          <div class="modal-scroll">
            @for (m of movements; track m.id) {
              <p>
                {{ m.occurredAt | slice: 0 : 10 }} · {{ m.referenceType }} · {{ m.quantity }} · saldo {{ m.quantityAfter }} · {{ m.notes }}
              </p>
            }
          </div>
          <div class="modal-footer"><button type="button" (click)="detail = undefined">Cerrar</button></div>
        </section>
      </div>
    }
    @if (transformationDetail) {
      <div class="modal-backdrop" role="presentation">
        <section class="modal-card" role="dialog" aria-modal="true">
          <header class="modal-header">
            <h3>{{ transformationDetail.code }} · {{ transformationDetail.outputProduct.name }}</h3>
            <button type="button" class="modal-close" (click)="transformationDetail = undefined" aria-label="Cerrar">×</button>
          </header>
          <p>
            <strong>Producto obtenido:</strong> {{ transformationDetail.outputQuantity }}
            {{ transformationDetail.outputProduct.baseUnit }} · ₡{{ transformationDetail.totalCost }}
          </p>
          @for (item of transformationDetail.items; track item.product.name) {
            <p>{{ item.product.name }}: {{ item.quantity }} {{ item.product.baseUnit }} · ₡{{ item.totalCost }}</p>
          }
          @if (transformationDetail.notes) {
            <p><strong>Observación:</strong> {{ transformationDetail.notes }}</p>
          }
          <div class="modal-footer"><button type="button" (click)="transformationDetail = undefined">Cerrar</button></div>
        </section>
      </div>
    }
  </section>`,
})
export class InventoryPanelComponent {
  inventory: Item[] = [];
  transformations: Transformation[] = [];
  movements: Move[] = [];
  activeModal: InventoryModal = null;
  detail?: Item;
  transformationDetail?: Transformation;
  name = '';
  unit = 'ML';
  minStock: number | null = null;
  adjustProduct = '';
  adjustType = 'INITIAL';
  adjustQuantity: number | null = null;
  unitCost: number | null = null;
  adjustReason = 'Levantamiento inicial';
  outputProductId = '';
  inputProductId = '';
  inputQuantity: number | null = null;
  outputQuantity: number | null = null;
  transformationNotes = '';
  transformationLines: TransformationLine[] = [];
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.load();
  }
  load() {
    this.http.get<Item[]>('http://localhost:3000/api/v1/inventory').subscribe((x) => {
      this.inventory = x;
      this.cdr.detectChanges();
    });
    this.loadTransformations();
  }
  loadTransformations() {
    this.http.get<Transformation[]>('http://localhost:3000/api/v1/inventory/transformations').subscribe((x) => {
      this.transformations = x;
      this.cdr.detectChanges();
    });
  }
  openModal(modal: Exclude<InventoryModal, null>) {
    this.activeModal = modal;
  }
  closeModal() {
    this.activeModal = null;
  }
  create() {
    if (!this.name.trim()) return;
    this.http
      .post('http://localhost:3000/api/v1/products', { name: this.name, baseUnit: this.unit, minStock: this.minStock ?? 0 })
      .subscribe({
        next: () => {
          this.name = '';
          this.minStock = null;
          this.closeModal();
          this.load();
        },
        error: (error) => window.alert(error.error?.message ?? 'No fue posible crear el producto.'),
      });
  }
  get outputProduct() {
    return this.inventory.find((item) => item.productId === this.outputProductId);
  }
  get availableInputs() {
    return this.inventory.filter((item) => item.productId !== this.outputProductId);
  }
  get transformationCost() {
    return this.transformationLines.reduce((sum, line) => sum + line.totalCost, 0);
  }
  addTransformationLine() {
    const input = this.inventory.find((item) => item.productId === this.inputProductId);
    if (!this.outputProduct || !input || !this.inputQuantity || this.inputQuantity <= 0) {
      window.alert('Seleccione el producto obtenido, el insumo y la cantidad a utilizar.');
      return;
    }
    if (Number(input.quantity) < this.inputQuantity) {
      window.alert('La cantidad indicada supera el inventario disponible.');
      return;
    }
    if (this.transformationLines.some((line) => line.productId === input.productId)) {
      window.alert('Este insumo ya fue agregado.');
      return;
    }
    this.transformationLines = [
      ...this.transformationLines,
      {
        productId: input.productId,
        name: input.product.name,
        baseUnit: input.product.baseUnit,
        quantity: this.inputQuantity,
        totalCost: this.inputQuantity * Number(input.averageCost),
      },
    ];
    this.inputProductId = '';
    this.inputQuantity = null;
  }
  removeTransformationLine(productId: string) {
    this.transformationLines = this.transformationLines.filter((line) => line.productId !== productId);
  }
  saveTransformation() {
    if (!this.outputProduct || !this.outputQuantity || this.transformationLines.length < 2) {
      window.alert('Indique el producto obtenido, la cantidad obtenida y al menos dos insumos.');
      return;
    }
    this.http
      .post('http://localhost:3000/api/v1/inventory/transformations', {
        outputProductId: this.outputProductId,
        outputQuantity: this.outputQuantity,
        notes: this.transformationNotes,
        items: this.transformationLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      })
      .subscribe({
        next: () => {
          this.transformationLines = [];
          this.inputProductId = '';
          this.outputQuantity = null;
          this.transformationNotes = '';
          this.closeModal();
          this.load();
        },
        error: (error) => window.alert(error.error?.message ?? 'No fue posible guardar la preparación.'),
      });
  }
  voidTransformation(transformation: Transformation) {
    const reason = window.prompt(`Motivo para anular ${transformation.code}:`);
    if (!reason || reason.trim().length < 3) return;
    this.http
      .patch(`http://localhost:3000/api/v1/inventory/transformations/${transformation.id}/void`, { reason })
      .subscribe({
        next: () => this.load(),
        error: (error) => window.alert(error.error?.message ?? 'No fue posible anular la preparación.'),
      });
  }
  adjust() {
    const initial = this.adjustType === 'INITIAL';
    if (!this.adjustProduct || !this.adjustQuantity || this.adjustReason.trim().length < 3 || (initial && !this.unitCost)) {
      window.alert(initial ? 'Indique producto, cantidad, costo unitario y motivo.' : 'Indique producto, cantidad y motivo.');
      return;
    }
    this.http
      .post('http://localhost:3000/api/v1/inventory/adjustments', {
        productId: this.adjustProduct,
        type: initial ? 'ADJUSTMENT_IN' : this.adjustType,
        quantity: this.adjustQuantity,
        unitCost: initial ? this.unitCost : undefined,
        isInitial: initial,
        reason: this.adjustReason,
      })
      .subscribe({
        next: () => {
          this.adjustQuantity = null;
          this.unitCost = null;
          this.adjustReason = initial ? 'Levantamiento inicial' : '';
          this.closeModal();
          this.load();
        },
        error: (error) => window.alert(error.error?.message ?? 'No fue posible ajustar el inventario.'),
      });
  }
  isLow(i: Item) {
    return Number(i.product.minStock) > 0 && Number(i.quantity) <= Number(i.product.minStock);
  }
  setMinimum(i: Item) {
    const value = window.prompt(`Existencia mínima para ${i.product.name}:`, i.product.minStock);
    if (value === null) return;
    const minStock = Number(value);
    if (!Number.isFinite(minStock) || minStock < 0) return;
    this.http
      .patch(`http://localhost:3000/api/v1/products/${i.productId}`, { name: i.product.name, baseUnit: i.product.baseUnit, minStock })
      .subscribe(() => this.load());
  }
  kardex(i: Item) {
    this.detail = i;
    this.http.get<Move[]>(`http://localhost:3000/api/v1/inventory/movements?productId=${i.productId}`).subscribe((x) => {
      this.movements = x;
      this.cdr.detectChanges();
    });
  }
}
