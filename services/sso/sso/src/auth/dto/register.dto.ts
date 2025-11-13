import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for user registration.
 */
export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;
}
