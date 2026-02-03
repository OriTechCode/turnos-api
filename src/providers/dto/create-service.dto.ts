import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(5)
  durationMinutes: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
