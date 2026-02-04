import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";
import { CreateAvailabilityRuleDto } from "./dto/availability/create-availability-rule.dto";
import { CreateAvailabilityExceptionDto } from "./dto/availability/create-exception.dto";
import { localToUtcIso } from "./time";

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

  async upsertMyProfile(userId: string, dto: UpsertProviderProfileDto){
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
        timeZone: dto.timeZone ?? undefined,
      },
      update: {
        displayName: dto.displayName,
        specialty: dto.specialty,
        timeZone: dto.timeZone ?? undefined,
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
    
    async addAvailabilityRule(userId: string, dto: CreateAvailabilityRuleDto) {
      const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException("Provider profile not found");

      if (dto.startMinute >= dto.endMinute) {
        throw new BadRequestException("Invalid time range");
      }

      return this.prisma.availabilityRule.create({
        data: {
          providerId: profile.id,
          dayOfWeek: dto.dayOfWeek,
          startMinute: dto.startMinute,
          endMinute: dto.endMinute,
        },
      });
    }

    async listAvailabilityRules(userId: string) {
      const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException("Provider profile not found");

      return this.prisma.availabilityRule.findMany({
        where: { providerId: profile.id },
        orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
      });
    }

    async deleteAvailabilityRule(userId: string, ruleId: string) {
      const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException("Provider profile not found");

      const rule = await this.prisma.availabilityRule.findFirst({
        where: { id: ruleId, providerId: profile.id },
      });
      if (!rule) throw new NotFoundException("Rule not found");

      await this.prisma.availabilityRule.delete({ where: { id: ruleId } });
      return { ok: true };
    }

    async addAvailabilityException(userId: string, dto: CreateAvailabilityExceptionDto) {
      const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException("Provider profile not found");

      const startUtc = localToUtcIso(dto.startAtLocal, profile.timeZone);
      const endUtc = localToUtcIso(dto.endAtLocal, profile.timeZone);

      if (new Date(startUtc) >= new Date(endUtc)) {
        throw new BadRequestException("Invalid time range");
      }

      return this.prisma.availabilityException.create({
        data: {
          providerId: profile.id,
          startAt: new Date(startUtc),
          endAt: new Date(endUtc),
          reason: dto.reason,
        },
      });
    }

    async listAvailabilityExceptions(userId: string) {
      const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException("Provider profile not found");

      return this.prisma.availabilityException.findMany({
        where: { providerId: profile.id },
        orderBy: { startAt: "asc" },
      });
    }

}
