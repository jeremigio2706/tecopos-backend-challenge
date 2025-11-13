import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for token response.
 */
export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken?: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string = 'Bearer';
}
