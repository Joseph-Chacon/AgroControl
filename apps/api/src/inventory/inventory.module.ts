import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryController } from './inventory.controller';
import { SequenceService } from '../sequence/sequence.service';
@Module({ controllers: [InventoryController], providers: [PrismaService, SequenceService] })
export class InventoryModule {}
