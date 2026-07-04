import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateDto } from './dto/calculate.dto';

@Injectable()
export class CalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(dto: CalculateDto) {
    // ── Filament cost ─────────────────────────────────────────────────────────
    let filamentCost = 0;

    if (dto.filaments && dto.filaments.length > 0) {
      // Multi-filament mode
      const filamentIds = dto.filaments.map((f) => f.filamentId);
      const filaments = await this.prisma.filament.findMany({
        where: { id: { in: filamentIds } },
      });

      const missingIds = filamentIds.filter(
        (id) => !filaments.some((f) => f.id === id),
      );
      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Filament(s) not found: ${missingIds.join(', ')}`,
        );
      }

      const filamentMap = new Map(filaments.map((f) => [f.id, f]));
      filamentCost = dto.filaments.reduce((sum, item) => {
        const filament = filamentMap.get(item.filamentId)!;
        return sum + item.materialUsed * filament.costPerGram;
      }, 0);
    } else if (dto.filamentId && dto.materialUsed !== undefined) {
      // Single-filament mode (backwards-compatible)
      const filament = await this.prisma.filament.findUnique({
        where: { id: dto.filamentId },
      });
      if (!filament) {
        throw new NotFoundException('Filament not found');
      }
      filamentCost = dto.materialUsed * filament.costPerGram;
    } else {
      throw new BadRequestException(
        'Provide either "filaments" (multi-filament) or "filamentId" + "materialUsed" (single-filament)',
      );
    }

    // ── Packaging cost ────────────────────────────────────────────────────────
    let packagingCost = 0;
    if (dto.includePackaging && dto.packagingIds && dto.packagingIds.length > 0) {
      const packages = await this.prisma.packaging.findMany({
        where: { id: { in: dto.packagingIds } },
      });
      packagingCost = dto.packagingIds.reduce((sum, id) => {
        const pkg = packages.find((p) => p.id === id);
        return sum + (pkg ? pkg.costPerUnit : 0);
      }, 0);
    }

    // ── Config ────────────────────────────────────────────────────────────────
    const [energy, printer, labor, profit] = await Promise.all([
      this.prisma.energyConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.printerConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.laborConfig.findUnique({ where: { id: 'singleton' } }),
      this.prisma.profitConfig.findUnique({ where: { id: 'singleton' } }),
    ]);

    const kwhPrice = energy?.kwhPrice ?? 0.85;
    const printerConsumption = energy?.printerConsumption ?? 150;
    const wearCostPerHour = printer?.wearCostPerHour ?? 1.5;
    const hourlyRate = labor?.hourlyRate ?? 30.0;
    const defaultProfitMargin = profit?.defaultProfitMargin ?? 35;

    // ── Time calculations ─────────────────────────────────────────────────────
    const printTime = dto.printTimeHours + dto.printTimeMinutes / 60;

    const postProcessingTime = dto.includePostProcessing
      ? (dto.paintTimeHours + dto.paintTimeMinutes / 60) +
        (dto.assemblyTimeHours + dto.assemblyTimeMinutes / 60) +
        (dto.finishingTimeHours + dto.finishingTimeMinutes / 60)
      : 0;

    // ── Cost breakdown ────────────────────────────────────────────────────────
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
