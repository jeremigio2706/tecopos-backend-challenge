import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TransactionsService } from './transactions.service';
import { AccountsService } from '../accounts/accounts.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import {
  CreateTransactionDto,
  TransactionType,
} from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { AccountResponseDto } from '../accounts/dto/account-response.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockAccount: AccountResponseDto = {
    id: '1',
    userId: 'userId 1',
    accountNumber: 'ACC001',
    accountType: 'checking',
    balance: 1000,
    currency: 'USD',
    bankName: 'Test Bank',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const mockTransaction: TransactionResponseDto = {
    id: '1',
    accountId: '1',
    type: TransactionType.DEPOSIT,
    amount: 100,
    currency: 'USD',
    description: 'Test deposit',
    status: 'completed',
    createdAt: new Date().toISOString(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockAccountsService = {
    findOne: jest.fn(),
  };

  const mockWebhooksService = {
    notifyTransaction: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'MOCKAPI_URL') {
        return 'https://mockapi.test/api/v1';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: WebhooksService, useValue: mockWebhooksService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [mockTransaction];
      mockAccountsService.findOne.mockResolvedValue(mockAccount);
      mockHttpService.get.mockReturnValue(of({ data: mockTransactions }));

      const result = await service.findAll('1', 'userId 1', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockTransactions);
      expect(mockAccountsService.findOne).toHaveBeenCalledWith('1', 'userId 1');
    });
  });

  describe('create', () => {
    const createDto: CreateTransactionDto = {
      accountId: '1',
      type: TransactionType.DEPOSIT,
      amount: 100,
      currency: 'USD',
      description: 'Test deposit',
    };

    it('should create a deposit transaction successfully', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount);
      mockHttpService.post.mockReturnValue(of({ data: mockTransaction }));

      const result = await service.create(createDto, 'userId 1');

      expect(result).toEqual(mockTransaction);
      expect(mockAccountsService.findOne).toHaveBeenCalledWith('1', 'userId 1');
      expect(mockWebhooksService.notifyTransaction).toHaveBeenCalledWith(
        mockTransaction,
        'userId 1',
      );
    });

    it('should throw BadRequestException if account is not active', async () => {
      const inactiveAccount = { ...mockAccount, isActive: false };
      mockAccountsService.findOne.mockResolvedValue(inactiveAccount);

      await expect(service.create(createDto, 'userId 1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'userId 1')).rejects.toThrow(
        'Account is not active',
      );
    });

    it('should throw BadRequestException if currency mismatch', async () => {
      const wrongCurrencyDto = { ...createDto, currency: 'EUR' };
      mockAccountsService.findOne.mockResolvedValue(mockAccount);

      await expect(
        service.create(wrongCurrencyDto, 'userId 1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(wrongCurrencyDto, 'userId 1'),
      ).rejects.toThrow('Currency mismatch');
    });

    it('should throw BadRequestException for withdrawal with insufficient funds', async () => {
      const withdrawalDto: CreateTransactionDto = {
        accountId: '1',
        type: TransactionType.WITHDRAWAL,
        amount: 2000,
        currency: 'USD',
        description: 'Test withdrawal',
      };
      mockAccountsService.findOne.mockResolvedValue(mockAccount);

      await expect(service.create(withdrawalDto, 'userId 1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(withdrawalDto, 'userId 1')).rejects.toThrow(
        'Insufficient funds',
      );
    });

    it('should throw BadRequestException for transfer with insufficient funds', async () => {
      const transferDto: CreateTransactionDto = {
        accountId: '1',
        type: TransactionType.TRANSFER,
        amount: 1500,
        currency: 'USD',
        description: 'Test transfer',
      };
      mockAccountsService.findOne.mockResolvedValue(mockAccount);

      await expect(service.create(transferDto, 'userId 1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(transferDto, 'userId 1')).rejects.toThrow(
        'Insufficient funds for transfer',
      );
    });

    it('should retry on failure', async () => {
      mockAccountsService.findOne.mockResolvedValue(mockAccount);
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => new Error('Timeout')))
        .mockReturnValueOnce(of({ data: mockTransaction }));

      const result = await service.create(createDto, 'userId 1');

      expect(result).toEqual(mockTransaction);
    });
  });

  describe('findOne', () => {
    it('should return a single transaction', async () => {
      mockHttpService.get.mockReturnValue(of({ data: mockTransaction }));
      mockAccountsService.findOne.mockResolvedValue(mockAccount);

      const result = await service.findOne('1', 'userId 1');

      expect(result).toEqual(mockTransaction);
      expect(mockAccountsService.findOne).toHaveBeenCalledWith('1', 'userId 1');
    });
  });
});
