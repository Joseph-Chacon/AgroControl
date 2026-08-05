import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
class SupplierDto { @IsString() @MinLength(2) name!: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsEmail() email?: string; }
@ApiTags('Proveedores') @Controller('suppliers')
export class SuppliersController { constructor(private readonly prisma: PrismaService) {} @Get() findAll() { return this.prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }); } @Post() create(@Body() dto: SupplierDto) { return this.prisma.supplier.create({ data: { name: dto.name.trim(), phone: dto.phone?.trim(), email: dto.email?.toLowerCase() } }); } @Patch(':id') update(@Param('id') id:string,@Body() dto:SupplierDto){return this.prisma.supplier.update({where:{id},data:{name:dto.name.trim(),phone:dto.phone?.trim(),email:dto.email?.toLowerCase()}})} @Patch(':id/deactivate') deactivate(@Param('id') id:string){return this.prisma.supplier.update({where:{id},data:{isActive:false}})} }
