import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [HttpModule],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
