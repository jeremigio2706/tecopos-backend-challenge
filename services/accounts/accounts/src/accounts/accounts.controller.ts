import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountResponseDto } from './dto/account-response.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts for authenticated user' })
  @ApiResponse({ status: 200, type: [AccountResponseDto] })
  async findAll(
    @Req() req: AuthenticatedRequest,
  ): Promise<AccountResponseDto[]> {
    return this.accountsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account details' })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AccountResponseDto> {
    return this.accountsService.findOne(id, req.user.id);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({ status: 200 })
  async getBalance(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.accountsService.getBalance(id, req.user.id);
  }
}
