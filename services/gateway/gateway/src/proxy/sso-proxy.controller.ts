import { Controller, All, Req, Res, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('SSO Proxy')
@Controller('sso')
export class SsoProxyController {
  private readonly ssoServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.ssoServiceUrl =
      this.configService.get<string>('SSO_SERVICE_URL') ||
      'http://localhost:3001';
  }

  @Public()
  @All('*')
  @ApiOperation({ summary: 'Proxy all requests to SSO service' })
  async proxyToSso(@Req() req: Request, @Res() res: Response) {
    const path = req.url.replace('/sso', '');
    const targetUrl = `${this.ssoServiceUrl}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            host: new URL(this.ssoServiceUrl).host,
          },
        }),
      );

      res.status(response.status).json(response.data);
    } catch (error: any) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        throw new HttpException('SSO service unavailable', 503);
      }
    }
  }
}
