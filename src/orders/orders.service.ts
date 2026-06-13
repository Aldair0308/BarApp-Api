import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import { OrderItem, OrderItemDestination } from './order-item.entity';
import { OrderItemConfig } from './order-item-config.entity';
import { IdempotencyKey } from './idempotency-key.entity';
import { ConfigOption } from '../products/config-option.entity';
import { Mesa } from '../mesas/mesa.entity';
import { InventoryService } from '../inventory/inventory.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PrintService } from '../print/print.service';

interface AddItemInput {
  productId: string;
  productName: string;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  destination: OrderItemDestination;
  configurations?: Array<{
    groupId: string;
    groupName: string;
    selectedOptionIds: string[];
  }>;
  modifications?: string[];
  notes?: string;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderItemConfig)
    private readonly itemConfigs: Repository<OrderItemConfig>,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyKeys: Repository<IdempotencyKey>,
    @InjectRepository(ConfigOption)
    private readonly configOptions: Repository<ConfigOption>,
    @InjectRepository(Mesa) private readonly mesas: Repository<Mesa>,
    private readonly inventory: InventoryService,
    private readonly webhooks: WebhooksService,
    private readonly print: PrintService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        key_hash VARCHAR(64) NOT NULL UNIQUE,
        response_json LONGTEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await qr.release();
  }

  async findCachedResponse(keyHash: string): Promise<any | null> {
    const row = await this.idempotencyKeys.findOne({ where: { keyHash } });
    if (!row) return null;
    if (new Date() > row.expiresAt) {
      await this.idempotencyKeys.remove(row);
      return null;
    }
    try {
      return JSON.parse(row.responseJson);
    } catch {
      return null;
    }
  }

  async saveIdempotencyKey(keyHash: string, response: any) {
    try {
      await this.idempotencyKeys.save({
        id: uuid(),
        keyHash,
        responseJson: JSON.stringify(response),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } catch {
      // duplicate key race condition — ignore
    }
  }

  hashIdempotencyKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async addItems(
    mesaId: string,
    userId: string,
    userName: string,
    itemsInput: AddItemInput[],
    idempotencyKeyHash?: string,
  ) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const manager = qr.manager;

      const mesa = await manager.getRepository(Mesa).findOne({ where: { id: mesaId } });
      if (!mesa) throw new NotFoundException('Mesa no encontrada');
      if (mesa.status !== 'activa')
        throw new BadRequestException('Mesa cerrada, no acepta ítems');

      for (const i of itemsInput) {
        const stock = await this.inventory.findByProduct(i.productId);
        if (stock && stock.currentStock < i.quantity) {
          throw new ConflictException({
            message: `Solo hay ${stock.currentStock} de ${i.productName}`,
            productId: i.productId,
            availableStock: stock.currentStock,
          });
        }
      }

      const created: OrderItem[] = [];
      const inputConfigsByItem = new Map<string, AddItemInput['configurations']>();
      for (const input of itemsInput) {
        const orderItem = manager.getRepository(OrderItem).create({
          id: uuid(),
          mesaId,
          productId: input.productId,
          productName: input.productName,
          basePrice: input.basePrice,
          totalPrice: input.totalPrice,
          quantity: input.quantity,
          paidQty: 0,
          status: input.destination === 'otros' ? 'entregado' : 'pendiente',
          destination: input.destination,
          paymentStatus: 'pendiente',
          addedByName: userName,
          notes: input.notes || null,
          modifications: input.modifications
            ? JSON.stringify(input.modifications)
            : null,
        });
        await manager.getRepository(OrderItem).save(orderItem);

        const allOptionIds = (input.configurations || []).flatMap(c => c.selectedOptionIds || []);
        const optionsMap = new Map<string, ConfigOption>();
        if (allOptionIds.length > 0) {
          const found = await this.configOptions.find({ where: { id: In(allOptionIds) } });
          for (const o of found) optionsMap.set(o.id, o);
        }
        for (const cfg of input.configurations || []) {
          for (const optId of cfg.selectedOptionIds || []) {
            const opt = optionsMap.get(optId);
            await manager.getRepository(OrderItemConfig).save(
              manager.getRepository(OrderItemConfig).create({
                id: uuid(),
                orderItemId: orderItem.id,
                groupId: cfg.groupId,
                groupName: cfg.groupName,
                optionId: optId,
                optionName: opt?.name || '',
                extraPrice: opt?.extraPrice || 0,
              }),
            );
          }
        }

        await this.inventory.consumeStock(
          input.productId,
          input.quantity,
          orderItem.id,
          userId,
          manager,
        );
        inputConfigsByItem.set(orderItem.id, input.configurations);
        created.push(orderItem);
      }

      await qr.commitTransaction();

      this.webhooks.dispatch('order.created', {
        mesaId: mesa.id,
        tableNumber: mesa.tableNumber,
        clientName: mesa.clientName,
        waiterName: mesa.waiterName,
        addedAt: created[0]?.addedAt || new Date().toISOString(),
        items: created.map((i) => ({
          id: i.id,
          productName: i.productName,
          quantity: i.quantity,
          basePrice: Number(i.basePrice),
          totalPrice: Number(i.totalPrice),
          destination: i.destination,
          notes: i.notes,
          modifications: i.modifications ? JSON.parse(i.modifications) : [],
          configurations: (inputConfigsByItem.get(i.id) || []).map((cfg) => ({
            groupId: cfg.groupId,
            groupName: cfg.groupName,
            selectedOptionIds: cfg.selectedOptionIds,
          })),
        })),
      });

      const allConfigs = created.length
        ? await this.itemConfigs.find({
            where: { orderItemId: In(created.map((c) => c.id)) },
            order: { groupName: 'ASC', optionName: 'ASC' },
          })
        : [];
      const configsByItem = new Map<string, OrderItemConfig[]>();
      for (const c of allConfigs) {
        if (!configsByItem.has(c.orderItemId))
          configsByItem.set(c.orderItemId, []);
        configsByItem.get(c.orderItemId)!.push(c);
      }

      const buildConfigs = (itemId: string) => {
        const itemConfigs = configsByItem.get(itemId) || [];
        const groups = new Map<string, { groupName: string; options: { name: string; extraPrice: number }[] }>();
        for (const cfg of itemConfigs) {
          if (!groups.has(cfg.groupId))
            groups.set(cfg.groupId, { groupName: cfg.groupName, options: [] });
          groups.get(cfg.groupId)!.options.push({
            name: cfg.optionName,
            extraPrice: Number(cfg.extraPrice),
          });
        }
        return [...groups.values()];
      };

      const orderBase = {
        mesaId: mesa.id,
        tableNumber: mesa.tableNumber,
        clientName: mesa.clientName,
        waiterName: mesa.waiterName,
        addedAt: created[0]?.addedAt || new Date().toISOString(),
      };
      const itemPayloads = created.map((i) => ({
        id: i.id,
        productName: i.productName,
        quantity: i.quantity,
        basePrice: Number(i.basePrice),
        totalPrice: Number(i.totalPrice),
        destination: i.destination,
        notes: i.notes,
        modifications: i.modifications ? JSON.parse(i.modifications) : [],
        configurations: buildConfigs(i.id),
      }));
      const kitchenItems = itemPayloads.filter((i) => i.destination === 'cocina');
      const barItems = itemPayloads.filter((i) => i.destination === 'barra');
      if (kitchenItems.length) {
        await this.print.create({
          type: 'kitchen_order',
          data: { order: { ...orderBase, items: kitchenItems } },
        });
      }

      if (idempotencyKeyHash) {
        await this.saveIdempotencyKey(idempotencyKeyHash, created);
      }

      return created;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  async updateStatus(itemId: string, status: string) {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    if (!['pendiente', 'en_proceso', 'listo', 'entregado'].includes(status))
      throw new BadRequestException('Estado inválido');
    const old = item.status;
    item.status = status as any;
    await this.items.save(item);

    const mesa = await this.mesas.findOne({ where: { id: item.mesaId } });
    this.webhooks.dispatch('order.status_changed', {
      orderItemId: item.id,
      productName: item.productName,
      mesaId: item.mesaId,
      tableNumber: mesa?.tableNumber,
      oldStatus: old,
      newStatus: status,
    });
    return item;
  }

  async removeItem(mesaId: string, itemId: string) {
    const item = await this.items.findOne({ where: { id: itemId, mesaId } });
    if (!item) throw new NotFoundException('Ítem no encontrado');
    const toReturn = item.quantity - item.paidQty;
    if (toReturn > 0) {
      await this.inventory.returnStock(item.productId, toReturn, item.id);
    }
    const mesa = await this.mesas.findOne({ where: { id: mesaId } });
    await this.items.remove(item);
    this.webhooks.dispatch('order.deleted', {
      orderItemId: item.id,
      productName: item.productName,
      mesaId,
      tableNumber: mesa?.tableNumber,
      clientName: mesa?.clientName,
    });
    return { id: itemId, deleted: true };
  }
}
