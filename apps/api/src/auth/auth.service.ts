import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async bootstrapAdmin(dto: BootstrapAdminDto) {
    if (await this.prisma.user.count()) throw new ConflictException('La configuración inicial ya fue completada.');
    if (dto.setupToken !== this.config.getOrThrow<string>('INITIAL_SETUP_TOKEN'))
      throw new UnauthorizedException('Token de configuración inválido.');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.upsert({ where: { code: 'ADMIN' }, update: {}, create: { code: 'ADMIN', name: 'Administrador' } });
      const created = await tx.user.create({
        data: { email: dto.email.toLowerCase(), firstName: dto.firstName, lastName: dto.lastName, passwordHash },
      });
      await tx.userRole.create({ data: { userId: created.id, roleId: role.id } });
      return { ...created, roles: ['ADMIN'] };
    });
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, roles: user.roles });
    return { accessToken, user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, roles: user.roles } };
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Credenciales inválidas.');
    const roles = user.roles.map(({ role }) => role.code);
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, roles });
    return { accessToken, user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`, roles } };
  }
}
