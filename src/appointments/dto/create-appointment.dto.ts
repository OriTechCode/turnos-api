import { IsOptional, IsString, IsUUID, Matches } from "class-validator";

export class CreateAppointmentDto {
  @IsUUID()
  providerId: string; // ProviderProfile.id

  @IsUUID()
  serviceId: string;

  // ISO local del cliente (sin Z). Ej: "2026-02-10T06:00:00"
  @IsString()
  startAtLocal: string;

  // IANA TZ del cliente. Ej: "America/Mexico_City"
  @IsOptional()
  @IsString()
  tz?: string;
}
