import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculatorService } from '../calculator/calculator.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculatorService: CalculatorService,
  ) {}

  private formatQuote(quote: any) {
    return {
      id: quote.id,
      name: quote.name,
      date: quote.createdAt.toISOString(),
      printJob: {
        filamentId: quote.filamentId,
        filamentName: quote.filamentName,
        materialUsed: quote.materialUsed,
        printTimeHours: quote.printTimeHours,
        printTimeMinutes: quote.printTimeMinutes,
        includePostProcessing: quote.includePostProcessing,
        paintTimeHours: quote.paintTimeHours,
        paintTimeMinutes: quote.paintTimeMinutes,
        assemblyTimeHours: quote.assemblyTimeHours,
        assemblyTimeMinutes: quote.assemblyTimeMinutes,
        finishingTimeHours: quote.finishingTimeHours,
        finishingTimeMinutes: quote.finishingTimeMinutes,
        useDefaultMargin: quote.useDefaultMargin,
        profitMargin: quote.profitMargin,
        packagingIds: quote.packagingIds,
        packagingNames: quote.packagingNames,
        includePackaging: quote.includePackaging,
      },
      result: {
        filamentCost: quote.filamentCost,
        energyCost: quote.energyCost,
        printerWear: quote.printerWear,
        laborCost: quote.laborCost,
        packagingCost: quote.packagingCost,
        totalCost: quote.totalCost,
        profit: quote.profit,
        finalPrice: quote.finalPrice,
      },
    };
  }

  async findAll() {
    const quotes = await this.prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return quotes.map((q) => this.formatQuote(q));
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
    });
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    return this.formatQuote(quote);
  }

  async create(dto: CreateQuoteDto) {
    const filament = await this.prisma.filament.findUnique({
      where: { id: dto.printJob.filamentId },
    });
    if (!filament) {
      throw new NotFoundException('Filament not found');
    }

    let packagingNames: string[] = [];
    if (dto.printJob.includePackaging && dto.printJob.packagingIds && dto.printJob.packagingIds.length > 0) {
      const packages = await this.prisma.packaging.findMany({
        where: { id: { in: dto.printJob.packagingIds } },
      });
      packagingNames = dto.printJob.packagingIds.map(id => {
        const pkg = packages.find(p => p.id === id);
        return pkg ? pkg.name : 'Unknown';
      });
    }

    const result = await this.calculatorService.calculate(dto.printJob);

    const profitConfig = await this.prisma.profitConfig.findUnique({
      where: { id: 'singleton' },
    });
    const appliedMargin = dto.printJob.useDefaultMargin
      ? (profitConfig?.defaultProfitMargin ?? 35)
      : dto.printJob.profitMargin;

    const quote = await this.prisma.quote.create({
      data: {
        name: dto.name,
        filamentId: dto.printJob.filamentId,
        filamentName: filament.name,
        materialUsed: dto.printJob.materialUsed,
        printTimeHours: dto.printJob.printTimeHours,
        printTimeMinutes: dto.printJob.printTimeMinutes,
        paintTimeHours: dto.printJob.paintTimeHours,
        paintTimeMinutes: dto.printJob.paintTimeMinutes,
        assemblyTimeHours: dto.printJob.assemblyTimeHours,
        assemblyTimeMinutes: dto.printJob.assemblyTimeMinutes,
        finishingTimeHours: dto.printJob.finishingTimeHours,
        finishingTimeMinutes: dto.printJob.finishingTimeMinutes,
        includePostProcessing: dto.printJob.includePostProcessing,
        packagingIds: dto.printJob.packagingIds ?? [],
        packagingNames,
        includePackaging: dto.printJob.includePackaging,
        useDefaultMargin: dto.printJob.useDefaultMargin,
        profitMargin: appliedMargin,
        filamentCost: result.filamentCost,
        energyCost: result.energyCost,
        printerWear: result.printerWear,
        laborCost: result.laborCost,
        packagingCost: result.packagingCost,
        totalCost: result.totalCost,
        profit: result.profit,
        finalPrice: result.finalPrice,
      },
    });

    return this.formatQuote(quote);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quote.delete({
      where: { id },
    });
    return { message: 'Quote deleted' };
  }

  async loadQuote(id: string) {
    const formattedQuote = await this.findOne(id);
    return formattedQuote.printJob;
  }
}
