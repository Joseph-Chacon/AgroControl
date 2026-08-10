import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequence: SequenceService,
  ) {}
  findAll(supplierId?: string) {
    return this.prisma.purchase.findMany({
      where: { isVoided: false, ...(supplierId ? { supplierId } : {}) },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { receivedAt: 'desc' },
    });
  }
  async reportBySupplier() {
    const suppliers = await this.prisma.supplier.findMany({
      include: { purchases: { where: { isVoided: false }, select: { total: true } } },
      orderBy: { name: 'asc' },
    });
    return suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      purchaseCount: supplier.purchases.length,
      totalPurchased: supplier.purchases.reduce((sum, purchase) => sum.plus(purchase.total), new Prisma.Decimal(0)),
    }));
  }
  async create(dto: CreatePurchaseDto) {
    if (new Set(dto.items.map((item) => item.productId)).size !== dto.items.length)
      throw new BadRequestException('Un producto solo puede aparecer una vez en la compra.');
    const code = await this.sequence.next('PURCHASE', 'CMP');
    return this.prisma.$transaction(async (tx) => {
      const total = dto.items.reduce((sum, item) => sum + item.totalCost, 0);
      if (!(await tx.supplier.findUnique({ where: { id: dto.supplierId } }))) throw new BadRequestException('Proveedor no encontrado.');
      const purchase = await tx.purchase.create({
        data: {
          code,
          supplierId: dto.supplierId,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
          total: new Prisma.Decimal(total),
        },
      });
      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, include: { inventory: true } });
        if (!product?.inventory) throw new BadRequestException('Producto no encontrado.');
        const before = product.inventory.quantity;
        const quantity = new Prisma.Decimal(item.quantity);
        const cost = new Prisma.Decimal(item.totalCost);
        const after = before.plus(quantity);
        const averageCost = before.mul(product.inventory.averageCost).plus(cost).div(after);
        const purchaseItem = await tx.purchaseItem.create({
          data: { purchaseId: purchase.id, productId: product.id, quantity, totalCost: cost, unitCost: cost.div(quantity) },
        });
        await tx.inventoryItem.update({
          where: { productId: product.id },
          data: { quantity: after, averageCost, lastCost: purchaseItem.unitCost },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            type: MovementType.PURCHASE,
            quantity,
            quantityBefore: before,
            quantityAfter: after,
            unitCost: purchaseItem.unitCost,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
          },
        });
      }
      return tx.purchase.findUniqueOrThrow({
        where: { id: purchase.id },
        include: { supplier: true, items: { include: { product: true } } },
      });
    });
  }
  async void(id: string, reason: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id }, include: { items: true } });
      if (!purchase || purchase.isVoided) throw new BadRequestException('La compra no existe o ya fue anulada.');
      for (const item of purchase.items) {
        const inventory = await tx.inventoryItem.findUniqueOrThrow({ where: { productId: item.productId } });
        if (inventory.quantity.lessThan(item.quantity))
          throw new BadRequestException('No se puede anular: parte del inventario de esta compra ya fue consumido.');
        const after = inventory.quantity.minus(item.quantity);
        await tx.inventoryItem.update({ where: { productId: item.productId }, data: { quantity: after } });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.ADJUSTMENT_OUT,
            quantity: item.quantity,
            quantityBefore: inventory.quantity,
            quantityAfter: after,
            unitCost: item.unitCost,
            referenceType: 'PURCHASE_VOID',
            referenceId: purchase.id,
            notes: reason.trim(),
          },
        });
      }
      const result = await tx.purchase.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidReason: reason.trim() } });
      await tx.auditLog.create({ data: { entityType: 'PURCHASE', entityId: id, action: 'VOIDED', reason: reason.trim(), actorId } });
      return result;
    });
  }
}
