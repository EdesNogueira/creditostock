import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany({ include: { branches: true, _count: { select: { users: true } } } });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { branches: true, users: { select: { id: true, name: true, email: true, role: true } } },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto) {
    const exists = await this.prisma.company.findUnique({ where: { cnpj: dto.cnpj } });
    if (exists) throw new ConflictException('CNPJ already registered');
    return this.prisma.company.create({ data: dto });
  }

  async update(id: string, dto: UpdateCompanyDto) {
    await this.findOne(id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.company.delete({ where: { id } });
  }
}
