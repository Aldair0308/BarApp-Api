import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Inventory } from './inventory.entity';
import { InventoryMovement, MovementType } from './inventory-movement.entity';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory) private readonly inv: Repository<Inventory>,
    @InjectRepository(InventoryMovement)
    private readonly moves: Repository<InventoryMovement>,
    private readonly webhooks: WebhooksService,
  ) {}

  async findAll(filters: { search?: string; status?: string }) {
    const list = await this.inv
      .createQueryBuilder('i')
      .orderBy('i.product_name', 'ASC')
      .getMany();
    const filtered = list
      .map((i) => {
        const status =
          i.currentStock <= i.minStock
            ? 'urgente'
            : i.currentStock <= i.minStock * 1.5
              ? 'bajo'
              : 'ok';
        return { ...i, status };
      })
      .filter((i) => {
        if (filters.search)
          return i.productName.toLowerCase().includes(filters.search.toLowerCase());
        if (filters.status) return i.status === filters.status;
        return true;
      });
    return filtered;
  }

  async findOne(id: string) {
    const i = await this.inv.findOne({ where: { id } });
    if (!i) throw new NotFoundException('Inventario no encontrado');
    const status =
      i.currentStock <= i.minStock
        ? 'urgente'
        : i.currentStock <= i.minStock * 1.5
          ? 'bajo'
          : 'ok';
    return { ...i, status };
  }

  async restock(id: string, quantity: number, userId?: string) {
    const i = await this.inv.findOne({ where: { id } });
    if (!i) throw new NotFoundException('Inventario no encontrado');
    i.currentStock += quantity;
    i.lastRestocked = new Date();
    await this.inv.save(i);
    await this.moves.save(
      this.moves.create({
        id: uuid(),
        inventoryId: i.id,
        type: 'restock' as MovementType,
        quantity,
        referenceId: null,
        notes: 'Resurtido manual',
        createdBy: userId || null,
      }),
    );
    return this.findOne(i.id);
  }

  async adjust(
    id: string,
    data: { currentStock?: number; minStock?: number; maxStock?: number; unit?: string },
    userId?: string,
  ) {
    const i = await this.inv.findOne({ where: { id } });
    if (!i) throw new NotFoundException('Inventario no encontrado');
    const oldStock = i.currentStock;
    if (data.currentStock !== undefined) i.currentStock = data.currentStock;
    if (data.minStock !== undefined) i.minStock = data.minStock;
    if (data.maxStock !== undefined) i.maxStock = data.maxStock;
    if (data.unit !== undefined) i.unit = data.unit;
    await this.inv.save(i);
    const diff = i.currentStock - oldStock;
    if (diff !== 0) {
      await this.moves.save(
        this.moves.create({
          id: uuid(),
          inventoryId: i.id,
          type: 'adjustment' as MovementType,
          quantity: diff,
          referenceId: null,
          notes: 'Ajuste manual',
          createdBy: userId || null,
        }),
      );
    }
    return this.findOne(i.id);
  }

  async getMovements(id: string) {
    return this.moves.find({
      where: { inventoryId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async consumeStock(productId: string, quantity: number, referenceId: string, userId?: string) {
    const i = await this.inv.findOne({ where: { productId } });
    if (!i) return;
    if (i.currentStock < quantity) {
      throw new Error(`Stock insuficiente para ${i.productName}`);
    }
    i.currentStock -= quantity;
    await this.inv.save(i);
    await this.moves.save(
      this.moves.create({
        id: uuid(),
        inventoryId: i.id,
        type: 'sale' as MovementType,
        quantity: -quantity,
        referenceId,
        notes: 'Venta',
        createdBy: userId || null,
      }),
    );
    if (i.currentStock <= i.minStock) {
      this.webhooks.dispatch('inventory.low_stock', {
        productId: i.productId,
        productName: i.productName,
        currentStock: i.currentStock,
        minStock: i.minStock,
      });
    }
    return i;
  }

  async returnStock(productId: string, quantity: number, referenceId: string, userId?: string) {
    const i = await this.inv.findOne({ where: { productId } });
    if (!i) return;
    i.currentStock += quantity;
    await this.inv.save(i);
    await this.moves.save(
      this.moves.create({
        id: uuid(),
        inventoryId: i.id,
        type: 'cancel' as MovementType,
        quantity,
        referenceId,
        notes: 'Cancelación/devolución',
        createdBy: userId || null,
      }),
    );
    return i;
  }

  async findByProduct(productId: string) {
    return this.inv.findOne({ where: { productId } });
  }
}
