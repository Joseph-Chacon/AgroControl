import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('bootstrap-admin') @ApiOperation({ summary: 'Crear el primer administrador; se bloquea tras usarlo.' })
  bootstrapAdmin(@Body() dto: BootstrapAdminDto) { return this.auth.bootstrapAdmin(dto); }
  @Post('login') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }
}
