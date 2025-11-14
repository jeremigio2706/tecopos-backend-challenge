import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a transaction.
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
}

/**
 * Data Transfer Object for creating a transaction.
 */
export class CreateTransactionDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
