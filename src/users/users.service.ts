import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(params: { email: string; password: string; role: Role }) {
    return this.prisma.user.create({ data: params });
  }

  async createProvider(email: string, password: string) {
    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException("Email already in use");

    const hash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hash,
        role: Role.PROVIDER,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }
}
