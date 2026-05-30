import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved quotes ordered newest-first' })
  @ApiResponse({ status: 200, description: 'List of all quotes' })
  async findAll() {
    return this.quotesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create and save a new quote snapshot' })
  @ApiResponse({ status: 201, description: 'Quote created and calculated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Filament not found' })
  async create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single saved quote by id' })
  @ApiResponse({ status: 200, description: 'The requested quote details' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved quote by id' })
  @ApiResponse({ status: 200, description: 'Quote deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async remove(@Param('id') id: string) {
    return this.quotesService.remove(id);
  }

  @Post(':id/load')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Load the printJob details from a saved quote to repopulate the calculator' })
  @ApiResponse({ status: 200, description: 'The printJob configuration of the quote' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async loadQuote(@Param('id') id: string) {
    return this.quotesService.loadQuote(id);
  }
}
