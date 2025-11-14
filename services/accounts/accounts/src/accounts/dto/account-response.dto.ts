import { ApiProperty } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty({ enum: ['checking', 'savings', 'credit'] })
  accountType: string;

  @ApiProperty()
  balance: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;
}
