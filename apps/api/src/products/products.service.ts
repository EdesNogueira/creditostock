import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductAliasDto } from './dto/create-product-alias.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { ean: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { aliases: true, _count: { select: { stockSnapshotItems: true, nfeItems: true } } },
      orderBy: { description: 'asc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { aliases: true },
    });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return p;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async createAlias(productId: string, dto: CreateProductAliasDto) {
    await this.findOne(productId);
    return this.prisma.productAlias.create({ data: { ...dto, productId } });
  }

  async removeAlias(aliasId: string) {
    return this.prisma.productAlias.delete({ where: { id: aliasId } });
  }
}
