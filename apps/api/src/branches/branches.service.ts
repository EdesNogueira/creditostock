import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.branch.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { stockSnapshots: true, nfeDocuments: true } },
      },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  async create(dto: CreateBranchDto) {
    return this.prisma.branch.create({ data: dto });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const branch = await this.findOne(id);
    // Clean up non-cascading references before deleting
    await this.prisma.$transaction(async (tx) => {
      // Issues may reference stock items from this branch's snapshots
      const snapshots = await tx.stockSnapshot.findMany({ where: { branchId: id }, select: { id: true } });
      const snapshotIds = snapshots.map(s => s.id);
      if (snapshotIds.length > 0) {
        await tx.issue.deleteMany({ where: { stockSnapshotItem: { snapshotId: { in: snapshotIds } } } });
      }
      // Delete branch (cascades to snapshots, nfe, calculations, dossiers, etc)
      await tx.branch.delete({ where: { id } });
    });
    return { deleted: true, name: branch.name };
  }
}
