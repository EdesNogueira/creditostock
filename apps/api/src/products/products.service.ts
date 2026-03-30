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

  async update(id: string, dto: Partial<CreateProductDto>) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.ean !== undefined && { ean: dto.ean }),
        ...(dto.ncm !== undefined && { ncm: dto.ncm }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
      },
      include: { aliases: true },
    });
  }

  async createAlias(productId: string, dto: CreateProductAliasDto) {
    await this.findOne(productId);
    return this.prisma.productAlias.create({ data: { ...dto, productId } });
  }

  async removeAlias(aliasId: string) {
    return this.prisma.productAlias.delete({ where: { id: aliasId } });
  }

  async backfillFromImportedData() {
    const stripZeros = (s: string) => s.replace(/^0+/, '') || '0';
    let created = 0;
    let linked = 0;
    let skipped = 0;

    // 1. Backfill from stock snapshot items
    const stockItems = await this.prisma.stockSnapshotItem.findMany({
      where: { productId: null },
      select: { id: true, rawSku: true, rawEan: true, rawDescription: true, rawNcm: true, unit: true, snapshot: { select: { branch: { select: { companyId: true } } } } },
      take: 5000,
    });

    for (const si of stockItems) {
      const sku = si.rawSku;
      const skuNorm = stripZeros(sku);
      const companyId = si.snapshot?.branch?.companyId;

      let product = await this.prisma.product.findFirst({
        where: { OR: [{ sku }, { sku: skuNorm }, ...(si.rawEan ? [{ ean: si.rawEan }] : [])] },
      });

      if (!product) {
        try {
          product = await this.prisma.product.create({
            data: { companyId, sku, ean: si.rawEan || undefined, description: si.rawDescription || sku, ncm: si.rawNcm || undefined, unit: si.unit || 'UN' },
          });
          created++;
        } catch { skipped++; continue; }
      }

      if (product) {
        await this.prisma.stockSnapshotItem.update({ where: { id: si.id }, data: { productId: product.id } });
        linked++;
      }
    }

    // 2. Backfill from NF-e items
    const nfeItems = await this.prisma.nfeItem.findMany({
      where: { productId: null },
      select: { id: true, cProd: true, cEan: true, xProd: true, ncm: true, uCom: true, nfeDocument: { select: { branch: { select: { companyId: true } } } } },
      take: 5000,
    });

    for (const ni of nfeItems) {
      const sku = ni.cProd;
      const skuNorm = stripZeros(sku);
      const companyId = ni.nfeDocument?.branch?.companyId;

      let product = await this.prisma.product.findFirst({
        where: { OR: [{ sku }, { sku: skuNorm }, ...(ni.cEan ? [{ ean: ni.cEan }] : [])] },
      });

      if (!product) {
        try {
          product = await this.prisma.product.create({
            data: { companyId, sku, ean: ni.cEan || undefined, description: ni.xProd || sku, ncm: ni.ncm || undefined, unit: ni.uCom || 'UN' },
          });
          created++;
        } catch { skipped++; continue; }
      }

      if (product) {
        await this.prisma.nfeItem.update({ where: { id: ni.id }, data: { productId: product.id } });
        linked++;
      }
    }

    return { created, linked, skipped, message: `Catálogo reconstruído: ${created} produtos criados, ${linked} itens vinculados, ${skipped} ignorados` };
  }
}
