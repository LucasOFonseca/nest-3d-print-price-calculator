import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FilamentsService } from './filaments.service';
import { CreateFilamentDto } from './dto/create-filament.dto';
import { UpdateFilamentDto } from './dto/update-filament.dto';

@ApiTags('filaments')
@Controller('filaments')
export class FilamentsController {
  constructor(private readonly filamentsService: FilamentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all filaments ordered by creation date' })
  @ApiResponse({ status: 200, description: 'Return all filaments' })
  async findAll() {
    return this.filamentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single filament by id' })
  @ApiResponse({ status: 200, description: 'Return the filament' })
  @ApiResponse({ status: 404, description: 'Filament not found' })
  async findOne(@Param('id') id: string) {
    return this.filamentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new filament with calculated costPerGram' })
  @ApiResponse({ status: 201, description: 'Filament created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@Body() dto: CreateFilamentDto) {
    return this.filamentsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing filament and recalculate costPerGram' })
  @ApiResponse({ status: 200, description: 'Filament updated successfully' })
  @ApiResponse({ status: 404, description: 'Filament not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async update(@Param('id') id: string, @Body() dto: UpdateFilamentDto) {
    return this.filamentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an existing filament' })
  @ApiResponse({ status: 200, description: 'Filament deleted successfully' })
  @ApiResponse({ status: 404, description: 'Filament not found' })
  async remove(@Param('id') id: string) {
    return this.filamentsService.remove(id);
  }
}
