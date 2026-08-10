import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { HarvestGrade, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
class ExpenseDto {
  @IsUUID() cropId!: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsString() description!: string;
  @Type(() => Number) @Min(0.01) amount!: number;
}
class SaleDto {
  @IsUUID() cropId!: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsDateString() soldAt?: string;
  @Type(() => Number) @Min(0.01) total!: number;
}
class HarvestItemDto {
  @IsEnum(HarvestGrade) grade!: HarvestGrade;
  @Type(() => Number) @IsInt() @Min(1) boxes!: number;
  @IsOptional() @Type(() => Number) @Min(0) unitPrice?: number;
}
class HarvestDto {
  @IsUUID() cropId!: string;
  @IsOptional() @IsDateString() harvestedAt?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => HarvestItemDto) items!: HarvestItemDto[];
}
class HarvestPriceDto {
  @IsEnum(HarvestGrade) grade!: HarvestGrade;
  @Type(() => Number) @Min(0) unitPrice!: number;
}
class UpdateHarvestPricesDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => HarvestPriceDto) items!: HarvestPriceDto[];
}
class CustomerDto {
  @IsString() name!: string;
}
class TransportTripDto {
  @IsUUID() cropId!: string;
  @IsOptional() @IsDateString() tripDate?: string;
  @Type(() => Number) @Min(0.01) amount!: number;
  @IsOptional() @IsString() notes?: string;
}
class VoidDto {
  @IsString() @MinLength(3) reason!: string;
}
@ApiTags('Finanzas y reportes')
@Controller('finance')
export class FinanceController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('customers') customer(@Body() dto: CustomerDto) {
    return this.prisma.customer.create({ data: { name: dto.name.trim() } });
  }
  @Get('customers') customers() {
    return this.prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }
  @Patch('customers/:id') updateCustomer(@Param('id') id: string, @Body() dto: CustomerDto) {
    return this.prisma.customer.update({ where: { id }, data: { name: dto.name.trim() } });
  }
  @Patch('customers/:id/deactivate') deactivateCustomer(@Param('id') id: string) {
    return this.prisma.customer.update({ where: { id }, data: { isActive: false } });
  }
  @Post('harvests') async harvest(@Body() dto: HarvestDto) {
    const harvestedAt = dto.harvestedAt ? new Date(dto.harvestedAt) : new Date();
    await this.validCrop(dto.cropId, harvestedAt);
    const boxes = dto.items.reduce((sum, item) => sum + item.boxes, 0);
    return this.prisma.harvest.create({
      data: {
        cropId: dto.cropId,
        harvestedAt,
        quantity: new Prisma.Decimal(boxes),
        unit: 'CAJAS',
        items: {
          create: dto.items.map((item) => ({
            grade: item.grade,
            boxes: item.boxes,
            unitPrice: item.unitPrice === undefined ? null : new Prisma.Decimal(item.unitPrice),
            total: item.unitPrice === undefined ? null : new Prisma.Decimal(item.boxes).mul(item.unitPrice),
          })),
        },
      },
      include: { items: true, crop: { include: { lot: { include: { farm: true } } } } },
    });
  }
  @Get('harvests') harvests(@Query('cropId') cropId?: string) {
    return this.prisma.harvest.findMany({
      where: { isVoided: false, ...(cropId ? { cropId } : {}) },
      include: { items: true, crop: { include: { lot: { include: { farm: true } } } } },
      orderBy: { harvestedAt: 'desc' },
    });
  }
  @Patch('harvests/:id/prices') async updateHarvestPrices(@Param('id') id: string, @Body() dto: UpdateHarvestPricesDto) {
    const harvest = await this.prisma.harvest.findUniqueOrThrow({ where: { id }, include: { items: true } });
    const operations = dto.items.flatMap((update) => {
      const item = harvest.items.find((value) => value.grade === update.grade);
      return item
        ? [
            this.prisma.harvestItem.update({
              where: { id: item.id },
              data: { unitPrice: new Prisma.Decimal(update.unitPrice), total: new Prisma.Decimal(item.boxes).mul(update.unitPrice) },
            }),
          ]
        : [];
    });
    await this.prisma.$transaction(operations);
    return this.prisma.harvest.findUnique({
      where: { id },
      include: { items: true, crop: { include: { lot: { include: { farm: true } } } } },
    });
  }
  @Patch('harvests/:id/void') voidHarvest(@Param('id') id: string, @Body() dto: VoidDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    return this.voidRecord('HARVEST', id, dto.reason, actorId, () =>
      this.prisma.harvest.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidReason: dto.reason.trim() } }),
    );
  }
  @Post('transport-trips') async trip(@Body() dto: TransportTripDto) {
    const tripDate = dto.tripDate ? new Date(dto.tripDate) : new Date();
    await this.validCrop(dto.cropId, tripDate);
    return this.prisma.transportTrip.create({
      data: { cropId: dto.cropId, tripDate, amount: new Prisma.Decimal(dto.amount), notes: dto.notes?.trim() },
    });
  }
  @Get('transport-trips') trips(@Query('cropId') cropId?: string) {
    return this.prisma.transportTrip.findMany({
      where: { isVoided: false, ...(cropId ? { cropId } : {}) },
      include: { crop: { include: { lot: true } } },
      orderBy: { tripDate: 'desc' },
    });
  }
  @Patch('transport-trips/:id/void') voidTrip(
    @Param('id') id: string,
    @Body() dto: VoidDto,
    @Headers('x-agrocontrol-actor') actorId?: string,
  ) {
    return this.voidRecord('TRANSPORT_TRIP', id, dto.reason, actorId, () =>
      this.prisma.transportTrip.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidReason: dto.reason.trim() } }),
    );
  }
  @Post('expenses') async expense(@Body() dto: ExpenseDto) {
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    await this.validCrop(dto.cropId, occurredAt);
    return this.prisma.expense.create({
      data: { cropId: dto.cropId, occurredAt, description: dto.description.trim(), amount: new Prisma.Decimal(dto.amount) },
    });
  }
  @Get('expenses') expenses(@Query('cropId') cropId?: string) {
    return this.prisma.expense.findMany({
      where: { isVoided: false, ...(cropId ? { cropId } : {}) },
      include: { crop: { include: { lot: { include: { farm: true } } } } },
      orderBy: { occurredAt: 'desc' },
    });
  }
  @Patch('expenses/:id/void') voidExpense(@Param('id') id: string, @Body() dto: VoidDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    return this.voidRecord('EXPENSE', id, dto.reason, actorId, () =>
      this.prisma.expense.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidReason: dto.reason.trim() } }),
    );
  }
  @Post('sales') async sale(@Body() dto: SaleDto) {
    const soldAt = dto.soldAt ? new Date(dto.soldAt) : new Date();
    await this.validCrop(dto.cropId, soldAt);
    const code = `VTA-${((await this.prisma.sale.count()) + 1).toString().padStart(6, '0')}`;
    return this.prisma.sale.create({
      data: { code, cropId: dto.cropId, customerId: dto.customerId, soldAt, total: new Prisma.Decimal(dto.total) },
    });
  }
  @Get('sales') sales(@Query('cropId') cropId?: string) {
    return this.prisma.sale.findMany({
      where: { isVoided: false, ...(cropId ? { cropId } : {}) },
      include: { crop: { include: { lot: { include: { farm: true } } } }, customer: true },
      orderBy: { soldAt: 'desc' },
    });
  }
  @Patch('sales/:id/void') voidSale(@Param('id') id: string, @Body() dto: VoidDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    return this.voidRecord('SALE', id, dto.reason, actorId, () =>
      this.prisma.sale.update({ where: { id }, data: { isVoided: true, voidedAt: new Date(), voidReason: dto.reason.trim() } }),
    );
  }
  @Get('profitability') profitability(
    @Query('cropId') cropId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cropProfitability(cropId, startDate, endDate);
  }
  @Get('crop-profitability') cropProfitability(
    @Query('cropId') cropId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const range = this.dateRange(startDate, endDate);
    return this.buildCropReport(cropId, range);
  }
  @Get('lot-profitability') async lotProfitability(@Query('lotId') lotId: string) {
    const [lot, applications, expenses, transport, harvestItems, sales] = await Promise.all([
      this.prisma.lot.findUnique({ where: { id: lotId }, include: { farm: true, crops: true } }),
      this.prisma.application.aggregate({ where: { lotId, isVoided: false }, _sum: { totalCost: true } }),
      this.prisma.expense.aggregate({ where: { isVoided: false, crop: { lotId } }, _sum: { amount: true } }),
      this.prisma.transportTrip.aggregate({ where: { isVoided: false, crop: { lotId } }, _sum: { amount: true } }),
      this.prisma.harvestItem.aggregate({ where: { harvest: { isVoided: false, crop: { lotId } } }, _sum: { boxes: true, total: true } }),
      this.prisma.sale.aggregate({ where: { isVoided: false, crop: { lotId } }, _sum: { total: true } }),
    ]);
    const applicationCost = applications._sum.totalCost ?? new Prisma.Decimal(0);
    const expenseCost = expenses._sum.amount ?? new Prisma.Decimal(0);
    const transportCost = transport._sum.amount ?? new Prisma.Decimal(0);
    const totalCost = applicationCost.plus(expenseCost).plus(transportCost);
    const harvestValue = harvestItems._sum.total ?? new Prisma.Decimal(0);
    const salesRevenue = sales._sum.total ?? new Prisma.Decimal(0);
    const realizedRevenue = salesRevenue.isZero() ? harvestValue : salesRevenue;
    return {
      lot,
      productionBoxes: harvestItems._sum.boxes ?? 0,
      harvestValue,
      salesRevenue,
      realizedRevenue,
      applicationCost,
      expenseCost,
      transportCost,
      totalCost,
      estimatedProfit: harvestValue.minus(totalCost),
      realizedProfit: realizedRevenue.minus(totalCost),
      estimatedProfitabilityPercent: harvestValue.isZero() ? 0 : harvestValue.minus(totalCost).div(harvestValue).mul(100),
      realizedProfitabilityPercent: realizedRevenue.isZero() ? 0 : realizedRevenue.minus(totalCost).div(realizedRevenue).mul(100),
    };
  }

  private async buildCropReport(cropId: string, range?: Prisma.DateTimeFilter) {
    if (!cropId) throw new Error('Debe seleccionar un cultivo.');
    const [crop, applications, expenses, transport, harvestItems, sales] = await Promise.all([
      this.prisma.crop.findUniqueOrThrow({ where: { id: cropId }, include: { lot: { include: { farm: true } } } }),
      this.prisma.application.aggregate({
        where: { cropId, isVoided: false, ...(range ? { appliedAt: range } : {}) },
        _sum: { totalCost: true },
      }),
      this.prisma.expense.aggregate({
        where: { cropId, isVoided: false, ...(range ? { occurredAt: range } : {}) },
        _sum: { amount: true },
      }),
      this.prisma.transportTrip.aggregate({
        where: { cropId, isVoided: false, ...(range ? { tripDate: range } : {}) },
        _sum: { amount: true },
      }),
      this.prisma.harvestItem.aggregate({
        where: { harvest: { cropId, isVoided: false, ...(range ? { harvestedAt: range } : {}) } },
        _sum: { boxes: true, total: true },
      }),
      this.prisma.sale.aggregate({ where: { cropId, isVoided: false, ...(range ? { soldAt: range } : {}) }, _sum: { total: true } }),
    ]);
    const applicationCost = applications._sum.totalCost ?? new Prisma.Decimal(0);
    const expenseCost = expenses._sum.amount ?? new Prisma.Decimal(0);
    const transportCost = transport._sum.amount ?? new Prisma.Decimal(0);
    const totalCost = applicationCost.plus(expenseCost).plus(transportCost);
    const harvestValue = harvestItems._sum.total ?? new Prisma.Decimal(0);
    const salesRevenue = sales._sum.total ?? new Prisma.Decimal(0);
    // El precio por caja confirmado se considera ingreso realizado mientras no exista una venta registrada.
    const realizedRevenue = salesRevenue.isZero() ? harvestValue : salesRevenue;
    return {
      crop,
      lot: crop.lot,
      productionBoxes: harvestItems._sum.boxes ?? 0,
      harvestValue,
      salesRevenue,
      realizedRevenue,
      incomeSource: salesRevenue.isZero() ? 'COSECHA_VALORADA' : 'VENTAS_REGISTRADAS',
      applicationCost,
      expenseCost,
      transportCost,
      totalCost,
      estimatedProfit: harvestValue.minus(totalCost),
      realizedProfit: realizedRevenue.minus(totalCost),
      estimatedProfitabilityPercent: harvestValue.isZero() ? 0 : harvestValue.minus(totalCost).div(harvestValue).mul(100),
      realizedProfitabilityPercent: realizedRevenue.isZero() ? 0 : realizedRevenue.minus(totalCost).div(realizedRevenue).mul(100),
    };
  }

  private dateRange(startDate?: string, endDate?: string): Prisma.DateTimeFilter | undefined {
    if (!startDate && !endDate) return undefined;
    const range: Prisma.DateTimeFilter = {};
    if (startDate) range.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const end = new Date(`${endDate}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      range.lt = end;
    }
    return range;
  }

  private async validCrop(cropId: string, occurredAt: Date) {
    const crop = await this.prisma.crop.findUnique({ where: { id: cropId }, include: { lot: { include: { farm: true } } } });
    if (!crop) throw new BadRequestException('Cultivo no encontrado.');
    const start = new Date(crop.plantedAt);
    start.setHours(0, 0, 0, 0);
    if (occurredAt < start) throw new BadRequestException('La fecha del registro no puede ser anterior a la siembra del cultivo.');
    if (crop.isActive) {
      if (!crop.lot.isActive || !crop.lot.farm.isActive)
        throw new BadRequestException('El cultivo pertenece a una finca o lote inactivo; active la estructura antes de registrar.');
      return crop;
    }
    if (!crop.removedAt) throw new BadRequestException('El ciclo está cerrado sin fecha de retiro y no admite registros.');
    const end = new Date(crop.removedAt);
    end.setHours(23, 59, 59, 999);
    if (occurredAt > end)
      throw new BadRequestException(
        'El ciclo está cerrado. Solo se permiten registros históricos entre la siembra y el retiro de las matas.',
      );
    return crop;
  }

  private async voidRecord(
    entityType: string,
    entityId: string,
    reason: string,
    actorId: string | undefined,
    update: () => Promise<unknown>,
  ) {
    const active = await this.activeRecord(entityType, entityId);
    if (!active) throw new BadRequestException(`${this.documentLabel(entityType)} no existe o ya fue anulada.`);
    const record = await update();
    await this.prisma.auditLog.create({ data: { entityType, entityId, action: 'VOIDED', reason: reason.trim(), actorId } });
    return record;
  }

  private documentLabel(entityType: string) {
    return (
      ({ HARVEST: 'La cosecha', TRANSPORT_TRIP: 'El viaje', EXPENSE: 'El gasto', SALE: 'La venta' } as Record<string, string>)[
        entityType
      ] ?? 'El documento'
    );
  }
  private activeRecord(entityType: string, id: string) {
    if (entityType === 'HARVEST') return this.prisma.harvest.findFirst({ where: { id, isVoided: false }, select: { id: true } });
    if (entityType === 'TRANSPORT_TRIP')
      return this.prisma.transportTrip.findFirst({ where: { id, isVoided: false }, select: { id: true } });
    if (entityType === 'EXPENSE') return this.prisma.expense.findFirst({ where: { id, isVoided: false }, select: { id: true } });
    return this.prisma.sale.findFirst({ where: { id, isVoided: false }, select: { id: true } });
  }
}
