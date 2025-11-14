import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [HttpModule, WebhooksModule, AccountsModule],
  providers: [TransactionsService],
  controllers: [TransactionsController],
})
export class TransactionsModule {}
