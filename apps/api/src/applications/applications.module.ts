import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
@Module({ controllers: [ApplicationsController], providers: [ApplicationsService, PrismaService, SequenceService] })
export class ApplicationsModule {}
