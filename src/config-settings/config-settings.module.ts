import { Module } from '@nestjs/common';
import { ConfigSettingsService } from './config-settings.service';
import { ConfigSettingsController } from './config-settings.controller';

@Module({
  controllers: [ConfigSettingsController],
  providers: [ConfigSettingsService],
})
export class ConfigSettingsModule {}
