import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

class AuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

const labels: Record<string, string> = {
  PURCHASE: 'Compra',
  APPLICATION: 'Aplicación',
  INVENTORY_ADJUSTMENT: 'Ajuste de inventario',
  HARVEST: 'Cosecha',
  TRANSPORT_TRIP: 'Viaje',
  EXPENSE: 'Gasto',
  SALE: 'Venta',
};

@ApiTags('Auditoría')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar historial de auditoría' })
  async findAll(@Query() query: AuditQueryDto) {
    const entries = await this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: query.limit ?? 100 });
    const actorIds = [...new Set(entries.flatMap((entry) => (entry.actorId ? [entry.actorId] : [])))];
    const users = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const userById = new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim() || user.email]));
    return entries.map((entry) => ({
      id: entry.id,
      entityType: entry.entityType,
      document: `${labels[entry.entityType] ?? entry.entityType} · ${entry.entityId.slice(0, 8).toUpperCase()}`,
      action: entry.action,
      reason: entry.reason,
      actor: entry.actorId ? (userById.get(entry.actorId) ?? 'Usuario no disponible') : 'No disponible',
      createdAt: entry.createdAt,
    }));
  }
}
