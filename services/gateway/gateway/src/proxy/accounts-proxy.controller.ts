import {
  Controller,
  All,
  Req,
  Res,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Accounts Proxy')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsProxyController {
  private readonly accountsServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accountsServiceUrl =
      this.configService.get<string>('ACCOUNTS_SERVICE_URL') ||
      'http://localhost:3002';
  }

  @All('accounts*')
  @ApiOperation({ summary: 'Proxy accounts requests' })
  async proxyAccounts(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res);
  }

  @All('transactions*')
  @ApiOperation({ summary: 'Proxy transactions requests' })
  async proxyTransactions(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res);
  }

  @All('webhooks*')
  @ApiOperation({ summary: 'Proxy webhooks requests' })
  async proxyWebhooks(@Req() req: Request, @Res() res: Response) {
    return this.proxyRequest(req, res);
  }

  private async proxyRequest(req: Request, res: Response) {
    const targetUrl = `${this.accountsServiceUrl}${req.url}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            host: new URL(this.accountsServiceUrl).host,
            // Pasar el user desde el request autenticado
            'x-user-id': (req as any).user?.id,
          },
        }),
      );

      res.status(response.status).json(response.data);
    } catch (error: any) {
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        throw new HttpException('Accounts service unavailable', 503);
      }
    }
  }
}
