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
}
