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

    const notifications = activeSubscriptions.map(async (subscription) => {
      const payload = {
        event: 'transaction.created',
        timestamp: new Date().toISOString(),
        data: transaction,
      };

      const signature = this.generateSignature(
        JSON.stringify(payload),
        subscription.secret,
      );

      try {
        await firstValueFrom(
          this.httpService.post(subscription.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
            },
            timeout: 5000,
          }),
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `Failed to send webhook to ${subscription.url}:`,
          message,
        );
      }
    });

    await Promise.allSettled(notifications);
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
