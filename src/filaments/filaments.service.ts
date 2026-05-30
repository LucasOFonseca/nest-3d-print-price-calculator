import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFilamentDto } from './dto/create-filament.dto';
import { UpdateFilamentDto } from './dto/update-filament.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FilamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.filament.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const filament = await this.prisma.filament.findUnique({
      where: { id },
    });
    if (!filament) {
      throw new NotFoundException(`Filament with ID ${id} not found`);
    }
    return filament;
  }

  async create(dto: CreateFilamentDto) {
    const costPerGram = dto.spoolPrice / dto.spoolWeight;
    return this.prisma.filament.create({
      data: {
        ...dto,
        costPerGram,
      },
    });
  }

  async update(id: string, dto: UpdateFilamentDto) {
    const current = await this.findOne(id); // throws NotFoundException if not found
    const data: Prisma.FilamentUpdateInput = { ...dto };

    if (dto.spoolPrice !== undefined || dto.spoolWeight !== undefined) {
      const spoolPrice = dto.spoolPrice ?? current.spoolPrice;
      const spoolWeight = dto.spoolWeight ?? current.spoolWeight;
      data.costPerGram = spoolPrice / spoolWeight;
    }

    return this.prisma.filament.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // throws NotFoundException if not found
    await this.prisma.filament.delete({
      where: { id },
    });
    return { message: 'Filament deleted' };
  }
}
