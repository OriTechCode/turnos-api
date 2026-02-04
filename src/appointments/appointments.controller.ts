import { Body, Controller, Post, Req, UseGuards, Get, Patch, Param, Query  } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AppointmentsService } from "./appointments.service";
import { CreateAppointmentDto } from "./dto/create-appointment.dto";

@Controller("appointments")
export class AppointmentsController {
  constructor(private appts: AppointmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Post()
  create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.appts.createForClient(req.user.sub, dto);
  }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT)
    @Get("me")
    listMine(@Req() req: any, @Query("tz") tz?: string) {
    return this.appts.listMine(req.user.sub, tz);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.CLIENT)
    @Patch(":id/cancel")
    cancel(@Req() req: any, @Param("id") id: string) {
    return this.appts.cancel(req.user.sub, id);
    }
    
}
