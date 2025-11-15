import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AccountsService } from './accounts.service';
import { AccountResponseDto } from './dto/account-response.dto';

describe('AccountsService', () => {
  let service: AccountsService;

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

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
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
        AccountsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all accounts for a user', async () => {
      const mockAccounts = [mockAccount];
      mockHttpService.get.mockReturnValue(of({ data: mockAccounts }));

      const result = await service.findAll('userId 1');

      expect(result).toEqual(mockAccounts);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://mockapi.test/api/v1/accounts',
      );
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockAccounts = [mockAccount];
      mockHttpService.get
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of({ data: mockAccounts }));

      const result = await service.findAll('userId 1');

      expect(result).toEqual(mockAccounts);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(service.findAll('userId 1')).rejects.toThrow(
        'Network error',
      );
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
    });

    it('should trigger circuit breaker after multiple failures', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Service unavailable')),
      );

      // Intentar 5 veces para abrir el circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(service.findAll('userId 1')).rejects.toThrow();
      }

      // El circuit breaker debería estar abierto ahora
      await expect(service.findAll('userId 1')).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
    }, 30000);
  });

  describe('findOne', () => {
    it('should return a single account', async () => {
      mockHttpService.get.mockReturnValue(of({ data: mockAccount }));

      const result = await service.findOne('1', 'userId 1');

      expect(result).toEqual(mockAccount);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://mockapi.test/api/v1/accounts/1',
      );
    });

    it('should retry on failure', async () => {
      // Reset mock para este test específico
      jest.clearAllMocks();

      mockHttpService.get
        .mockReturnValueOnce(throwError(() => new Error('Timeout')))
        .mockReturnValueOnce(of({ data: mockAccount }));

      const result = await service.findOne('1', 'userId 1');

      expect(result).toEqual(mockAccount);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBalance', () => {
    it('should return account balance', async () => {
      mockHttpService.get.mockReturnValue(of({ data: mockAccount }));

      const result = await service.getBalance('1', 'userId 1');

      expect(result).toEqual({
        balance: 1000,
        currency: 'USD',
      });
    });
  });
});
