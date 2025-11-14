import { Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AccountResponseDto } from './dto/account-response.dto';

@Injectable()
export class AccountsService {
  private readonly mockApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mockApiUrl = this.configService.get<string>('MOCKAPI_URL') || '';
  }

  async findAll(userId: string): Promise<AccountResponseDto[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AccountResponseDto[]>(
          `${this.mockApiUrl}/accounts`,
          {
            params: { userId },
          },
        ),
      );
      return response.data;
    } catch {
      throw new HttpException(
        'Failed to fetch accounts from external service',
        503,
      );
    }
  }

  async findOne(id: string, userId: string): Promise<AccountResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<AccountResponseDto>(
          `${this.mockApiUrl}/accounts/${id}`,
        ),
      );

      const account = response.data;

      // Verificar que la cuenta pertenece al usuario
      if (account.userId !== userId) {
        throw new NotFoundException('Account not found');
      }

      return account;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch account from external service',
        503,
      );
    }
  }

  async getBalance(
    id: string,
    userId: string,
  ): Promise<{ balance: number; currency: string }> {
    const account = await this.findOne(id, userId);
    return {
      balance: account.balance,
      currency: account.currency,
    };
  }
}
