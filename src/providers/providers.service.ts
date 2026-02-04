import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";
import { CreateAvailabilityRuleDto } from "./dto/availability/create-availability-rule.dto";
import { CreateAvailabilityExceptionDto } from "./dto/availability/create-exception.dto";
import { localToUtcIso } from "./time";
import { DateTime } from "luxon";
import { overlaps, providerDayBoundsUtc, toClientIso, Interval } from "./slots.util";

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

    async getSlotsForDate(params: {
      providerId: string;        // ProviderProfile.id
      date: string;              // YYYY-MM-DD
      serviceId: string;
      clientTz?: string;
    }) {
      const { providerId, date, serviceId } = params;

      // 1) Provider profile (trae timezone)
      const provider = await this.prisma.providerProfile.findUnique({
        where: { id: providerId },
        select: { id: true, timeZone: true },
      });
      if (!provider) throw new NotFoundException("Provider not found");

      const providerTz = provider.timeZone;
      const clientTz = params.clientTz ?? providerTz;

      // 2) Service (duration + buffer)
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, providerId: providerId, isActive: true },
        select: { id: true, durationMinutes: true, bufferMinutes: true },
      });
      if (!service) throw new NotFoundException("Service not found");

      const slotStep = service.durationMinutes + (service.bufferMinutes ?? 0);
      if (slotStep <= 0) throw new BadRequestException("Invalid service duration/buffer");

      // 3) Day bounds in UTC (para filtrar exceptions/appointments)
      const { dayStartUtc, dayEndUtc, dayStartLocal } = providerDayBoundsUtc(date, providerTz);

      // 4) Availability rules del día (según tz provider)
      // Luxon: weekday 1..7 (Mon..Sun). Nosotros guardamos dayOfWeek 0..6 (Sun..Sat)
      const luxonWeekday = dayStartLocal.weekday; // 1..7
      const dayOfWeek = luxonWeekday % 7;         // 0..6

      const rules = await this.prisma.availabilityRule.findMany({
        where: { providerId: providerId, dayOfWeek },
        orderBy: { startMinute: "asc" },
        select: { startMinute: true, endMinute: true },
      });

      if (rules.length === 0) {
        return {
          providerId,
          providerTimeZone: providerTz,
          clientTimeZone: clientTz,
          date,
          slots: [],
        };
      }

      // 5) Exceptions (UTC)
      const exceptions = await this.prisma.availabilityException.findMany({
        where: {
          providerId: providerId,
          startAt: { lt: dayEndUtc },
          endAt: { gt: dayStartUtc },
        },
        orderBy: { startAt: "asc" },
        select: { startAt: true, endAt: true, reason: true },
      });

      const blocked: Interval[] = exceptions.map((e) => ({
        startUtc: e.startAt,
        endUtc: e.endAt,
      }));

      // 6) Appointments existentes (UTC) — opcional pero recomendado
      // Si todavía no estás usando turnos, podés comentar este bloque.
      const appts = await this.prisma.appointment.findMany({
        where: {
          providerId: providerId,
          startAt: { lt: dayEndUtc },
          endAt: { gt: dayStartUtc },
          // evitamos contar cancelados como bloqueantes
          NOT: { status: "CANCELLED" },
        },
        orderBy: { startAt: "asc" },
        select: { startAt: true, endAt: true, status: true },
      });

      for (const a of appts) {
        blocked.push({ startUtc: a.startAt, endUtc: a.endAt });
      }

      // 7) Generar slots en tz provider, convertir a UTC y filtrar solapamientos
      const slots: Array<{
        startUtc: string;
        endUtc: string;
        start: string;
        end: string;
        timeZone: string;
      }> = [];

      for (const r of rules) {
        // arma un DateTime (provider tz) en el día, sumando minutos
        let cursor = dayStartLocal.plus({ minutes: r.startMinute });
        const ruleEnd = dayStartLocal.plus({ minutes: r.endMinute });

        while (cursor.plus({ minutes: slotStep }) <= ruleEnd) {
          const startLocal = cursor;
          const endLocal = cursor.plus({ minutes: slotStep });

          const startUtc = startLocal.toUTC().toJSDate();
          const endUtc = endLocal.toUTC().toJSDate();

          const candidate: Interval = { startUtc, endUtc };

          const isBlocked = blocked.some((b) => overlaps(candidate, b));
          if (!isBlocked) {
            slots.push({
              startUtc: startUtc.toISOString(),
              endUtc: endUtc.toISOString(),
              start: toClientIso(startUtc, clientTz),
              end: toClientIso(endUtc, clientTz),
              timeZone: clientTz,
            });
          }

          cursor = cursor.plus({ minutes: slotStep });
        }
      }

      return {
        providerId,
        providerTimeZone: providerTz,
        clientTimeZone: clientTz,
        date, // interpretada como fecha del provider
        serviceId: service.id,
        slotMinutes: slotStep,
        slots,
      };
    }


}
