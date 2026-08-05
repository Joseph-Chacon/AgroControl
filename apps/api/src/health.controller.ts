import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verificar disponibilidad de la API' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', service: 'agrocontrol-api' },
    },
  })
  getHealth(): { status: 'ok'; service: 'agrocontrol-api' } {
    return { status: 'ok', service: 'agrocontrol-api' };
  }
}
