import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, pin: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user || user.active !== 1 || user.pin !== pin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const token = this.signToken(user);
    return {
      token,
      user: this.toPublic(user),
    };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    return this.toPublic(user);
  }

  async switchRole(userId: string, role: UserRole) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Solo admin puede cambiar rol');
    }
    const token = this.signToken({ ...user, role });
    return {
      token,
      user: { ...this.toPublic(user), role },
    };
  }

  signToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return this.jwt.sign(payload);
  }

  toPublic(u: User) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active === 1,
      avatar: u.avatar,
    };
  }
}
