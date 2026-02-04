import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DateTime } from "luxon";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async createForClient(clientUserId: string, dto: CreateAppointmentDto) {
    // 1) Provider profile + timezone
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: dto.providerId },
      select: { id: true, timeZone: true },
    });
    if (!provider) throw new NotFoundException("Provider not found");

    const providerTz = provider.timeZone;
    const clientTz = dto.tz ?? providerTz;

    // Validar tz si viene
    if (dto.tz && !DateTime.local().setZone(dto.tz).isValid) {
      throw new BadRequestException("tz must be a valid IANA timezone");
    }

    // 2) Service (duración + buffer) y que pertenezca al provider
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, providerId: dto.providerId, isActive: true },
      select: { id: true, durationMinutes: true, bufferMinutes: true },
    });
    if (!service) throw new NotFoundException("Service not found");

    const slotMinutes = service.durationMinutes + (service.bufferMinutes ?? 0);
    if (slotMinutes <= 0) throw new BadRequestException("Invalid service duration/buffer");

    // 3) Parse startAtLocal en tz del cliente → instante real
    const startClient = DateTime.fromISO(dto.startAtLocal, { zone: clientTz });
    if (!startClient.isValid) {
      throw new BadRequestException("startAtLocal must be a valid ISO datetime for the given tz");
    }

    const endClient = startClient.plus({ minutes: slotMinutes });

    // 4) Convertir a UTC para persistencia / checks
    const startUtc = startClient.toUTC().toJSDate();
    const endUtc = endClient.toUTC().toJSDate();

    // 5) Validar que caiga dentro de una AvailabilityRule del provider
    const startProvider = startClient.setZone(providerTz);
    const dayOfWeek = startProvider.weekday % 7; // Luxon: 1..7 (Mon..Sun) → 0..6 (Sun..Sat)

    const minuteOfDay = startProvider.hour * 60 + startProvider.minute;

    const rules = await this.prisma.availabilityRule.findMany({
      where: { providerId: dto.providerId, dayOfWeek },
      orderBy: { startMinute: "asc" },
      select: { startMinute: true, endMinute: true },
    });

    const fitsRule = rules.some((r) => {
      const within = minuteOfDay >= r.startMinute && minuteOfDay + slotMinutes <= r.endMinute;
      if (!within) return false;
      // alineación a grilla de slots: (minuto - startMinute) múltiplo del step
      return (minuteOfDay - r.startMinute) % slotMinutes === 0;
    });

    if (!fitsRule) {
      throw new BadRequestException("Requested time is outside provider availability rules");
    }

    // 6) Reservar con checks dentro de transacción (evita mayoría de condiciones de carrera)
    return this.prisma.$transaction(async (tx) => {
      // 6.1) Exceptions (bloqueos) solapan?
      const exception = await tx.availabilityException.findFirst({
        where: {
          providerId: dto.providerId,
          startAt: { lt: endUtc },
          endAt: { gt: startUtc },
        },
        select: { id: true },
      });
      if (exception) throw new ConflictException("Time is blocked by an availability exception");

      // 6.2) Otro appointment solapa?
      const clash = await tx.appointment.findFirst({
        where: {
          providerId: dto.providerId,
          startAt: { lt: endUtc },
          endAt: { gt: startUtc },
          NOT: { status: "CANCELLED" },
        },
        select: { id: true },
      });
      if (clash) throw new ConflictException("Time slot already booked");

      // 6.3) Crear turno
      const appt = await tx.appointment.create({
        data: {
          providerId: dto.providerId,
          clientId: clientUserId,
          serviceId: dto.serviceId,
          startAt: startUtc,
          endAt: endUtc,
          status: "CONFIRMED",
        },
        select: {
          id: true,
          providerId: true,
          clientId: true,
          serviceId: true,
          startAt: true,
          endAt: true,
          status: true,
        },
      });

      // devolver además en tz cliente (opción B)
      return {
        ...appt,
        clientTimeZone: clientTz,
        start: DateTime.fromJSDate(appt.startAt, { zone: "utc" }).setZone(clientTz).toISO(),
        end: DateTime.fromJSDate(appt.endAt, { zone: "utc" }).setZone(clientTz).toISO(),
      };
    });
  }
}
