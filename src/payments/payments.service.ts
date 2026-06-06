import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Payment, PaymentMethod } from './payment.entity';
import { PaymentItem } from './payment-item.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Mesa } from '../mesas/mesa.entity';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PrintService } from '../print/print.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentItem)
    private readonly paymentItems: Repository<PaymentItem>,
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderItemConfig)
    private readonly itemConfigs: Repository<OrderItemConfig>,
    @InjectRepository(Mesa) private readonly mesas: Repository<Mesa>,
    private readonly webhooks: WebhooksService,
    private readonly print: PrintService,
  ) {}

  private async getConfigDetails(orderItemId: string): Promise<{ name: string; extraPrice: number }[]> {
    const configs = await this.itemConfigs.find({ where: { orderItemId } });
    const seen = new Set<string>();
    const details: { name: string; extraPrice: number }[] = [];
    for (const c of configs) {
      const key = `${c.groupId}:${c.optionId}`;
      if (c.extraPrice > 0 && !seen.has(key)) {
        seen.add(key);
        details.push({ name: `+ ${c.optionName}`, extraPrice: Number(c.extraPrice) });
      }
    }
    return details;
  }

  async create(
    mesaId: string,
    userId: string,
    data: {
      paymentMethod: PaymentMethod;
      notes?: string;
      items: Array<{ orderItemId: string; paidQty: number }>;
    },
  ) {
    const mesa = await this.mesas.findOne({ where: { id: mesaId } });
    if (!mesa) throw new NotFoundException('Mesa no encontrada');
    if (mesa.status !== 'activa')
      throw new BadRequestException('Mesa cerrada, no acepta pagos');

    const itemsById: Record<string, OrderItem> = {};
    for (const it of data.items) {
      const oi = await this.items.findOne({ where: { id: it.orderItemId } });
      if (!oi)
        throw new NotFoundException(`Item no encontrado: ${it.orderItemId}`);
      if (oi.mesaId !== mesaId)
        throw new BadRequestException(
          `Item ${it.orderItemId} no pertenece a esta mesa`,
        );
      const remaining = oi.quantity - oi.paidQty;
      if (it.paidQty <= 0 || it.paidQty > remaining)
        throw new BadRequestException(
          `Cantidad inválida para ${oi.productName} (disponible: ${remaining})`,
        );
      itemsById[it.orderItemId] = oi;
    }

    let amount = 0;
    for (const it of data.items) {
      const oi = itemsById[it.orderItemId];
      amount += Number(oi.totalPrice) * it.paidQty;
    }

    const payment = this.payments.create({
      id: uuid(),
      mesaId,
      amount,
      paymentMethod: data.paymentMethod,
      paidBy: userId,
      notes: data.notes || null,
    });
    await this.payments.save(payment);

    for (const it of data.items) {
      const oi = itemsById[it.orderItemId];
      const itemAmount = Number(oi.totalPrice) * it.paidQty;
      await this.paymentItems.save(
        this.paymentItems.create({
          id: uuid(),
          paymentId: payment.id,
          orderItemId: oi.id,
          paidQty: it.paidQty,
          amount: itemAmount,
        }),
      );
      oi.paidQty += it.paidQty;
      if (oi.paidQty >= oi.quantity) {
        oi.paymentStatus = 'pagado';
        oi.paidAt = new Date();
      } else if (oi.paidQty > 0) {
        oi.paymentStatus = 'parcial';
      }
      await this.items.save(oi);
    }

    const allPaid = (await this.items.find({ where: { mesaId } })).every(
      (i) => i.paymentStatus === 'pagado',
    );

    const allMesaItems = await this.items.find({ where: { mesaId } });
    const totalMesa = allMesaItems.reduce(
      (s, i) => s + Number(i.totalPrice) * i.quantity,
      0,
    );
    const paidMesa = allMesaItems.reduce(
      (s, i) => s + Number(i.totalPrice) * (i.paidQty || 0),
      0,
    );
    const remaining = totalMesa - paidMesa;

    const configDetailsMap = new Map<string, { name: string; extraPrice: number }[]>();
    for (const it of data.items) {
      configDetailsMap.set(it.orderItemId, await this.getConfigDetails(it.orderItemId));
    }

    this.webhooks.dispatch('payment.completed', {
      paymentId: payment.id,
      mesaId,
      tableNumber: mesa.tableNumber,
      clientName: mesa.clientName,
      waiterName: mesa.waiterName,
      paidAt: payment.paidAt,
      amount,
      remaining,
      paymentMethod: data.paymentMethod,
      isFullPayment: allPaid,
      items: data.items.map((it) => {
        const oi = itemsById[it.orderItemId];
        return {
          orderItemId: it.orderItemId,
          productName: oi.productName,
          paidQty: it.paidQty,
          basePrice: Number(oi.basePrice),
          totalPrice: Number(oi.totalPrice),
          amount: Number(oi.totalPrice) * it.paidQty,
          configDetails: configDetailsMap.get(it.orderItemId) || [],
        };
      }),
    });

    await this.print.create({
      type: 'payment_receipt',
      data: {
        payment: {
          paymentId: payment.id,
          clientName: mesa.clientName,
          tableNumber: mesa.tableNumber,
          waiterName: mesa.waiterName,
          paidAt: payment.paidAt,
          paymentMethod: data.paymentMethod,
          amount,
          remaining,
          isFullPayment: allPaid,
          items: data.items.map((it) => {
            const oi = itemsById[it.orderItemId];
            return {
              orderItemId: it.orderItemId,
              productName: oi.productName,
              paidQty: it.paidQty,
              basePrice: Number(oi.basePrice),
              totalPrice: Number(oi.totalPrice),
              configDetails: configDetailsMap.get(it.orderItemId) || [],
            };
          }),
        },
      },
    });

    return {
      ...payment,
      items: data.items.map((it) => ({
        orderItemId: it.orderItemId,
        paidQty: it.paidQty,
        amount: Number(itemsById[it.orderItemId].totalPrice) * it.paidQty,
      })),
    };
  }

  findByMesa(mesaId: string) {
    return this.payments.find({
      where: { mesaId },
      order: { paidAt: 'DESC' },
    });
  }
}
