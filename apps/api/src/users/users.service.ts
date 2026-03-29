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

  async update(id: string, dto: Partial<{ name: string; role: string; isActive: boolean }>) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role as 'ADMIN' | 'ANALYST' }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, companyId: true, createdAt: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async dismissOnboarding(id: string, version = 1) {
    return this.prisma.user.update({
      where: { id },
      data: { hasSeenOnboarding: true, onboardingVersion: version, onboardingDismissedAt: new Date() },
      select: { id: true, hasSeenOnboarding: true, onboardingVersion: true },
    });
  }

  async resetOnboarding(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { hasSeenOnboarding: false, onboardingVersion: 0, onboardingDismissedAt: null },
      select: { id: true, hasSeenOnboarding: true },
    });
  }

  async getOnboardingStatus(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { hasSeenOnboarding: true, onboardingVersion: true, onboardingDismissedAt: true },
    });
  }
}
