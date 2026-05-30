import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateDto } from './dto/calculate.dto';

@Injectable()
export class CalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(dto: CalculateDto) {
    const filament = await this.prisma.filament.findUnique({
      where: { id: dto.filamentId },
    });
    if (!filament) {
      throw new NotFoundException('Filament not found');
    }

    let packagingCost = 0;
    if (dto.includePackaging && dto.packagingId) {
      const pkg = await this.prisma.packaging.findUnique({
        where: { id: dto.packagingId },
      });
      if (pkg) {
        packagingCost = pkg.costPerUnit;
      }
    }

    const [energy, printer, labor, profit] = await Promise.all([
      this.prisma.energyConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.printerConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.laborConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.profitConfig.findUnique({ where: { id: 'singleton' } }),
    ]);

    const kwhPrice = energy?.kwhPrice ?? 0.85;
    const printerConsumption = energy?.printerConsumption ?? 150;
    const wearCostPerHour = printer?.wearCostPerHour ?? 1.50;
    const hourlyRate = labor?.hourlyRate ?? 30.00;
    const defaultProfitMargin = profit?.defaultProfitMargin ?? 35;

    const printTime = dto.printTimeHours + dto.printTimeMinutes / 60;

    const postProcessingTime = dto.includePostProcessing
      ? (dto.paintTimeHours + dto.paintTimeMinutes / 60) +
        (dto.assemblyTimeHours + dto.assemblyTimeMinutes / 60) +
        (dto.finishingTimeHours + dto.finishingTimeMinutes / 60)
      : 0;

    const filamentCost = dto.materialUsed * filament.costPerGram;
    const energyCost = (printerConsumption / 1000) * printTime * kwhPrice;
    const printerWear = printTime * wearCostPerHour;
    const laborCost = (printTime * 0.1 + postProcessingTime) * hourlyRate;
    const totalCost = filamentCost + energyCost + printerWear + laborCost + packagingCost;

    const margin = dto.useDefaultMargin ? defaultProfitMargin : dto.profitMargin;
    const profitAmount = totalCost * (margin / 100);
    const finalPrice = totalCost + profitAmount;

    return {
      filamentCost,
      energyCost,
      printerWear,
      laborCost,
      packagingCost,
      totalCost,
      profit: profitAmount,
      finalPrice,
    };
  }
}
