import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards, Param, Patch, Delete, Query } from "@nestjs/common";
import { ProvidersService } from "./providers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { Role } from "@prisma/client";
import { UpsertProviderProfileDto } from "./dto/upsert-provider-profile.dto";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { CreateAvailabilityRuleDto } from "./dto/availability/create-availability-rule.dto";
import { CreateAvailabilityExceptionDto } from "./dto/availability/create-exception.dto";
import { DateTime } from "luxon";


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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Get("me/services")
  listMyServices(@Req() req: any) {
  return this.providers.listMyServices(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Post("me/services")
  createMyService(@Req() req: any, @Body() dto: CreateServiceDto) {
  return this.providers.createMyService(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Patch("me/services/:id")
  updateMyService(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateServiceDto) {
  return this.providers.updateMyService(req.user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Post("me/availability/rules")
  addRule(@Req() req: any, @Body() dto: CreateAvailabilityRuleDto) {
    return this.providers.addAvailabilityRule(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Get("me/availability/rules")
  listRules(@Req() req: any) {
    return this.providers.listAvailabilityRules(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Delete("me/availability/rules/:id")
  deleteRule(@Req() req: any, @Param("id") id: string) {
    return this.providers.deleteAvailabilityRule(req.user.sub, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Post("me/availability/exceptions")
  addException(@Req() req: any, @Body() dto: CreateAvailabilityExceptionDto) {
    return this.providers.addAvailabilityException(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Get("me/availability/exceptions")
  listExceptions(@Req() req: any) {
    return this.providers.listAvailabilityExceptions(req.user.sub);
  }

  @Get(":providerId/slots")
  getSlots(
    @Param("providerId") providerId: string,
    @Query("date") date: string,
    @Query("serviceId") serviceId: string,
    @Query("tz") tz?: string,
  ) {
    if (!date) {
      throw new BadRequestException("date is required (YYYY-MM-DD)");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException("date must be in YYYY-MM-DD format");
    }

    if (!serviceId) {
      throw new BadRequestException("serviceId is required");
    }

    if (tz && !DateTime.local().setZone(tz).isValid) {
      throw new BadRequestException("tz must be a valid IANA timezone");
    }

    return this.providers.getSlotsForDate({
      providerId,
      date,
      serviceId,
      clientTz: tz,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROVIDER)
  @Get("me/appointments")
  listMyAppointments(
    @Req() req: any,
    @Query("date") date?: string,
    @Query("tz") tz?: string,
  ) {
    return this.providers.listMyAppointments(req.user.sub, date, tz);
  }

}
