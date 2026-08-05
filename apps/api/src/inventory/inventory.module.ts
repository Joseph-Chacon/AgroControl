import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryController } from './inventory.controller';
@Module({ controllers: [InventoryController], providers: [PrismaService] }) export class InventoryModule {}
