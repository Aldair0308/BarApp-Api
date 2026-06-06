import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { PrintJob, PrintJobType } from './print-job.entity';

@Injectable()
export class PrintService {
  constructor(
    @InjectRepository(PrintJob) private readonly repo: Repository<PrintJob>,
  ) {}

  async create(data: { type: PrintJobType; data: any }) {
    const j = this.repo.create({
      id: uuid(),
      type: data.type,
      data: data.data,
      status: 'pendiente',
    });
    return this.repo.save(j);
  }

  findAll(filters: { status?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  findPending() {
    return this.repo.find({
      where: { status: 'pendiente' },
      order: { createdAt: 'ASC' },
    });
  }

  async update(id: string, data: { status: string; error?: string }) {
    const j = await this.repo.findOne({ where: { id } });
    if (!j) throw new NotFoundException('Print job no encontrado');
    j.status = data.status as any;
    if (data.status === 'impreso') j.printedAt = new Date();
    if (data.error) j.error = data.error;
    return this.repo.save(j);
  }

  async status() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [pending, printedToday, errors] = await Promise.all([
      this.repo.count({ where: { status: 'pendiente' } }),
      this.repo
        .createQueryBuilder('j')
        .where('j.status = :s', { s: 'impreso' })
        .andWhere('j.created_at >= :d', { d: start })
        .getCount(),
      this.repo.count({ where: { status: 'error' } }),
    ]);
    return { pendingJobs: pending, printedToday, errors };
  }
}
