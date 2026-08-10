import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { CreateApplicationDto } from './dto/create-application.dto';
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequence: SequenceService,
  ) {}
  findAll() {
    return this.prisma.application.findMany({
      where: { isVoided: false },
      include: { lot: { include: { farm: true } }, crop: true, items: { include: { product: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }
  async create(dto: CreateApplicationDto) {
    if (new Set(dto.items.map((item) => item.productId)).size !== dto.items.length)
      throw new BadRequestException('Un producto solo puede aparecer una vez.');
    const code = await this.sequence.next('APPLICATION', 'APL');
    return this.prisma.$transaction(async (tx) => {
      const appliedAt = dto.appliedAt ? new Date(dto.appliedAt) : new Date();
      const lot = await tx.lot.findUnique({ where: { id: dto.lotId }, include: { farm: true } });
      if (!lot) throw new BadRequestException('Lote no encontrado.');
      if (dto.cropId) {
        const crop = await tx.crop.findUnique({ where: { id: dto.cropId } });
        if (!crop || crop.lotId !== dto.lotId) throw new BadRequestException('El cultivo no pertenece al lote seleccionado.');
        const start = new Date(crop.plantedAt);
        start.setHours(0, 0, 0, 0);
        if (appliedAt < start) throw new BadRequestException('La fecha de aplicación no puede ser anterior a la siembra del cultivo.');
        if (crop.isActive) {
          if (!lot.isActive || !lot.farm.isActive)
            throw new BadRequestException('El cultivo pertenece a una finca o lote inactivo; active la estructura antes de registrar.');
        } else {
          if (!crop.removedAt) throw new BadRequestException('El ciclo está cerrado sin fecha de retiro y no admite aplicaciones.');
          const end = new Date(crop.removedAt);
          end.setHours(23, 59, 59, 999);
          if (appliedAt > end)
            throw new BadRequestException(
              'El ciclo está cerrado. Solo se permiten aplicaciones históricas entre la siembra y el retiro de las matas.',
            );
        }
      } else if (!lot.isActive || !lot.farm.isActive) throw new BadRequestException('El lote pertenece a una finca o lote inactivo.');
      const costs: {
        productId: string;
        quantity: Prisma.Decimal;
        averageCost: Prisma.Decimal;
        totalCost: Prisma.Decimal;
        before: Prisma.Decimal;
        after: Prisma.Decimal;
      }[] = [];
      for (const item of dto.items) {
        const inventory = await tx.inventoryItem.findUnique({ where: { productId: item.productId } });
        if (!inventory) throw new BadRequestException('Producto no encontrado.');
        const quantity = new Prisma.Decimal(item.quantity);
        if (inventory.quantity.lessThan(quantity)) throw new BadRequestException('Inventario insuficiente para uno de los productos.');
        costs.push({
          productId: item.productId,
          quantity,
          averageCost: inventory.averageCost,
          totalCost: quantity.mul(inventory.averageCost),
          before: inventory.quantity,
          after: inventory.quantity.minus(quantity),
        });
      }
      const totalCost = costs.reduce((sum, item) => sum.plus(item.totalCost), new Prisma.Decimal(0));
      const application = await tx.application.create({
        data: { code, lotId: dto.lotId, cropId: dto.cropId, notes: dto.notes?.trim(), appliedAt, totalCost },
      });
      for (const item of costs) {
        await tx.applicationItem.create({
          data: {
            applicationId: application.id,
            productId: item.productId,
            quantity: item.quantity,
            averageCost: item.averageCost,
            totalCost: item.totalCost,
          },
        });
        await tx.inventoryItem.update({ where: { productId: item.productId }, data: { quantity: item.after } });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.APPLICATION,
            quantity: item.quantity,
            quantityBefore: item.before,
            quantityAfter: item.after,
            unitCost: item.averageCost,
            referenceType: 'APPLICATION',
            referenceId: application.id,
            notes: dto.notes?.trim(),
          },
        });
      }
      return tx.application.findUniqueOrThrow({
        where: { id: application.id },
        include: { items: { include: { product: true } }, lot: true, crop: true },
      });
    });
  }
  async void(id: string, reason: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.findUnique({ where: { id }, include: { items: true } });
      if (!application || application.isVoided) throw new BadRequestException('La aplicación no existe o ya fue anulada.');
      for (const item of application.items) {
        const inventory = await tx.inventoryItem.findUniqueOrThrow({ where: { productId: item.productId } });
        const after = inventory.quantity.plus(item.quantity);
        await tx.inventoryItem.update({ where: { productId: item.productId }, data: { quantity: after } });
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.ADJUSTMENT_IN,
            quantity: item.quantity,
            quantityBefore: inventory.quantity,
            quantityAfter: after,
            unitCost: item.averageCost,
            referenceType: 'APPLICATION_VOID',
            referenceId: application.id,
            notes: reason.trim(),
          },
        });
      }
      const result = await tx.application.update({
        where: { id },
        data: { isVoided: true, voidedAt: new Date(), voidReason: reason.trim() },
      });
      await tx.auditLog.create({ data: { entityType: 'APPLICATION', entityId: id, action: 'VOIDED', reason: reason.trim(), actorId } });
      return result;
    });
  }
}
