import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/accounts.module';
import { HealthModule } from './health/health.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [HealthModule, AccountsModule, TransactionsModule, WebhooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
