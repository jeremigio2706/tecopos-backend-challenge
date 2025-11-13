import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: any) {
    // Validar token contra el servicio SSO
    const ssoUrl = this.configService.get<string>('SSO_SERVICE_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${ssoUrl}/auth/validate`, {
          token: payload,
        }),
      );

      return response.data;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
