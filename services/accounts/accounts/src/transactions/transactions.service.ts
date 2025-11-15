import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CreateTransactionDto,
  TransactionType,
} from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AccountsService } from '../accounts/accounts.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { RetryHelper } from '../common/helpers/retry.helper';
import { CircuitBreaker } from '../common/helpers/circuit-breaker.helper';

@Injectable()
export class TransactionsService {
  private readonly mockApiUrl: string;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly webhooksService: WebhooksService,
    private readonly accountsService: AccountsService,
  ) {
    this.mockApiUrl = this.configService.get<string>('MOCKAPI_URL') || '';
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  async findAll(
    accountId: string,
    userId: string,
    pagination: PaginationDto = { page: 1, limit: 10 },
  ): Promise<TransactionResponseDto[]> {
    // Verificar que la cuenta pertenece al usuario
    await this.accountsService.findOne(accountId, userId);

    return this.circuitBreaker.execute(() =>
      RetryHelper.withRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.get<TransactionResponseDto[]>(
              `${this.mockApiUrl}/transactions`,
              {
                params: {
                  accountId,
                  page: pagination.page,
                  limit: pagination.limit,
                },
              },
            ),
          );
          return response.data;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
        },
      ),
    );
  }

  async create(
    createTransactionDto: CreateTransactionDto,
    userId: string,
  ): Promise<TransactionResponseDto> {
    // Verificar que la cuenta pertenece al usuario
    const account = await this.accountsService.findOne(
      createTransactionDto.accountId,
      userId,
    );

    // Validar que la cuenta esté activa
    if (!account.isActive) {
      throw new BadRequestException('Account is not active');
    }

    // Validar que las monedas coincidan
    if (account.currency !== createTransactionDto.currency) {
      throw new BadRequestException(
        `Currency mismatch: Account uses ${account.currency}, transaction uses ${createTransactionDto.currency}`,
      );
    }

    // Validar fondos para retiros
    if (createTransactionDto.type === TransactionType.WITHDRAWAL) {
      if (account.balance < createTransactionDto.amount) {
        throw new BadRequestException(
          `Insufficient funds: Available ${account.balance} ${account.currency}, Required ${createTransactionDto.amount} ${createTransactionDto.currency}`,
        );
      }
    }

    // Validar fondos para transferencias
    if (createTransactionDto.type === TransactionType.TRANSFER) {
      if (account.balance < createTransactionDto.amount) {
        throw new BadRequestException(
          `Insufficient funds for transfer: Available ${account.balance} ${account.currency}`,
        );
      }
    }

    const transaction = await this.circuitBreaker.execute(() =>
      RetryHelper.withRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.post<TransactionResponseDto>(
              `${this.mockApiUrl}/transactions`,
              {
                ...createTransactionDto,
                status: 'completed',
                createdAt: new Date().toISOString(),
              },
            ),
          );
          return response.data;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
        },
      ),
    );

    // Disparar webhooks (fire and forget)
    this.webhooksService
      .notifyTransaction(transaction, userId)
      .catch((error) => {
        console.error('Failed to send webhook notification:', error);
      });

    return transaction;
  }

  async findOne(id: string, userId: string): Promise<TransactionResponseDto> {
    return this.circuitBreaker.execute(() =>
      RetryHelper.withRetry(
        async () => {
          const response = await firstValueFrom(
            this.httpService.get<TransactionResponseDto>(
              `${this.mockApiUrl}/transactions/${id}`,
            ),
          );

          const transaction = response.data;

          // Verificar que la cuenta de la transacción pertenece al usuario
          await this.accountsService.findOne(transaction.accountId, userId);

          return transaction;
        },
        {
          maxAttempts: 3,
          delayMs: 1000,
        },
      ),
    );
  }
}
