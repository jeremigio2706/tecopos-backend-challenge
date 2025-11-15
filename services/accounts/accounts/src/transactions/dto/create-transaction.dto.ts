import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
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
  @ApiProperty({ description: 'Account ID' })
  @IsString()
  accountId: string;

  @ApiProperty({ enum: TransactionType, description: 'Transaction type' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction amount',
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @Max(1000000, { message: 'Amount cannot exceed 1,000,000' })
  amount: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid ISO 4217 code (e.g., USD, EUR)',
  })
  currency: string;

  @ApiProperty({
    required: false,
    description: 'Transaction description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}
