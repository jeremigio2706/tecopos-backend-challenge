import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { TransactionResponseDto } from '../transactions/dto/transaction-response.dto';

export interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret: string;
  createdAt: Date;
}

@Injectable()
export class WebhooksService {
  private subscriptions: Map<string, WebhookSubscription[]> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  subscribe(
    userId: string,
    url: string,
    events: string[],
  ): WebhookSubscription {
    const subscription: WebhookSubscription = {
      id: crypto.randomUUID(),
      userId,
      url,
      events,
      isActive: true,
      secret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date(),
    };

    const userSubscriptions = this.subscriptions.get(userId) || [];
    userSubscriptions.push(subscription);
    this.subscriptions.set(userId, userSubscriptions);

    return subscription;
  }

  unsubscribe(userId: string, subscriptionId: string): void {
    const userSubscriptions = this.subscriptions.get(userId) || [];
    const updatedSubscriptions = userSubscriptions.filter(
      (sub) => sub.id !== subscriptionId,
    );
    this.subscriptions.set(userId, updatedSubscriptions);
  }

  listSubscriptions(userId: string): WebhookSubscription[] {
    return this.subscriptions.get(userId) || [];
  }

  async notifyTransaction(
    transaction: TransactionResponseDto,
    userId: string,
  ): Promise<void> {
    const userSubscriptions = this.subscriptions.get(userId) || [];
    const activeSubscriptions = userSubscriptions.filter(
      (sub) => sub.isActive && sub.events.includes('transaction.created'),
    );

    console.log(
      `Notifying ${activeSubscriptions.length} webhooks for transaction ${transaction.id}`,
    );

    const notifications = activeSubscriptions.map(async (subscription) =>
      this.sendWebhookWithRetry(subscription, transaction),
    );

    await Promise.allSettled(notifications);
  }

  private async sendWebhookWithRetry(
    subscription: WebhookSubscription,
    transaction: TransactionResponseDto,
    attempt: number = 1,
  ): Promise<void> {
    const payload = {
      event: 'transaction.created',
      timestamp: new Date().toISOString(),
      data: transaction,
    };

    const signature = this.generateSignature(
      JSON.stringify(payload),
      subscription.secret,
    );

    const maxAttempts = 3;
    const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

    try {
      console.log(
        `[Webhook] Attempt ${attempt}/${maxAttempts} - Sending to ${subscription.url}`,
      );

      await firstValueFrom(
        this.httpService.post(subscription.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Attempt': attempt.toString(),
          },
          timeout: 5000,
        }),
      );

      console.log(
        `[Webhook] SUCCESS - Attempt ${attempt} to ${subscription.url}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Webhook] FAILED - Attempt ${attempt}/${maxAttempts} to ${subscription.url}: ${message}`,
      );

      if (attempt < maxAttempts) {
        const delay = delays[attempt - 1];
        console.log(`[Webhook] Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.sendWebhookWithRetry(
          subscription,
          transaction,
          attempt + 1,
        );
      } else {
        console.error(
          `[Webhook] EXHAUSTED - All ${maxAttempts} attempts failed for ${subscription.url}`,
        );
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
