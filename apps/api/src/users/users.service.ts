import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.user.findMany({
      where: companyId ? { companyId } : undefined,
      select: { id: true, name: true, email: true, role: true, isActive: true, companyId: true, createdAt: true },
    });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { ...dto, passwordHash, password: undefined } as any,
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, companyId: true, createdAt: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}
