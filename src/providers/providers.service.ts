import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });

    if (!profile) throw new NotFoundException("Provider profile not found");
    return profile;
  }

  async upsertMyProfile(userId: string, dto: { displayName: string; specialty?: string }) {
    // Validación: exigir que el usuario exista y sea PROVIDER
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "PROVIDER") throw new BadRequestException("Only PROVIDER can have a profile");

    return this.prisma.providerProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: dto.displayName,
        specialty: dto.specialty,
      },
      update: {
        displayName: dto.displayName,
        specialty: dto.specialty,
      },
    });
  }

    async listMyServices(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Provider profile not found");

    return this.prisma.service.findMany({
        where: { providerId: profile.id },
        orderBy: { name: "asc" },
    });
    }

    async createMyService(userId: string, dto: { name: string; durationMinutes: number; bufferMinutes?: number; isActive?: boolean }) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Provider profile not found");

    return this.prisma.service.create({
        data: {
        providerId: profile.id,
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        bufferMinutes: dto.bufferMinutes ?? 0,
        isActive: dto.isActive ?? true,
        },
    });
    }

    async updateMyService(userId: string, serviceId: string, dto: any) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Provider profile not found");

    // asegura que el service pertenezca al provider
    const existing = await this.prisma.service.findFirst({
        where: { id: serviceId, providerId: profile.id },
    });
    if (!existing) throw new NotFoundException("Service not found");

    return this.prisma.service.update({
        where: { id: serviceId },
        data: dto,
    });
    }
}
