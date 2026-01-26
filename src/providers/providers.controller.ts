import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ProvidersService } from "./providers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";

@Controller("providers")
export class ProvidersController {
  constructor(private providers: ProvidersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Get("me/profile")
  getMe(@Req() req: any) {
    return this.providers.getMyProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Post("me/profile")
  upsertMe(@Req() req: any, @Body() dto: UpsertProviderProfileDto) {
    return this.providers.upsertMyProfile(req.user.sub, dto);
  }
}
