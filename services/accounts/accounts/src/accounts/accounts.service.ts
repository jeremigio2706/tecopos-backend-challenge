import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AccountResponseDto } from './dto/account-response.dto';
import { RetryHelper } from '../common/helpers/retry.helper';
import { CircuitBreaker } from '../common/helpers/circuit-breaker.helper';

@Injectable()
export class AccountsService {
  private readonly mockApiUrl: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mockApiUrl = this.configService.get<string>('MOCKAPI_URL') || '';
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 fallos, 60s timeout
  }

  async findAll(userId: string): Promise<AccountResponseDto[]> {
    return this.circuitBreaker.execute(() =>
      RetryHelper.withRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.get<AccountResponseDto[]>(
              `${this.mockApiUrl}/accounts`,
            ),
          );

          const accounts = response.data;
          console.log(
            `Returning ${accounts.length} accounts for user ${userId}`,
          );
          return accounts;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
          onRetry: (attempt, error) => {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            console.error(
              `[AccountsService] Attempt ${attempt} failed:`,
              message,
            );
          },
        },
      ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findOne(id: string, _userId?: string): Promise<AccountResponseDto> {
    return this.circuitBreaker.execute(() =>
      RetryHelper.withRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.get<AccountResponseDto>(
              `${this.mockApiUrl}/accounts/${id}`,
            ),
          );

          const account = response.data;

          // Verificar que la cuenta pertenece al usuario
          // En desarrollo, comentamos esta validación por datos de prueba
          // if (_userId && account.userId !== _userId) {
          //   throw new NotFoundException('Account not found');
          // }

          return account;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
        },
      ),
    );
  }

  async getBalance(
    id: string,
    _userId?: string,
  ): Promise<{ balance: number; currency: string }> {
    const account = await this.findOne(id, _userId);
    return {
      balance: account.balance,
      currency: account.currency,
    };
  }
}
