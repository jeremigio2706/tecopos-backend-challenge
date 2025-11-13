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
@Controller('accounts')
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

  @All('*')
  @ApiOperation({
    summary: 'Proxy all requests to Accounts service (requires authentication)',
  })
  async proxyToAccounts(@Req() req: Request, @Res() res: Response) {
    const path = req.url.replace('/accounts', '');
    const targetUrl = `${this.accountsServiceUrl}${path}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            host: new URL(this.accountsServiceUrl).host,
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
