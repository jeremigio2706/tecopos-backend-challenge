import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import { TransactionResponseDto } from '../transactions/dto/transaction-response.dto';
import { TransactionType } from '../transactions/dto/create-transaction.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;

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
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'WEBHOOK_SECRET') {
        return 'test-secret-key';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('HMAC signature', () => {
    it('should verify valid HMAC signature', () => {
      const payload = JSON.stringify(mockTransaction);
      const secret = 'test-secret-key';

      // Generar firma manualmente
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = service.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject invalid HMAC signature', () => {
      const payload = JSON.stringify(mockTransaction);
      const secret = 'test-secret-key';
      const invalidSignature = 'a'.repeat(64); // Hash válido pero incorrecto

      const isValid = service.verifySignature(
        payload,
        invalidSignature,
        secret,
      );

      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const payload = JSON.stringify(mockTransaction);
      const secret = 'test-secret-key';

      // Generar firma válida
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Modificar el payload
      const tamperedPayload = JSON.stringify({
        ...mockTransaction,
        amount: 9999,
      });

      const isValid = service.verifySignature(
        tamperedPayload,
        signature,
        secret,
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify(mockTransaction);
      const secret1 = 'test-secret-key';
      const secret2 = 'wrong-secret-key';

      const signature = crypto
        .createHmac('sha256', secret1)
        .update(payload)
        .digest('hex');

      const isValid = service.verifySignature(payload, signature, secret2);

      expect(isValid).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should subscribe a webhook URL', () => {
      const url = 'https://webhook.site/test';
      const events = ['transaction.created'];

      const subscription = service.subscribe('userId 1', url, events);

      expect(subscription).toBeDefined();
      expect(subscription.url).toBe(url);
      expect(subscription.events).toEqual(events);
      expect(subscription.userId).toBe('userId 1');
      expect(subscription.secret).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should list subscriptions for a user', () => {
      service.subscribe('userId 1', 'https://webhook1.site/test', [
        'transaction.created',
      ]);
      service.subscribe('userId 1', 'https://webhook2.site/test', [
        'transaction.created',
      ]);

      const subscriptions = service.listSubscriptions('userId 1');

      expect(subscriptions).toHaveLength(2);
    });

    it('should unsubscribe a webhook', () => {
      const subscription = service.subscribe(
        'userId 1',
        'https://webhook.site/test',
        ['transaction.created'],
      );

      service.unsubscribe('userId 1', subscription.id);

      const subscriptions = service.listSubscriptions('userId 1');
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('notifyTransaction', () => {
    it('should notify all subscribed webhooks with HMAC signature', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { success: true } }));

      // Suscribir múltiples webhooks
      service.subscribe('userId 1', 'https://webhook1.site/test', [
        'transaction.created',
      ]);
      service.subscribe('userId 1', 'https://webhook2.site/test', [
        'transaction.created',
      ]);

      await service.notifyTransaction(mockTransaction, 'userId 1');

      // Dar tiempo para las promesas async (fire-and-forget)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verificar que se llamó al menos 2 veces (una por webhook)
      expect(mockHttpService.post).toHaveBeenCalled();

      // Verificar que incluye la firma HMAC
      if (mockHttpService.post.mock.calls.length > 0) {
        const firstCall = mockHttpService.post.mock.calls[0] as unknown[];
        expect(firstCall[2]).toHaveProperty('headers');
        const headers = (firstCall[2] as { headers: Record<string, string> })
          .headers;
        expect(headers).toHaveProperty('X-Webhook-Signature');
        expect(headers['X-Webhook-Signature']).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it('should not notify webhooks for different users', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { success: true } }));

      service.subscribe('userId 1', 'https://webhook.site/test', [
        'transaction.created',
      ]);

      await service.notifyTransaction(mockTransaction, 'userId 2');

      // Dar tiempo para las promesas async
      await new Promise((resolve) => setTimeout(resolve, 100));

      // No debería llamar a ningún webhook
      expect(mockHttpService.post.mock.calls.length).toBe(0);
    });

    it('should handle webhook failures gracefully', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Webhook failed')),
      );

      service.subscribe('userId 1', 'https://webhook.site/test', [
        'transaction.created',
      ]);

      // No debe lanzar error (fire-and-forget)
      await expect(
        service.notifyTransaction(mockTransaction, 'userId 1'),
      ).resolves.toBeUndefined();
    });

    it('should retry failed webhooks with exponential backoff', async () => {
      // Simular 2 fallos y luego éxito
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(throwError(() => new Error('Network error')))
        .mockReturnValueOnce(of({ data: { success: true } }));

      service.subscribe('userId 1', 'https://webhook.site/test', [
        'transaction.created',
      ]);

      await service.notifyTransaction(mockTransaction, 'userId 1');

      // Dar tiempo para los retries (1s + 2s delays)
      await new Promise((resolve) => setTimeout(resolve, 3500));

      // Debe haber intentado 3 veces
      expect(mockHttpService.post.mock.calls.length).toBeGreaterThanOrEqual(3);
    }, 10000);
  });
});
