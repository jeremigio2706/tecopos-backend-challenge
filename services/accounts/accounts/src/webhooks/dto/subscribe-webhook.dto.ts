import { IsString, IsUrl, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeWebhookDto {
  @ApiProperty({
    description: 'Webhook URL endpoint',
    example: 'https://webhook.site/unique-url',
  })
  @IsUrl({}, { message: 'URL must be a valid HTTP/HTTPS URL' })
  url: string;

  @ApiProperty({
    description: 'Events to subscribe to',
    example: ['transaction.created'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one event must be specified' })
  @IsString({ each: true })
  events: string[];
}
