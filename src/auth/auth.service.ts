import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { Role } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
    const role = Role.CLIENT;
    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException("Email already in use");

    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.createUser({ email, password: hash, role });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: await this.signToken(user.id, user.email, user.role),
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: await this.signToken(user.id, user.email, user.role),
    };
  }

  private signToken(sub: string, email: string, role: Role) {
    return this.jwt.signAsync({ sub, email, role });
  }
}
