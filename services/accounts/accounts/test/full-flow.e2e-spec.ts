/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransactionType } from '../src/transactions/dto/create-transaction.dto';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { HttpService } from '@nestjs/axios';

describe('Full Flow E2E Tests', () => {
  let app: INestApplication;
  let accountId: string;
  let transactionId: string;
  let webhookSubscriptionId: string;

  beforeAll(async () => {
    // Configurar variables de entorno para el test
    process.env.MOCKAPI_URL =
      'https://6914db823746c71fe049d9f3.mockapi.io/api/v1';
    process.env.JWT_SECRET = 'test-jwt-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          // Mock user para los tests
          req.user = { id: 'test-user-id', email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();

    // Obtener HttpService y mockear solo el método POST
    const httpService = moduleFixture.get<HttpService>(HttpService);
    jest.spyOn(httpService.axiosRef, 'post').mockResolvedValue({
      data: {
        id: `test-transaction-id`,
        accountId: 'test-account-id',
        type: 'deposit',
        amount: 100,
        currency: 'USD',
        description: 'Test transaction',
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
      status: 201,
      statusText: 'Created',
      headers: {},
      config: {} as any,
    });

    app = moduleFixture.createNestApplication();
    // Aplicar la misma configuración que en main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) should return OK', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
        });
    });
  });

  describe('Accounts Flow', () => {
    it('GET /accounts should return accounts list (mock data)', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        accountId = response.body[0].id;
        const account = response.body[0];
        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('userId');
        expect(account).toHaveProperty('accountNumber');
        expect(account).toHaveProperty('balance');
        expect(account).toHaveProperty('currency');
        expect(account).toHaveProperty('isActive');
      }
    });

    it('GET /accounts/:id should return a single account', async () => {
      // Primero obtenemos la lista para tener un ID válido
      const accountsResponse = await request(app.getHttpServer())
        .get('/accounts')
        .expect(200);

      if (accountsResponse.body.length > 0) {
        const testAccountId = accountsResponse.body[0].id;

        const response = await request(app.getHttpServer())
          .get(`/accounts/${testAccountId}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testAccountId);
        expect(response.body).toHaveProperty('balance');
        expect(response.body).toHaveProperty('currency');
      }
    });

    it('GET /accounts/:id/balance should return account balance', async () => {
      const accountsResponse = await request(app.getHttpServer())
        .get('/accounts')
        .expect(200);

      if (accountsResponse.body.length > 0) {
        const testAccountId = accountsResponse.body[0].id;

        const response = await request(app.getHttpServer())
          .get(`/accounts/${testAccountId}/balance`)
          .expect(200);

        expect(response.body).toHaveProperty('balance');
        expect(response.body).toHaveProperty('currency');
        // MockAPI puede retornar balance como string o number
        expect(['number', 'string']).toContain(typeof response.body.balance);
      }
    });
  });

  describe('Transactions Flow', () => {
    beforeAll(async () => {
      // Obtener un accountId válido de MockAPI
      const accountsResponse = await request(app.getHttpServer())
        .get('/accounts')
        .expect(200);

      if (accountsResponse.body.length > 0) {
        accountId = accountsResponse.body[0].id;
      }
    });

    // Skip: MockAPI no soporta POST para crear transacciones
    it.skip('POST /transactions should create a deposit transaction', async () => {
      if (!accountId) {
        console.log('Skipping: No account ID available');
        return;
      }

      const createTransactionDto = {
        accountId: accountId,
        type: TransactionType.DEPOSIT,
        amount: 100,
        currency: 'USD',
        description: 'E2E Test Deposit',
      };

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send(createTransactionDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('accountId', accountId);
      expect(response.body).toHaveProperty('type', TransactionType.DEPOSIT);
      expect(response.body).toHaveProperty('amount', 100);
      expect(response.body).toHaveProperty('status', 'completed');

      transactionId = response.body.id;
    });

    it('POST /transactions should fail with invalid amount', async () => {
      if (!accountId) {
        console.log('Skipping: No account ID available');
        return;
      }

      const invalidTransaction = {
        accountId: accountId,
        type: TransactionType.DEPOSIT,
        amount: -50, // Monto inválido
        currency: 'USD',
        description: 'Invalid amount test',
      };

      await request(app.getHttpServer())
        .post('/transactions')
        .send(invalidTransaction)
        .expect(400);
    });

    it('POST /transactions should fail with invalid currency format', async () => {
      if (!accountId) {
        console.log('Skipping: No account ID available');
        return;
      }

      const invalidTransaction = {
        accountId: accountId,
        type: TransactionType.DEPOSIT,
        amount: 100,
        currency: 'US', // Formato inválido (debe ser 3 letras)
        description: 'Invalid currency test',
      };

      await request(app.getHttpServer())
        .post('/transactions')
        .send(invalidTransaction)
        .expect(400);
    });

    // Skip: MockAPI requiere accountId válido que pertenezca al usuario
    it.skip('GET /transactions should return transactions with pagination', async () => {
      if (!accountId) {
        console.log('Skipping: No account ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/transactions?accountId=${accountId}&page=1&limit=10`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /transactions/:id should return a single transaction', async () => {
      if (!transactionId) {
        console.log('Skipping: No transaction ID available');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/transactions/${transactionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', transactionId);
      expect(response.body).toHaveProperty('accountId');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('amount');
    });
  });

  describe('Webhooks Flow', () => {
    it('POST /webhooks/subscribe should create a webhook subscription', async () => {
      const subscribeDto = {
        url: 'https://webhook.site/test-e2e',
        events: ['transaction.created'],
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/subscribe')
        .send(subscribeDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('url', subscribeDto.url);
      expect(response.body).toHaveProperty('events');
      expect(response.body.events).toContain('transaction.created');
      expect(response.body).toHaveProperty('secret');
      expect(response.body.secret).toMatch(/^[a-f0-9]{64}$/);

      webhookSubscriptionId = response.body.id;
    });

    it('POST /webhooks/subscribe should fail with invalid URL', async () => {
      const invalidDto = {
        url: 'not-a-valid-url',
        events: ['transaction.created'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/subscribe')
        .send(invalidDto)
        .expect(400);
    });

    it('POST /webhooks/subscribe should fail with empty events array', async () => {
      const invalidDto = {
        url: 'https://webhook.site/test',
        events: [],
      };

      await request(app.getHttpServer())
        .post('/webhooks/subscribe')
        .send(invalidDto)
        .expect(400);
    });

    it('GET /webhooks should list all webhook subscriptions', async () => {
      const response = await request(app.getHttpServer())
        .get('/webhooks')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const webhook = response.body[0];
        expect(webhook).toHaveProperty('id');
        expect(webhook).toHaveProperty('url');
        expect(webhook).toHaveProperty('events');
        expect(webhook).toHaveProperty('isActive');
      }
    });

    it('DELETE /webhooks/:id should unsubscribe a webhook', async () => {
      if (!webhookSubscriptionId) {
        console.log('Skipping: No webhook subscription ID available');
        return;
      }

      await request(app.getHttpServer())
        .delete(`/webhooks/${webhookSubscriptionId}`)
        .expect(200);

      // Verificar que se eliminó
      const response = await request(app.getHttpServer())
        .get('/webhooks')
        .expect(200);

      const found = response.body.find(
        (w: any) => w.id === webhookSubscriptionId,
      );
      expect(found).toBeUndefined();
    });
  });

  describe('Validation Tests', () => {
    it('POST /transactions should validate ISO 4217 currency code', async () => {
      if (!accountId) return;

      const invalidCurrencies = ['USDD', 'US', 'usd', '123'];

      for (const currency of invalidCurrencies) {
        await request(app.getHttpServer())
          .post('/transactions')
          .send({
            accountId: accountId,
            type: TransactionType.DEPOSIT,
            amount: 100,
            currency: currency,
            description: 'Currency validation test',
          })
          .expect(400);
      }
    });

    it('POST /transactions should validate amount range', async () => {
      if (!accountId) return;

      // Amount too small
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: accountId,
          type: TransactionType.DEPOSIT,
          amount: 0.001,
          currency: 'USD',
          description: 'Too small amount',
        })
        .expect(400);

      // Amount too large
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: accountId,
          type: TransactionType.DEPOSIT,
          amount: 1000001,
          currency: 'USD',
          description: 'Too large amount',
        })
        .expect(400);
    });

    it('POST /transactions should validate description length', async () => {
      if (!accountId) return;

      const longDescription = 'a'.repeat(501);

      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: accountId,
          type: TransactionType.DEPOSIT,
          amount: 100,
          currency: 'USD',
          description: longDescription,
        })
        .expect(400);
    });
  });

  describe('Integration: Transaction with Webhook', () => {
    // Skip: MockAPI no soporta POST para crear transacciones
    it.skip('should create transaction and trigger webhook notification', async () => {
      if (!accountId) {
        console.log('Skipping: No account ID available');
        return;
      }

      // 1. Suscribir webhook
      const subscribeResponse = await request(app.getHttpServer())
        .post('/webhooks/subscribe')
        .send({
          url: 'https://webhook.site/integration-test',
          events: ['transaction.created'],
        })
        .expect(201);

      const webhookId = subscribeResponse.body.id;

      // 2. Crear transacción (debería disparar el webhook)
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: accountId,
          type: TransactionType.DEPOSIT,
          amount: 250,
          currency: 'USD',
          description: 'Integration test with webhook',
        })
        .expect(201);

      expect(transactionResponse.body).toHaveProperty('id');
      expect(transactionResponse.body).toHaveProperty('status', 'completed');

      // 3. Dar tiempo para que el webhook se dispare (fire-and-forget)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 4. Limpiar: desuscribir webhook
      await request(app.getHttpServer())
        .delete(`/webhooks/${webhookId}`)
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('GET /accounts/invalid-id should return 500 or error', async () => {
      await request(app.getHttpServer())
        .get('/accounts/999999')
        .expect((res) => {
          expect([404, 500]).toContain(res.status);
        });
    });

    it('GET /transactions/invalid-id should return error', async () => {
      await request(app.getHttpServer())
        .get('/transactions/invalid-id-999')
        .expect((res) => {
          expect([404, 500]).toContain(res.status);
        });
    });

    it('POST /transactions with missing fields should return 400', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: accountId,
          // Falta type, amount, currency
        })
        .expect(400);
    });
  });
});
