import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import express from 'express';
import { ConfigSettingsService } from './config-settings.service';
import { UpdateEnergyDto } from './dto/update-energy.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { UpdateLaborDto } from './dto/update-labor.dto';
import { UpdateProfitDto } from './dto/update-profit.dto';
import { ImportConfigDto } from './dto/import-config.dto';

@ApiTags('config')
@Controller('config')
export class ConfigSettingsController {
  constructor(private readonly configSettingsService: ConfigSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get complete application configuration' })
  @ApiResponse({
    status: 200,
    description: 'Return all configurations, filaments, and packaging',
  })
  async getConfig() {
    return this.configSettingsService.getConfig();
  }

  @Patch('energy')
  @ApiOperation({ summary: 'Update energy configuration singleton' })
  @ApiResponse({
    status: 200,
    description: 'Energy configuration updated successfully',
  })
  async updateEnergy(@Body() dto: UpdateEnergyDto) {
    return this.configSettingsService.updateEnergy(dto);
  }

  @Patch('printer')
  @ApiOperation({ summary: 'Update printer configuration singleton' })
  @ApiResponse({
    status: 200,
    description: 'Printer configuration updated successfully',
  })
  async updatePrinter(@Body() dto: UpdatePrinterDto) {
    return this.configSettingsService.updatePrinter(dto);
  }

  @Patch('labor')
  @ApiOperation({ summary: 'Update labor configuration singleton' })
  @ApiResponse({
    status: 200,
    description: 'Labor configuration updated successfully',
  })
  async updateLabor(@Body() dto: UpdateLaborDto) {
    return this.configSettingsService.updateLabor(dto);
  }

  @Patch('profit')
  @ApiOperation({ summary: 'Update profit configuration singleton' })
  @ApiResponse({
    status: 200,
    description: 'Profit configuration updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed (defaultProfitMargin must be between 0 and 100)',
  })
  async updateProfit(@Body() dto: UpdateProfitDto) {
    return this.configSettingsService.updateProfit(dto);
  }

  @Post('restore-defaults')
  @ApiOperation({ summary: 'Restore configurations and data to seed defaults' })
  @ApiResponse({
    status: 200,
    description:
      'Defaults restored successfully, returns complete configuration',
  })
  async restoreDefaults() {
    return this.configSettingsService.restoreDefaults();
  }

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="config.json"')
  @Header('Content-Type', 'application/json')
  @ApiOperation({ summary: 'Export configuration as JSON file download' })
  @ApiResponse({
    status: 200,
    description: 'JSON file download containing application configuration',
  })
  async exportConfig(@Res({ passthrough: true }) res: express.Response) {
    return this.configSettingsService.exportConfig();
  }

  @Post('import')
  @ApiOperation({
    summary:
      'Import complete configuration, replacing all current configurations, filaments, and packaging',
  })
  @ApiResponse({
    status: 201,
    description:
      'Configuration imported successfully, returns complete configuration',
  })
  @ApiResponse({ status: 400, description: 'Invalid import payload' })
  async importConfig(@Body() dto: ImportConfigDto) {
    return this.configSettingsService.importConfig(dto);
  }
}
