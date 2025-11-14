import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for transaction response.
 */
export class TransactionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  accountId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ['pending', 'completed', 'failed'] })
  status: string;

  @ApiProperty()
  createdAt: string;
}
