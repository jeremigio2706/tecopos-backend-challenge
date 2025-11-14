import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions for an account' })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async findAll(
    @Query('accountId') accountId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionsService.findAll(accountId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new transaction' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.create(createTransactionDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionResponseDto> {
    return this.transactionsService.findOne(id, req.user.id);
  }
}
