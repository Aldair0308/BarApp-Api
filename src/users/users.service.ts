import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  async create(data: {
    name: string;
    email: string;
    pin: string;
    role: UserRole;
    avatar?: string;
  }) {
    const exists = await this.repo.findOne({ where: { email: data.email } });
    if (exists) throw new ConflictException('Email ya registrado');
    const u = this.repo.create({
      id: uuid(),
      name: data.name,
      email: data.email,
      pin: data.pin,
      role: data.role || 'mesero',
      active: 1,
      avatar: data.avatar || null,
    });
    return this.repo.save(u);
  }

  async update(
    id: string,
    data: Partial<{ name: string; pin: string; role: UserRole; avatar: string }>,
  ) {
    const u = await this.findOne(id);
    Object.assign(u, data);
    return this.repo.save(u);
  }

  async toggleActive(id: string) {
    const u = await this.findOne(id);
    u.active = u.active === 1 ? 0 : 1;
    await this.repo.save(u);
    return { id: u.id, active: u.active === 1 };
  }

  async remove(id: string) {
    const u = await this.findOne(id);
    await this.repo.remove(u);
    return { id, deleted: true };
  }
}
