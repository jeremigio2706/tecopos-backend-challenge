import { Injectable, HttpException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class TransactionsService {
  private readonly mockApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly webhooksService: WebhooksService,
    private readonly accountsService: AccountsService,
  ) {
    this.mockApiUrl = this.configService.get<string>('MOCKAPI_URL') || '';
  }

  async findAll(
    accountId: string,
    userId: string,
  ): Promise<TransactionResponseDto[]> {
    // Verificar que la cuenta pertenece al usuario
    await this.accountsService.findOne(accountId, userId);

    try {
      const response = await firstValueFrom(
        this.httpService.get<TransactionResponseDto[]>(
          `${this.mockApiUrl}/transactions`,
          {
            params: { accountId },
          },
        ),
      );
      return response.data;
    } catch {
      throw new HttpException(
        'Failed to fetch transactions from external service',
        503,
      );
    }
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

    // Validar fondos para retiros
    if (
      createTransactionDto.type === TransactionType.WITHDRAWAL &&
      account.balance < createTransactionDto.amount
    ) {
      throw new BadRequestException('Insufficient funds');
    }

    try {
      // Crear transacción en MockAPI
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

      const transaction = response.data;

      // Disparar webhooks (fire and forget)
      this.webhooksService
        .notifyTransaction(transaction, userId)
        .catch((error) => {
          console.error('Failed to send webhook notification:', error);
        });

      return transaction;
    } catch {
      throw new HttpException(
        'Failed to create transaction in external service',
        503,
      );
    }
  }

  async findOne(id: string, userId: string): Promise<TransactionResponseDto> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TransactionResponseDto>(
          `${this.mockApiUrl}/transactions/${id}`,
        ),
      );

      const transaction = response.data;

      // Verificar que la cuenta de la transacción pertenece al usuario
      await this.accountsService.findOne(transaction.accountId, userId);

      return transaction;
    } catch {
      throw new HttpException(
        'Failed to fetch transaction from external service',
        503,
      );
    }
  }
}
