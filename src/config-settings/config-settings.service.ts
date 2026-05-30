import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEnergyDto } from './dto/update-energy.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { UpdateLaborDto } from './dto/update-labor.dto';
import { UpdateProfitDto } from './dto/update-profit.dto';
import { ImportConfigDto } from './dto/import-config.dto';

@Injectable()
export class ConfigSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const [energy, printer, labor, profit, filaments, packaging] = await Promise.all([
      this.prisma.energyConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.printerConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.laborConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.profitConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.filament.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.packaging.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    return { filaments, packaging, energy, printer, labor, profit };
  }

  async updateEnergy(dto: UpdateEnergyDto) {
    return this.prisma.energyConfig.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', kwhPrice: 0.85, printerConsumption: 150, ...dto },
    });
  }

  async updatePrinter(dto: UpdatePrinterDto) {
    return this.prisma.printerConfig.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', wearCostPerHour: 1.50, ...dto },
    });
  }

  async updateLabor(dto: UpdateLaborDto) {
    return this.prisma.laborConfig.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', hourlyRate: 30.00, ...dto },
    });
  }

  async updateProfit(dto: UpdateProfitDto) {
    return this.prisma.profitConfig.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', defaultProfitMargin: 35, ...dto },
    });
  }

  async restoreDefaults() {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all filaments and packaging
      await tx.filament.deleteMany();
      await tx.packaging.deleteMany();

      // 2. Reset all four configs to default values
      await tx.energyConfig.upsert({
        where: { id: 'singleton' },
        update: { kwhPrice: 0.85, printerConsumption: 150 },
        create: { id: 'singleton', kwhPrice: 0.85, printerConsumption: 150 },
      });
      await tx.printerConfig.upsert({
        where: { id: 'singleton' },
        update: { wearCostPerHour: 1.50 },
        create: { id: 'singleton', wearCostPerHour: 1.50 },
      });
      await tx.laborConfig.upsert({
        where: { id: 'singleton' },
        update: { hourlyRate: 30.00 },
        create: { id: 'singleton', hourlyRate: 30.00 },
      });
      await tx.profitConfig.upsert({
        where: { id: 'singleton' },
        update: { defaultProfitMargin: 35 },
        create: { id: 'singleton', defaultProfitMargin: 35 },
      });

      // 3. Re-create default filaments and packaging (same as seed data)
      await tx.filament.createMany({
        data: [
          { name: 'PLA Branco', spoolWeight: 1000, spoolPrice: 89.90, costPerGram: 0.0899 },
          { name: 'PLA Preto',  spoolWeight: 1000, spoolPrice: 89.90, costPerGram: 0.0899 },
          { name: 'PETG Azul',  spoolWeight: 1000, spoolPrice: 119.90, costPerGram: 0.1199 },
        ],
      });

      await tx.packaging.createMany({
        data: [
          { name: 'Caixa de Papelão Padrão', quantity: 10, packagePrice: 35.00, costPerUnit: 3.50 },
          { name: 'Saco Bolha Grande',       quantity: 50, packagePrice: 45.00, costPerUnit: 0.90 },
        ],
      });

      // 4. Return the complete config via transactions reads
      const [energy, printer, labor, profit, filaments, packaging] = await Promise.all([
        tx.energyConfig.findUnique({ where: { id: 'singleton' } }),
        tx.printerConfig.findUnique({ where: { id: 'singleton' } }),
        tx.laborConfig.findUnique({ where: { id: 'singleton' } }),
        tx.profitConfig.findUnique({ where: { id: 'singleton' } }),
        tx.filament.findMany({ orderBy: { createdAt: 'asc' } }),
        tx.packaging.findMany({ orderBy: { createdAt: 'asc' } }),
      ]);

      return { filaments, packaging, energy, printer, labor, profit };
    });
  }

  async importConfig(dto: ImportConfigDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete all existing filaments and packaging
      await tx.filament.deleteMany();
      await tx.packaging.deleteMany();

      // 2. Update all four configs with imported values
      await tx.energyConfig.upsert({
        where: { id: 'singleton' },
        update: { kwhPrice: dto.energy.kwhPrice, printerConsumption: dto.energy.printerConsumption },
        create: { id: 'singleton', kwhPrice: dto.energy.kwhPrice, printerConsumption: dto.energy.printerConsumption },
      });
      await tx.printerConfig.upsert({
        where: { id: 'singleton' },
        update: { wearCostPerHour: dto.printer.wearCostPerHour },
        create: { id: 'singleton', wearCostPerHour: dto.printer.wearCostPerHour },
      });
      await tx.laborConfig.upsert({
        where: { id: 'singleton' },
        update: { hourlyRate: dto.labor.hourlyRate },
        create: { id: 'singleton', hourlyRate: dto.labor.hourlyRate },
      });
      await tx.profitConfig.upsert({
        where: { id: 'singleton' },
        update: { defaultProfitMargin: dto.profit.defaultProfitMargin },
        create: { id: 'singleton', defaultProfitMargin: dto.profit.defaultProfitMargin },
      });

      // 3. Insert new filaments (calculate costPerGram = spoolPrice / spoolWeight)
      if (dto.filaments && dto.filaments.length > 0) {
        await tx.filament.createMany({
          data: dto.filaments.map((f) => ({
            name: f.name,
            spoolWeight: f.spoolWeight,
            spoolPrice: f.spoolPrice,
            costPerGram: f.spoolPrice / f.spoolWeight,
          })),
        });
      }

      // 4. Insert new packaging (calculate costPerUnit = packagePrice / quantity)
      if (dto.packaging && dto.packaging.length > 0) {
        await tx.packaging.createMany({
          data: dto.packaging.map((p) => ({
            name: p.name,
            quantity: p.quantity,
            packagePrice: p.packagePrice,
            costPerUnit: p.packagePrice / p.quantity,
          })),
        });
      }

      // 5. Return complete config
      const [energy, printer, labor, profit, filaments, packaging] = await Promise.all([
        tx.energyConfig.findUnique({ where: { id: 'singleton' } }),
        tx.printerConfig.findUnique({ where: { id: 'singleton' } }),
        tx.laborConfig.findUnique({ where: { id: 'singleton' } }),
        tx.profitConfig.findUnique({ where: { id: 'singleton' } }),
        tx.filament.findMany({ orderBy: { createdAt: 'asc' } }),
        tx.packaging.findMany({ orderBy: { createdAt: 'asc' } }),
      ]);

      return { filaments, packaging, energy, printer, labor, profit };
    });
  }

  async exportConfig() {
    return this.getConfig();
  }
}
