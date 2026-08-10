import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceController } from './finance.controller';
@Module({ controllers: [FinanceController], providers: [PrismaService] })
export class FinanceModule {}
