import { IsOptional, IsString, MinLength } from "class-validator";

export class UpsertProviderProfileDto {
  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  timeZone?: string; // IANA timezone
}
