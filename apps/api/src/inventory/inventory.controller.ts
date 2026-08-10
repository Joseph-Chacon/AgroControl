import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Min, MinLength, ValidateNested } from 'class-validator';
import { MovementType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';

class MovementQueryDto { @IsOptional() @IsUUID() productId?: string; }
class AdjustmentDto { @IsUUID() productId!: string; @IsEnum(MovementType) type!: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'; @Type(() => Number) @Min(0.0001) quantity!: number; @IsString() @MinLength(3) reason!: string; @IsOptional() @IsBoolean() isInitial?: boolean; @IsOptional() @Type(() => Number) @Min(0.000001) unitCost?: number; }
class TransformationItemDto { @IsUUID() productId!: string; @Type(() => Number) @Min(0.0001) quantity!: number; }
class CreateTransformationDto { @IsUUID() outputProductId!: string; @Type(() => Number) @Min(0.0001) outputQuantity!: number; @IsOptional() @IsString() notes?: string; @IsArray() @ArrayMinSize(2) @ValidateNested({ each: true }) @Type(() => TransformationItemDto) items!: TransformationItemDto[]; }
class VoidTransformationDto { @IsString() @MinLength(3) reason!: string; }

@ApiTags('Inventario')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly prisma: PrismaService, private readonly sequence: SequenceService) {}
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
  @Get('transformations') @ApiOperation({ summary: 'Listar preparaciones o transformaciones de inventario' })
  transformations() { return this.prisma.inventoryTransformation.findMany({ where: { isVoided: false }, include: { outputProduct: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }); }
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
  @Post('transformations') @ApiOperation({ summary: 'Combinar insumos y registrar el producto obtenido con su costo real' })
  async transform(@Body() dto: CreateTransformationDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    if (new Set(dto.items.map(item => item.productId)).size !== dto.items.length) throw new BadRequestException('Un producto origen solo puede aparecer una vez.');
    if (dto.items.some(item => item.productId === dto.outputProductId)) throw new BadRequestException('El producto obtenido no puede utilizarse como insumo de la misma preparación.');
    const code = await this.sequence.next('INVENTORY_TRANSFORMATION', 'PRE');
    return this.prisma.$transaction(async tx => {
      const output = await tx.product.findUnique({ where: { id: dto.outputProductId }, include: { inventory: true } });
      if (!output?.isActive || !output.inventory) throw new BadRequestException('El producto obtenido no existe o está inactivo.');
      const inputs = await Promise.all(dto.items.map(async item => ({ item, product: await tx.product.findUnique({ where: { id: item.productId }, include: { inventory: true } }) })));
      if (inputs.some(({ product }) => !product?.isActive || !product.inventory)) throw new BadRequestException('Uno de los productos origen no existe o está inactivo.');
      if (inputs.some(({ product }) => product!.baseUnit !== output.baseUnit)) throw new BadRequestException(`Todos los productos deben usar la unidad ${output.baseUnit}.`);
      const inputCosts = inputs.map(({ item, product }) => {
        const quantity = new Prisma.Decimal(item.quantity);
        const inventory = product!.inventory!;
        if (inventory.quantity.lessThan(quantity)) throw new BadRequestException(`Inventario insuficiente para ${product!.name}.`);
        return { product: product!, inventory, quantity, unitCost: inventory.averageCost, totalCost: quantity.mul(inventory.averageCost) };
      });
      const totalCost = inputCosts.reduce((sum, item) => sum.plus(item.totalCost), new Prisma.Decimal(0));
      const outputQuantity = new Prisma.Decimal(dto.outputQuantity);
      const outputUnitCost = totalCost.div(outputQuantity);
      const transformation = await tx.inventoryTransformation.create({ data: { code, outputProductId: output.id, outputQuantity, totalCost, notes: dto.notes?.trim() || null } });
      for (const input of inputCosts) {
        const after = input.inventory.quantity.minus(input.quantity);
        await tx.inventoryTransformationItem.create({ data: { transformationId: transformation.id, productId: input.product.id, quantity: input.quantity, unitCost: input.unitCost, totalCost: input.totalCost } });
        await tx.inventoryItem.update({ where: { productId: input.product.id }, data: { quantity: after } });
        await tx.inventoryMovement.create({ data: { productId: input.product.id, type: MovementType.TRANSFORMATION_OUT, quantity: input.quantity, quantityBefore: input.inventory.quantity, quantityAfter: after, unitCost: input.unitCost, referenceType: 'INVENTORY_TRANSFORMATION', referenceId: transformation.id, notes: `Preparación ${code}` } });
      }
      const outputAfter = output.inventory.quantity.plus(outputQuantity);
      const outputAverageCost = output.inventory.quantity.mul(output.inventory.averageCost).plus(totalCost).div(outputAfter);
      await tx.inventoryItem.update({ where: { productId: output.id }, data: { quantity: outputAfter, averageCost: outputAverageCost, lastCost: outputUnitCost } });
      await tx.inventoryMovement.create({ data: { productId: output.id, type: MovementType.TRANSFORMATION_IN, quantity: outputQuantity, quantityBefore: output.inventory.quantity, quantityAfter: outputAfter, unitCost: outputUnitCost, referenceType: 'INVENTORY_TRANSFORMATION', referenceId: transformation.id, notes: `Preparación ${code}` } });
      await tx.auditLog.create({ data: { entityType: 'INVENTORY_TRANSFORMATION', entityId: transformation.id, action: 'CREATED', reason: dto.notes?.trim() || null, actorId } });
      return tx.inventoryTransformation.findUniqueOrThrow({ where: { id: transformation.id }, include: { outputProduct: true, items: { include: { product: true } } } });
    });
  }
  @Patch('transformations/:id/void') @ApiOperation({ summary: 'Anular una preparación y devolver los insumos al inventario' })
  async voidTransformation(@Param('id') id: string, @Body() dto: VoidTransformationDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    return this.prisma.$transaction(async tx => {
      const transformation = await tx.inventoryTransformation.findUnique({ where: { id }, include: { outputProduct: { include: { inventory: true } }, items: { include: { product: { include: { inventory: true } } } } } });
      if (!transformation || transformation.isVoided) throw new BadRequestException('La preparación no existe o ya fue anulada.');
      const outputInventory = transformation.outputProduct.inventory;
      if (!outputInventory || outputInventory.quantity.lessThan(transformation.outputQuantity)) throw new BadRequestException('No se puede anular: el producto preparado ya fue usado o no tiene existencia suficiente.');
      const outputAfter = outputInventory.quantity.minus(transformation.outputQuantity);
      await tx.inventoryItem.update({ where: { productId: transformation.outputProductId }, data: { quantity: outputAfter } });
      await tx.inventoryMovement.create({ data: { productId: transformation.outputProductId, type: MovementType.TRANSFORMATION_OUT, quantity: transformation.outputQuantity, quantityBefore: outputInventory.quantity, quantityAfter: outputAfter, unitCost: transformation.totalCost.div(transformation.outputQuantity), referenceType: 'INVENTORY_TRANSFORMATION_VOID', referenceId: transformation.id, notes: dto.reason.trim() } });
      for (const item of transformation.items) {
        const inventory = item.product.inventory;
        if (!inventory) throw new BadRequestException(`El inventario de ${item.product.name} no está disponible.`);
        const after = inventory.quantity.plus(item.quantity);
        const averageCost = inventory.quantity.mul(inventory.averageCost).plus(item.totalCost).div(after);
        await tx.inventoryItem.update({ where: { productId: item.productId }, data: { quantity: after, averageCost, lastCost: item.unitCost } });
        await tx.inventoryMovement.create({ data: { productId: item.productId, type: MovementType.TRANSFORMATION_IN, quantity: item.quantity, quantityBefore: inventory.quantity, quantityAfter: after, unitCost: item.unitCost, referenceType: 'INVENTORY_TRANSFORMATION_VOID', referenceId: transformation.id, notes: dto.reason.trim() } });
      }
      const result = await tx.inventoryTransformation.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidReason: dto.reason.trim() } });
      await tx.auditLog.create({ data: { entityType: 'INVENTORY_TRANSFORMATION', entityId: id, action: 'VOIDED', reason: dto.reason.trim(), actorId } });
      return result;
    });
  }
}
