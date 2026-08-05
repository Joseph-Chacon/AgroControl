import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { MovementType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

class MovementQueryDto { @IsOptional() @IsUUID() productId?: string; }
class AdjustmentDto { @IsUUID() productId!: string; @IsEnum(MovementType) type!: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'; @Type(() => Number) @Min(0.0001) quantity!: number; @IsString() @MinLength(3) reason!: string; @IsOptional() @IsBoolean() isInitial?: boolean; @IsOptional() @Type(() => Number) @Min(0.000001) unitCost?: number; }

@ApiTags('Inventario')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @ApiOperation({ summary: 'Consultar existencias, último costo y costo promedio' })
  summary() { return this.prisma.inventoryItem.findMany({ include: { product: true }, orderBy: { product: { name: 'asc' } } }); }
  @Get('indicators') @ApiOperation({ summary: 'Consultar indicadores y alertas de inventario mínimo' })
  async indicators() {
    const [items, activeCrops] = await Promise.all([this.prisma.inventoryItem.findMany({ where: { product: { isActive: true } }, include: { product: true }, orderBy: { product: { name: 'asc' } } }), this.prisma.crop.count({ where: { isActive: true } })]);
    const lowStock = items.filter(item => item.product.minStock.gt(0) && item.quantity.lessThanOrEqualTo(item.product.minStock)).map(item => ({ productId: item.productId, name: item.product.name, quantity: item.quantity, minStock: item.product.minStock, baseUnit: item.product.baseUnit }));
    const inventoryValue = items.reduce((total, item) => total.plus(item.quantity.mul(item.averageCost)), new Prisma.Decimal(0));
    return { productCount: items.length, activeCrops, inventoryValue: inventoryValue.toFixed(2), lowStock };
  }
  @Get('movements') @ApiOperation({ summary: 'Consultar kardex de movimientos de inventario' })
  movements(@Query() query: MovementQueryDto) { return this.prisma.inventoryMovement.findMany({ where: query.productId ? { productId: query.productId } : {}, include: { product: true }, orderBy: { occurredAt: 'desc' } }); }
  @Get(':productId') @ApiOperation({ summary: 'Consultar inventario y kardex de un producto' })
  detail(@Param('productId') productId: string) { return Promise.all([this.prisma.inventoryItem.findUnique({ where: { productId }, include: { product: true } }), this.prisma.inventoryMovement.findMany({ where: { productId }, orderBy: { occurredAt: 'desc' } })]); }
  @Post('adjustments') @ApiOperation({ summary: 'Ajustar inventario con motivo y movimiento trazable' })
  async adjust(@Body() dto: AdjustmentDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    return this.prisma.$transaction(async tx => {
      const inventory = await tx.inventoryItem.findUnique({ where: { productId: dto.productId } });
      if (!inventory) throw new BadRequestException('El producto seleccionado no existe o no tiene inventario inicializado.');
      if (dto.isInitial && dto.type !== MovementType.ADJUSTMENT_IN) throw new BadRequestException('El inventario inicial solo puede registrarse como entrada.');
      if (dto.isInitial && inventory.quantity.greaterThan(0)) throw new BadRequestException('Este producto ya tiene existencia. Use un ajuste normal para corregirlo.');
      if (dto.isInitial && dto.unitCost === undefined) throw new BadRequestException('Indique el costo unitario para el inventario inicial.');
      const quantity = new Prisma.Decimal(dto.quantity);
      const after = dto.type === MovementType.ADJUSTMENT_IN ? inventory.quantity.plus(quantity) : inventory.quantity.minus(quantity);
      if (after.isNegative()) throw new BadRequestException('El ajuste no puede dejar inventario negativo.');
      const referenceId = randomUUID();
      const unitCost = dto.isInitial ? new Prisma.Decimal(dto.unitCost!) : inventory.averageCost;
      await tx.inventoryItem.update({ where: { productId: dto.productId }, data: { quantity: after, ...(dto.isInitial ? { averageCost: unitCost, lastCost: unitCost } : {}) } });
      const movement = await tx.inventoryMovement.create({ data: { productId: dto.productId, type: dto.type, quantity, quantityBefore: inventory.quantity, quantityAfter: after, unitCost, referenceType: dto.isInitial ? 'INITIAL_INVENTORY' : 'INVENTORY_ADJUSTMENT', referenceId, notes: dto.reason.trim() } });
      await tx.auditLog.create({ data: { entityType: dto.isInitial ? 'INITIAL_INVENTORY' : 'INVENTORY_ADJUSTMENT', entityId: referenceId, action: dto.type, reason: dto.reason.trim(), actorId } });
      return movement;
    });
  }
}
