// services/sso/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

/**
 * Service responsible for authentication operations.
 */

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenResponseDto> {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: registerDto.email }, { username: registerDto.username }],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === registerDto.email
          ? 'Email already in use'
          : 'Username already taken',
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        username: registerDto.username,
        password: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      },
    });

    // Generar tokens
    return this.generateTokens(user.id, user.username);
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    // Buscar usuario por email o username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: loginDto.usernameOrEmail },
          { username: loginDto.usernameOrEmail },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Generar tokens
    return this.generateTokens(user.id, user.username);
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        username: string;
      }>(token);

      // Verificar si el token está revocado
      const tokenRecord = await this.prisma.token.findUnique({
        where: { token },
      });

      if (tokenRecord?.isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Obtener información del usuario
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async logout(token: string): Promise<void> {
    // Revocar token
    await this.prisma.token.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  }

  private async generateTokens(
    userId: string,
    username: string,
  ): Promise<TokenResponseDto> {
    const payload = { sub: userId, username };
    const expiresIn = this.configService.get<number>('JWT_EXPIRES_IN', 3600);

    const accessToken = this.jwtService.sign(payload, {
      expiresIn,
    });

    // Guardar token en la base de datos
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1); // Sumar 1 hora

    await this.prisma.token.create({
      data: {
        userId,
        token: accessToken,
        type: 'ACCESS',
        expiresAt: expirationDate,
      },
    });

    return {
      accessToken,
      expiresIn: 3600, // 1 hora en segundos
      tokenType: 'Bearer',
    };
  }
}
