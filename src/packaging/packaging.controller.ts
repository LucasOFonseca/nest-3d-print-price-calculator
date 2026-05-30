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
import { PackagingService } from './packaging.service';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';

@ApiTags('packaging')
@Controller('packaging')
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all packaging options ordered by creation date' })
  @ApiResponse({ status: 200, description: 'Return all packaging options' })
  async findAll() {
    return this.packagingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single packaging option by id' })
  @ApiResponse({ status: 200, description: 'Return the packaging option' })
  @ApiResponse({ status: 404, description: 'Packaging option not found' })
  async findOne(@Param('id') id: string) {
    return this.packagingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new packaging option with calculated costPerUnit' })
  @ApiResponse({ status: 201, description: 'Packaging option created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@Body() dto: CreatePackagingDto) {
    return this.packagingService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing packaging option and recalculate costPerUnit' })
  @ApiResponse({ status: 200, description: 'Packaging option updated successfully' })
  @ApiResponse({ status: 404, description: 'Packaging option not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async update(@Param('id') id: string, @Body() dto: UpdatePackagingDto) {
    return this.packagingService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an existing packaging option' })
  @ApiResponse({ status: 200, description: 'Packaging option deleted successfully' })
  @ApiResponse({ status: 404, description: 'Packaging option not found' })
  async remove(@Param('id') id: string) {
    return this.packagingService.remove(id);
  }
}
