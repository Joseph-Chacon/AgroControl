import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationsService } from './applications.service';

class VoidApplicationDto { @IsString() @MinLength(3) reason!: string; }

@ApiTags('Aplicaciones')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}
  @Get() @ApiOperation({ summary: 'Listar aplicaciones y sus costos' })
  findAll() { return this.applications.findAll(); }
  @Post() @ApiOperation({ summary: 'Registrar aplicación, descontar inventario y calcular costo' })
  create(@Body() dto: CreateApplicationDto) { return this.applications.create(dto); }
  @Patch(':id/void')
  void(@Param('id') id: string, @Body() dto: VoidApplicationDto, @Headers('x-agrocontrol-actor') actorId?: string) { return this.applications.void(id, dto.reason, actorId); }
}
