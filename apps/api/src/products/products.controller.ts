import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProductDto, ProductPresentationDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() @ApiOperation({ summary: 'Listar productos e inventario actual' })
  findAll() { return this.products.findAll(); }
  @Post() @ApiOperation({ summary: 'Crear producto con código automático' }) @ApiCreatedResponse()
  create(@Body() dto: CreateProductDto) { return this.products.create(dto); }
  @Post(':id/presentations') @ApiOperation({ summary: 'Agregar una presentación comercial al producto' })
  addPresentation(@Param('id') id: string, @Body() dto: ProductPresentationDto) { return this.products.addPresentation(id, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CreateProductDto) { return this.products.update(id, dto); }
  @Patch(':id/deactivate') deactivate(@Param('id') id: string) { return this.products.deactivate(id); }
}
