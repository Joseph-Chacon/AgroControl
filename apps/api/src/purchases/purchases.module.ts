import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
@Module({ controllers: [PurchasesController], providers: [PurchasesService, PrismaService, SequenceService] }) export class PurchasesModule {}
