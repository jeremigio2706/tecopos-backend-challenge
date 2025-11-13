import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async validateToken(
    @Headers('authorization') authorization: string,
  ): Promise<any> {
    const token = authorization?.replace('Bearer ', '');
    return this.authService.validateToken(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (revoke token)' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@Headers('authorization') authorization: string): Promise<void> {
    const token = authorization?.replace('Bearer ', '');
    await this.authService.logout(token);
  }
}
