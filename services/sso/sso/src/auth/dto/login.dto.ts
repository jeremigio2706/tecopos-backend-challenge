import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Data Transfer Object for user login.
 */
export class LoginDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  usernameOrEmail: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  password: string;
}
