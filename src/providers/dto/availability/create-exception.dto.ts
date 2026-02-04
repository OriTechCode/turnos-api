import { IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateAvailabilityExceptionDto {
  @IsISO8601()
  startAtLocal: string; // ej "2026-02-10T10:00:00"

  @IsISO8601()
  endAtLocal: string;   // ej "2026-02-10T12:00:00"

  @IsOptional()
  @IsString()
  reason?: string;
}
