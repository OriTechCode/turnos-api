import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import { CreateProviderDto } from "src/auth/dto/create-provider.dto";

@Controller("users")
export class UsersController {
    constructor(private users: UsersService) {}
    
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Post("providers")
    createProvider(@Body() dto: CreateProviderDto) {
        return this.users.createProvider(dto.email, dto.password);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get("admin-only")
    adminOnly() {
        return { ok: true, message: "Only ADMIN can see this" };
    }
}
