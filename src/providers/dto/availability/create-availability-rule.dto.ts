import { IsInt, Max, Min } from "class-validator";

export class CreateAvailabilityRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 dom ... 6 sáb

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number; // 09:00 = 540

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number; // 13:00 = 780
}
