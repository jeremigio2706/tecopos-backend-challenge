import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import type { WebhookSubscription } from './webhooks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { SubscribeWebhookDto } from './dto/subscribe-webhook.dto';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to webhook notifications' })
  subscribe(
    @Body() dto: SubscribeWebhookDto,
    @Req() req: AuthenticatedRequest,
  ): WebhookSubscription {
    return this.webhooksService.subscribe(req.user.id, dto.url, dto.events);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook subscriptions' })
  listSubscriptions(@Req() req: AuthenticatedRequest): WebhookSubscription[] {
    return this.webhooksService.listSubscriptions(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unsubscribe from webhook' })
  unsubscribe(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    this.webhooksService.unsubscribe(req.user.id, id);
    return { message: 'Unsubscribed successfully' };
  }
}
