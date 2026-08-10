import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SequenceService } from '../sequence/sequence.service';
import { AgricultureController } from './agriculture.controller';
@Module({ controllers: [AgricultureController], providers: [PrismaService, SequenceService] })
export class AgricultureModule {}
