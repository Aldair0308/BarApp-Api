import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Mesa } from './mesa.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Payment } from '../payments/payment.entity';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PrintService } from '../print/print.service';

@Injectable()
export class MesasService {
  constructor(
    @InjectRepository(Mesa) private readonly mesas: Repository<Mesa>,
    @InjectRepository(OrderItem)
    private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderItemConfig)
    private readonly itemConfigs: Repository<OrderItemConfig>,
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly webhooks: WebhooksService,
    private readonly print: PrintService,
  ) {}

  async findAll(filters: { status?: string; waiterId?: string }) {
    const qb = this.mesas
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.items', 'i')
      .leftJoinAndSelect('i.configurations', 'c')
      .leftJoinAndSelect('m.payments', 'p')
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('i.added_at', 'ASC');
    if (filters.status) qb.andWhere('m.status = :s', { s: filters.status });
    if (filters.waiterId)
      qb.andWhere('m.waiter_id = :w', { w: filters.waiterId });
    const list = await qb.getMany();
    list.forEach((m) => {
      m.items = (m.items || []).sort(
        (a, b) =>
          new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime(),
      );
    });
    return list;
  }

  async findOne(id: string) {
    const m = await this.mesas.findOne({
      where: { id },
      relations: ['items', 'items.configurations', 'payments'],
    });
    if (!m) throw new NotFoundException('Mesa no encontrada');
    m.items = (m.items || []).sort(
      (a, b) =>
        new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime(),
    );
    return m;
  }

  async create(data: { tableNumber: number; clientName: string; waiterId: string; waiterName: string }) {
    const active = await this.mesas.findOne({
      where: { tableNumber: data.tableNumber, status: 'activa' },
    });
    if (active) throw new ConflictException('Número de mesa ya ocupado');
    const m = this.mesas.create({
      id: uuid(),
      tableNumber: data.tableNumber,
      clientName: data.clientName,
      waiterId: data.waiterId,
      waiterName: data.waiterName,
      status: 'activa',
    });
    await this.mesas.save(m);
    return this.findOne(m.id);
  }

  async close(id: string) {
    const m = await this.findOne(id);
    m.status = 'cerrada';
    m.closedAt = new Date();
    await this.mesas.save(m);
    const total = await this.balance(id);
    const itemsPayload = (m.items || []).map((i) => {
      const configDetails: { name: string; extraPrice: number }[] = [];
      const seen = new Set<string>();
      for (const c of i.configurations || []) {
        const key = `${c.groupId}:${c.optionId}`;
        if (c.extraPrice > 0 && !seen.has(key)) {
          seen.add(key);
          configDetails.push({ name: `+ ${c.optionName}`, extraPrice: Number(c.extraPrice) });
        }
      }
      return {
        productName: i.productName,
        quantity: i.quantity,
        paidQty: i.paidQty,
        basePrice: Number(i.basePrice),
        totalPrice: Number(i.totalPrice),
        paymentStatus: i.paymentStatus,
        configDetails,
      };
    });
    this.webhooks.dispatch('mesa.closed', {
      mesaId: m.id,
      tableNumber: m.tableNumber,
      clientName: m.clientName,
      waiterName: m.waiterName,
      createdAt: m.createdAt,
      closedAt: m.closedAt,
      totalAmount: total.total,
      items: itemsPayload,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const m = await this.findOne(id);
    await this.mesas.remove(m);
    return { id, deleted: true };
  }

  async balance(id: string) {
    const m = await this.findOne(id);
    const total = (m.items || []).reduce(
      (s, i) => s + Number(i.totalPrice) * i.quantity,
      0,
    );
    const paid = (m.items || []).reduce(
      (s, i) => s + Number(i.totalPrice) * i.paidQty,
      0,
    );
    const pending = total - paid;
    const totalItems = (m.items || []).reduce((s, i) => s + i.quantity, 0);
    const paidItems = (m.items || []).reduce((s, i) => s + i.paidQty, 0);
    return {
      total,
      paid,
      pending,
      totalItems,
      pendingItems: totalItems - paidItems,
      paidItems,
    };
  }
}
