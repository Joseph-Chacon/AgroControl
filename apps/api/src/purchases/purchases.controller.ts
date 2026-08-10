import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

class VoidPurchaseDto {
  @IsString() @MinLength(3) reason!: string;
}

@ApiTags('Compras')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}
  @Get()
  @ApiOperation({ summary: 'Listar compras; permite filtrar por supplierId' })
  findAll(@Query('supplierId') supplierId?: string) {
    return this.purchases.findAll(supplierId);
  }
  @Get('report/by-supplier')
  @ApiOperation({ summary: 'Total de compras agrupado por proveedor' })
  reportBySupplier() {
    return this.purchases.reportBySupplier();
  }
  @Post()
  @ApiOperation({ summary: 'Registrar compra y actualizar inventario/costo promedio' })
  create(@Body() dto: CreatePurchaseDto) {
    return this.purchases.create(dto);
  }
  @Patch(':id/void')
  @ApiOperation({ summary: 'Anular compra y reversar inventario cuando sea posible' })
  void(@Param('id') id: string, @Body() dto: VoidPurchaseDto, @Headers('x-agrocontrol-actor') actorId?: string) {
    return this.purchases.void(id, dto.reason, actorId);
  }
}
