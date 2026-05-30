import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackagingDto } from './dto/create-packaging.dto';
import { UpdatePackagingDto } from './dto/update-packaging.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PackagingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.packaging.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const packaging = await this.prisma.packaging.findUnique({
      where: { id },
    });
    if (!packaging) {
      throw new NotFoundException(`Packaging option with ID ${id} not found`);
    }
    return packaging;
  }

  async create(dto: CreatePackagingDto) {
    const costPerUnit = dto.packagePrice / dto.quantity;
    return this.prisma.packaging.create({
      data: {
        ...dto,
        costPerUnit,
      },
    });
  }

  async update(id: string, dto: UpdatePackagingDto) {
    const current = await this.findOne(id); // throws NotFoundException if not found
    const data: Prisma.PackagingUpdateInput = { ...dto };

    if (dto.packagePrice !== undefined || dto.quantity !== undefined) {
      const packagePrice = dto.packagePrice ?? current.packagePrice;
      const quantity = dto.quantity ?? current.quantity;
      data.costPerUnit = packagePrice / quantity;
    }

    return this.prisma.packaging.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // throws NotFoundException if not found
    await this.prisma.packaging.delete({
      where: { id },
    });
    return { message: 'Packaging deleted' };
  }
}
