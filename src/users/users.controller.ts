import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Role } from "@prisma/client";

@Controller("users")
export class UsersController {
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get("admin-only")
  adminOnly() {
    return { ok: true, message: "Only ADMIN can see this" };
  }
}
