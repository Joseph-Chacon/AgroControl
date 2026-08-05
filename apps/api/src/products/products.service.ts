import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { CreateProductDto, ProductPresentationDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly sequence: SequenceService) {}

  findAll() {
    return this.prisma.product.findMany({ include: { inventory: true, presentations: { where: { isActive: true }, orderBy: { contentQuantity: 'asc' } } }, orderBy: { name: 'asc' } });
  }

  update(id: string, dto: CreateProductDto) { return this.prisma.product.update({ where: { id }, data: { name: dto.name.trim(), baseUnit: dto.baseUnit, minStock: dto.minStock } }); }
  deactivate(id: string) { return this.prisma.product.update({ where: { id }, data: { isActive: false } }); }

  async addPresentation(productId: string, dto: ProductPresentationDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product?.isActive) throw new ConflictException('El producto no existe o está inactivo.');
    const existing = await this.prisma.productPresentation.findFirst({ where: { productId, name: { equals: dto.name.trim(), mode: 'insensitive' } } });
    if (existing) throw new ConflictException('Ya existe una presentación con ese nombre para este producto.');
    return this.prisma.productPresentation.create({ data: { productId, name: dto.name.trim(), contentQuantity: dto.contentQuantity } });
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({ where: { name: { equals: dto.name, mode: 'insensitive' } } });
    if (existing) throw new ConflictException('Ya existe un producto con ese nombre.');
    const code = await this.sequence.next('PRODUCT', 'PRD');
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { code, name: dto.name.trim(), baseUnit: dto.baseUnit, minStock: dto.minStock } });
      await tx.inventoryItem.create({ data: { productId: product.id } });
      if (dto.presentations?.length) {
        const names = dto.presentations.map((presentation) => presentation.name.trim().toLocaleLowerCase());
        if (new Set(names).size !== names.length) throw new ConflictException('No se puede repetir una presentación para el mismo producto.');
        await tx.productPresentation.createMany({ data: dto.presentations.map((presentation) => ({ productId: product.id, name: presentation.name.trim(), contentQuantity: presentation.contentQuantity })) });
      }
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { inventory: true, presentations: true } });
    });
  }
}
