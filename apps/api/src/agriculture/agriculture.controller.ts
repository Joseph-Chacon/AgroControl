import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';

class FarmDto {
  @IsString() @MinLength(2) name!: string;
}
class LotDto {
  @IsString() @MinLength(2) name!: string;
  @IsUUID() farmId!: string;
}
class CropDto {
  @IsString() @MinLength(2) name!: string;
  @IsUUID() lotId!: string;
  @IsOptional() @IsDateString() plantedAt?: string;
  @IsInt() @Min(1) plantedPlants!: number;
}
class RemoveCropDto {
  @IsDateString() removedAt!: string;
}
class NameDto {
  @IsString() @MinLength(2) name!: string;
}

@ApiTags('Estructura agrícola')
@Controller('agriculture')
export class AgricultureController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequence: SequenceService,
  ) {}
  @Get('farms')
  @ApiOperation({ summary: 'Consultar fincas, lotes y ciclos de cultivo' })
  async farms() {
    const farms = await this.prisma.farm.findMany({
      where: { isActive: true },
      include: { lots: { where: { isActive: true }, include: { crops: true } } },
    });
    return farms.map((farm) => ({
      ...farm,
      lots: farm.lots.map((lot) => ({
        ...lot,
        crops: lot.crops.map((crop) => ({ ...crop, daysPlanted: this.days(crop.plantedAt, crop.removedAt) })),
      })),
    }));
  }
  @Post('farms') farm(@Body() dto: FarmDto) {
    return this.prisma.farm.create({ data: { name: dto.name.trim() } });
  }
  @Patch('farms/:id') updateFarm(@Param('id') id: string, @Body() dto: NameDto) {
    return this.prisma.farm.update({ where: { id }, data: { name: dto.name.trim() } });
  }
  @Patch('farms/:id/deactivate') deactivateFarm(@Param('id') id: string) {
    return this.prisma.farm.update({ where: { id }, data: { isActive: false } });
  }
  @Post('lots') async lot(@Body() dto: LotDto) {
    const farm = await this.prisma.farm.findUnique({ where: { id: dto.farmId } });
    if (!farm) throw new BadRequestException('Finca no encontrada.');
    if (!farm.isActive) throw new BadRequestException('No se puede crear un lote dentro de una finca inactiva.');
    return this.prisma.lot.create({ data: { name: dto.name.trim(), farmId: dto.farmId, code: await this.sequence.next('LOT', 'LOT') } });
  }
  @Patch('lots/:id') updateLot(@Param('id') id: string, @Body() dto: NameDto) {
    return this.prisma.lot.update({ where: { id }, data: { name: dto.name.trim() } });
  }
  @Patch('lots/:id/deactivate') deactivateLot(@Param('id') id: string) {
    return this.prisma.lot.update({ where: { id }, data: { isActive: false } });
  }
  @Post('crops') async crop(@Body() dto: CropDto) {
    const lot = await this.prisma.lot.findUnique({ where: { id: dto.lotId }, include: { farm: true } });
    if (!lot) throw new BadRequestException('Lote no encontrado.');
    if (!lot.isActive || !lot.farm.isActive) throw new BadRequestException('No se puede crear un cultivo en una finca o lote inactivo.');
    return this.prisma.crop.create({
      data: {
        name: dto.name.trim(),
        lotId: dto.lotId,
        plantedAt: dto.plantedAt ? new Date(dto.plantedAt) : new Date(),
        plantedPlants: dto.plantedPlants,
      },
    });
  }
  @Patch('crops/:cropId') updateCrop(@Param('cropId') id: string, @Body() dto: NameDto) {
    return this.prisma.crop.update({ where: { id }, data: { name: dto.name.trim() } });
  }
  @Patch('crops/:cropId/remove')
  @ApiOperation({ summary: 'Cerrar ciclo de cultivo al retirar las matas' })
  async removeCrop(@Param('cropId') cropId: string, @Body() dto: RemoveCropDto) {
    const crop = await this.prisma.crop.findUnique({ where: { id: cropId } });
    if (!crop) throw new BadRequestException('Cultivo no encontrado.');
    const removedAt = new Date(dto.removedAt);
    if (removedAt < crop.plantedAt) throw new BadRequestException('La fecha de retiro no puede ser anterior a la siembra.');
    return this.prisma.crop.update({ where: { id: cropId }, data: { removedAt, isActive: false } });
  }
  private days(plantedAt: Date, removedAt: Date | null): number {
    return Math.floor((Number(removedAt ?? new Date()) - Number(plantedAt)) / 86_400_000);
  }
}
