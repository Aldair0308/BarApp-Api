import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Mesa } from '../mesas/mesa.entity';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class KitchenService {
  constructor(
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderItemConfig)
    private readonly configs: Repository<OrderItemConfig>,
    @InjectRepository(Mesa) private readonly mesas: Repository<Mesa>,
    private readonly webhooks: WebhooksService,
  ) {}

  async getOrders() {
    const items = await this.items.find({
      where: { destination: 'cocina', status: Not('entregado') as any },
      relations: ['configurations'],
      order: { addedAt: 'ASC' },
    });
    const mesaIds = Array.from(new Set(items.map((i) => i.mesaId)));
    const mesas = await this.mesas.findByIds(mesaIds);
    const map = new Map(mesas.map((m) => [m.id, m]));
    return items.map((i) => {
      const m = map.get(i.mesaId);
      return {
        mesaId: i.mesaId,
        tableNumber: m?.tableNumber,
        clientName: m?.clientName,
        item: {
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
        },
      };
    });
  }

  async markDelivered(itemId: string) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    const old = item.status;
    item.status = 'entregado';
    await this.items.save(item);
    const mesa = await this.mesas.findOne({ where: { id: item.mesaId } });
    this.webhooks.dispatch('order.status_changed', {
      orderItemId: item.id,
      productName: item.productName,
      mesaId: item.mesaId,
      tableNumber: mesa?.tableNumber,
      oldStatus: old,
      newStatus: 'entregado',
    });
    return item;
  }
}
