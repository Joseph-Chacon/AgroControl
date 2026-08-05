import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(key: string, prefix: string): Promise<string> {
    const sequence = await this.prisma.$transaction(async (tx) => {
      await tx.sequence.upsert({ where: { key }, update: {}, create: { key, prefix, value: 0 } });
      return tx.sequence.update({ where: { key }, data: { value: { increment: 1 } } });
    });
    return `${sequence.prefix}-${sequence.value.toString().padStart(6, '0')}`;
  }
}
