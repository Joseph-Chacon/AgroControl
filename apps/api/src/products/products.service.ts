import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly sequence: SequenceService) {}

  findAll() {
    return this.prisma.product.findMany({ include: { inventory: true }, orderBy: { name: 'asc' } });
  }

  update(id: string, dto: CreateProductDto) { return this.prisma.product.update({ where: { id }, data: { name: dto.name.trim(), baseUnit: dto.baseUnit, minStock: dto.minStock } }); }
  deactivate(id: string) { return this.prisma.product.update({ where: { id }, data: { isActive: false } }); }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({ where: { name: { equals: dto.name, mode: 'insensitive' } } });
    if (existing) throw new ConflictException('Ya existe un producto con ese nombre.');
    const code = await this.sequence.next('PRODUCT', 'PRD');
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { code, name: dto.name.trim(), baseUnit: dto.baseUnit, minStock: dto.minStock } });
      await tx.inventoryItem.create({ data: { productId: product.id } });
      return product;
    });
  }
}
