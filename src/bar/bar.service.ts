import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Mesa } from '../mesas/mesa.entity';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class BarService {
  constructor(
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderItemConfig)
    private readonly configs: Repository<OrderItemConfig>,
    @InjectRepository(Mesa) private readonly mesas: Repository<Mesa>,
    private readonly webhooks: WebhooksService,
  ) {}

  async getOrders() {
    const items = await this.items.find({
      where: { destination: 'barra', status: Not('entregado') as any },
      relations: ['configurations'],
      order: { addedAt: 'ASC' },
    });
    const mesaIds = Array.from(new Set(items.map((i) => i.mesaId)));
    const mesas = await this.mesas.findByIds(mesaIds);
    const map = new Map(mesas.map((m) => [m.id, m]));
    const groups: Record<string, any> = {};
    for (const i of items) {
      const m = map.get(i.mesaId);
      if (!groups[i.mesaId]) {
        groups[i.mesaId] = {
          mesaId: i.mesaId,
          tableNumber: m?.tableNumber,
          clientName: m?.clientName,
          items: [],
        };
      }
      groups[i.mesaId].items.push({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        status: i.status,
        addedAt: i.addedAt,
        configurations: (i.configurations || []).map((c) => ({
          groupId: c.groupId,
          groupName: c.groupName,
          optionName: c.optionName,
        })),
        modifications: i.modifications ? JSON.parse(i.modifications) : [],
        notes: i.notes,
      });
    }
    return Object.values(groups);
  }

  async markAllDelivered(mesaId: string) {
    const items = await this.items.find({
      where: { mesaId, destination: 'barra', status: Not('entregado') as any },
    });
    for (const i of items) {
      const old = i.status;
      i.status = 'entregado';
      await this.items.save(i);
      const mesa = await this.mesas.findOne({ where: { id: i.mesaId } });
      this.webhooks.dispatch('order.status_changed', {
        orderItemId: i.id,
        productName: i.productName,
        mesaId: i.mesaId,
        tableNumber: mesa?.tableNumber,
        oldStatus: old,
        newStatus: 'entregado',
      });
    }
    return { mesaId, updated: items.length };
  }
}
