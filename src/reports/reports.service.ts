import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentItem } from '../payments/payment-item.entity';
import { Mesa } from '../mesas/mesa.entity';
import { User } from '../users/user.entity';
import { PrintService } from '../print/print.service';

function periodRange(period?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const mxParts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const p = (t: string) => parseInt(mxParts.find(x => x.type === t)!.value, 10);
  const mxYear = p('year'), mxMonth = p('month'), mxDay = p('day');
  const mxHour = p('hour'), mxMin = p('minute'), mxSec = p('second');
  const mxEpoch = Date.UTC(mxYear, mxMonth - 1, mxDay, mxHour, mxMin, mxSec);
  const offsetMs = Date.now() - mxEpoch;

  const toUtc = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
    new Date(Date.UTC(y, m - 1, d, h, min, s, ms) + offsetMs);

  const todayStart = () => toUtc(mxYear, mxMonth, mxDay);
  const todayEnd = () => toUtc(mxYear, mxMonth, mxDay, 23, 59, 59, 999);
  const dayStart = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return toUtc(y, m, d);
  };
  const dayEnd = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return toUtc(y, m, d, 23, 59, 59, 999);
  };

  if (period === 'semana') {
    const d = new Date(Date.UTC(mxYear, mxMonth - 1, mxDay));
    const weekAgo = new Date(d.getTime() - 6 * 86400000);
    return {
      start: new Date(weekAgo.getTime() + offsetMs),
      end: todayEnd(),
    };
  }
  if (period === 'mes') {
    const d = new Date(Date.UTC(mxYear, mxMonth - 1, mxDay));
    const monthAgo = new Date(d.getTime() - 29 * 86400000);
    return {
      start: new Date(monthAgo.getTime() + offsetMs),
      end: todayEnd(),
    };
  }
  if (startDate && endDate) {
    return { start: dayStart(startDate), end: dayEnd(endDate) };
  }
  return { start: todayStart(), end: todayEnd() };
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(OrderItem) private readonly items: Repository<OrderItem>,
    @InjectRepository(OrderItemConfig) private readonly itemConfigs: Repository<OrderItemConfig>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentItem) private readonly paymentItems: Repository<PaymentItem>,
    @InjectRepository(Mesa) private readonly mesas: Repository<Mesa>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly print: PrintService,
  ) {}

  async timezoneDiag() {
    const rows = await this.payments.query(`
      SELECT
        @@system_time_zone AS system_tz,
        @@global.time_zone AS global_tz,
        @@session.time_zone AS session_tz,
        NOW() AS mysql_now,
        UTC_TIMESTAMP() AS mysql_utc
    `);
    return {
      ...rows[0],
      serverNow: new Date().toISOString(),
      serverTz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      serverOffset: new Date().getTimezoneOffset(),
    };
  }

  private async getTopExtras(
    start: Date,
    end: Date,
    limit = 10,
  ): Promise<{ name: string; quantity: number; revenue: number }[]> {
    const rows = await this.itemConfigs
      .createQueryBuilder('c')
      .innerJoin('order_items', 'i', 'i.id = c.order_item_id')
      .select('c.option_name', 'name')
      .addSelect('SUM(i.quantity)', 'quantity')
      .addSelect('SUM(i.quantity * c.extra_price)', 'revenue')
      .where('c.extra_price > 0')
      .andWhere('i.added_at BETWEEN :start AND :end', { start, end })
      .groupBy('c.option_name')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany<{ name: string; quantity: string; revenue: string }>();
    return rows.map((r) => ({
      name: r.name,
      quantity: Number(r.quantity) || 0,
      revenue: Number(r.revenue) || 0,
    }));
  }

  async sales(period?: string, startDate?: string, endDate?: string) {
    const { start, end } = periodRange(period, startDate, endDate);
    const pays = await this.payments
      .createQueryBuilder('p')
      .where('p.paid_at BETWEEN :s AND :e', { s: start, e: end })
      .getMany();
    const totalSales = pays.reduce((s, p) => s + Number(p.amount), 0);
    const totalOrders = pays.length;
    const avgTicket = totalOrders ? totalSales / totalOrders : 0;

    const items = await this.items
      .createQueryBuilder('i')
      .where('i.added_at BETWEEN :s AND :e', { s: start, e: end })
      .getMany();

    const byProduct: Record<string, { qty: number; revenue: number }> = {};
    for (const i of items) {
      const k = i.productId;
      if (!byProduct[k]) byProduct[k] = { qty: 0, revenue: 0 };
      byProduct[k].qty += i.quantity;
      byProduct[k].revenue += Number(i.totalPrice) * i.quantity;
    }
    const topProducts = Object.entries(byProduct)
      .map(([id, v]) => ({
        productId: id,
        name: items.find((i) => i.productId === id)?.productName,
        quantity: v.qty,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const byHour: Record<string, { orders: number; revenue: number }> = {};
    for (const p of pays) {
      const h = new Date(p.paidAt).getHours();
      const key = `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
      if (!byHour[key]) byHour[key] = { orders: 0, revenue: 0 };
      byHour[key].orders += 1;
      byHour[key].revenue += Number(p.amount);
    }
    const salesByHour = Object.entries(byHour).map(([hour, v]) => ({
      hour,
      orders: v.orders,
      revenue: v.revenue,
    }));

    const byMethod: Record<string, number> = {};
    for (const p of pays) {
      byMethod[p.paymentMethod] =
        (byMethod[p.paymentMethod] || 0) + Number(p.amount);
    }

    return {
      period: period || 'hoy',
      totalSales,
      totalOrders,
      avgTicket,
      avgTimeMin: 18,
      topProducts,
      topExtras: await this.getTopExtras(start, end),
      salesByHour,
      salesByDay: [],
      paymentMethods: byMethod,
    };
  }

  async topProducts(period?: string, limit = 10) {
    const { start, end } = periodRange(period);
    const items = await this.items
      .createQueryBuilder('i')
      .where('i.added_at BETWEEN :s AND :e', { s: start, e: end })
      .getMany();
    const byProduct: Record<string, { qty: number; revenue: number; name: string }> = {};
    for (const i of items) {
      if (!byProduct[i.productId])
        byProduct[i.productId] = { qty: 0, revenue: 0, name: i.productName };
      byProduct[i.productId].qty += i.quantity;
      byProduct[i.productId].revenue += Number(i.totalPrice) * i.quantity;
    }
    return Object.entries(byProduct)
      .map(([id, v]) => ({
        productId: id,
        name: v.name,
        quantity: v.qty,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  async waiters() {
    const mesas = await this.mesas.find();
    const pays = await this.payments.find();
    const out: Record<string, any> = {};
    for (const m of mesas) {
      if (!out[m.waiterId])
        out[m.waiterId] = {
          waiterId: m.waiterId,
          waiterName: m.waiterName,
          mesasAtendidas: 0,
          totalVendido: 0,
        };
      out[m.waiterId].mesasAtendidas += 1;
    }
    for (const p of pays) {
      const m = mesas.find((x) => x.id === p.mesaId);
      if (m && out[m.waiterId]) {
        out[m.waiterId].totalVendido += Number(p.amount);
      }
    }
    for (const k of Object.keys(out)) {
      out[k].propinas = out[k].totalVendido * 0.1;
    }
    return Object.values(out);
  }

  async exportPdf(period?: string) {
    const data = await this.sales(period);
    const lines = [
      `Reporte de Ventas - ${data.period}`,
      `Total: $${data.totalSales.toFixed(2)}`,
      `Órdenes: ${data.totalOrders}`,
      `Ticket Promedio: $${data.avgTicket.toFixed(2)}`,
      '',
      'Top Productos:',
      ...data.topProducts.map(
        (p: any) => `  - ${p.name}: ${p.quantity} unidades, $${p.revenue.toFixed(2)}`,
      ),
      '',
      'Extras Más Vendidos:',
      ...(data.topExtras || []).map(
        (e: any) => `  - ${e.name}: ${e.quantity} unidades, $${e.revenue.toFixed(2)}`,
      ),
    ];
    return {
      format: 'pdf-text',
      generatedAt: new Date().toISOString(),
      content: lines.join('\n'),
    };
  }

  private readonly CATEGORY_MAP: Record<string, string[]> = {
    Cervezas: [
      'XX Laguer Chica', 'XX Laguer Grande', 'XX Ambar Chica', 'XX Ambar Grande',
      'XX Lager Lata', 'Corona', 'Corona Premier', 'Negra Modelo',
      'Modelo Especial', 'Victoria', 'Clamato Extra', 'Caguama XX Ambar',
    ],
    Aldair: [
      'Palomitas', 'Heineken Cero alcohol', 'Squirt', 'Pepsi', '7Up', 'Agua',
    ],
    Enia: [
      'Maruchan', 'Nachos', 'Papas a la francesa', 'Torta de Milanesa',
      'Nuggets', 'Boneless', 'Alitas', 'Deditos de queso', 'Hot dogs',
    ],
    Javier: [
      'Caribe', 'Caribe de fresa', 'Caribe de durazno', 'Bohemia Vienna', 'Bohemia Pilsner',
      'Bohemia Cristal', 'Super de fruta', 'Licuado', 'Peñafiel', 'Sangría',
    ],
    Ana: [
      'Marlboro rojo', 'Marlboro de capsula', 'Marlboro sandia', 'Botana', 'Chicles', 'Chocolate',
    ],
  };

  private getCategoryName(productName: string): string {
    for (const [cat, products] of Object.entries(this.CATEGORY_MAP)) {
      if (products.some(p => productName.toLowerCase().includes(p.toLowerCase()))) {
        return cat;
      }
    }
    return 'Otros';
  }

  async generateReportTicket(startDate: string, endDate: string) {
    const { start, end } = periodRange(undefined, startDate, endDate);

    const periodLabel = `del ${startDate} al ${endDate}`;

    const pays = await this.payments
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.items', 'paymentItems')
      .where('p.paid_at BETWEEN :s AND :e', { s: start, e: end })
      .getMany();
    const totalSales = pays.reduce((s, p) => s + Number(p.amount), 0);
    const totalOrders = pays.length;

    const orderItemsMap = new Map<string, { paidQty: number }>();
    for (const p of pays) {
      for (const pi of p.items || []) {
        if (!orderItemsMap.has(pi.orderItemId)) {
          orderItemsMap.set(pi.orderItemId, { paidQty: 0 });
        }
        orderItemsMap.get(pi.orderItemId)!.paidQty += pi.paidQty;
      }
    }

    const orderItemIds = [...orderItemsMap.keys()];
    const items = orderItemIds.length > 0
      ? await this.items.find({ where: { id: In(orderItemIds) } })
      : [];

    const totalProductos = [...orderItemsMap.values()].reduce((s, v) => s + v.paidQty, 0);

    const byProduct: Record<string, { qty: number; revenue: number; name: string }> = {};
    for (const i of items) {
      if (!byProduct[i.productId])
        byProduct[i.productId] = { qty: 0, revenue: 0, name: i.productName };
      byProduct[i.productId].qty += orderItemsMap.get(i.id)?.paidQty || 0;
      byProduct[i.productId].revenue += Number(i.totalPrice) * (orderItemsMap.get(i.id)?.paidQty || 0);
    }
    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([id, v]) => ({ name: v.name, cantidad: v.qty }));

    const byCategory: Record<string, { total: number; productos: { nombre: string; cantidad: number; precio: number; importe: number }[] }> = {};
    for (const i of items) {
      const cat = this.getCategoryName(i.productName);
      if (!byCategory[cat]) byCategory[cat] = { total: 0, productos: [] };
      const paidQty = orderItemsMap.get(i.id)?.paidQty || 0;
      const importe = Number(i.totalPrice) * paidQty;
      byCategory[cat].total += importe;
      const existing = byCategory[cat].productos.find(p => p.nombre === i.productName);
      if (existing) {
        existing.cantidad += paidQty;
        existing.importe += importe;
      } else {
        byCategory[cat].productos.push({
          nombre: i.productName,
          cantidad: paidQty,
          precio: Number(i.totalPrice),
          importe,
        });
      }
    }

    const categorias: Record<string, Record<string, { total: number; productos: any[] }>> = {};
    for (const [cat, data] of Object.entries(byCategory)) {
      categorias[cat] = {
        [startDate]: {
          total: data.total,
          productos: data.productos,
        },
      };
    }

    const totalesCategoria: Record<string, number> = {};
    const totalesCategoriaFormatted: Record<string, string> = {};
    for (const [cat, data] of Object.entries(byCategory)) {
      totalesCategoria[cat] = data.total;
      totalesCategoriaFormatted[cat] = `$${data.total.toFixed(2)}`;
    }

    const topExtras = await this.getTopExtras(start, end);
    const topExtrasMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const e of topExtras) {
      topExtrasMap[e.name] = { quantity: e.quantity, revenue: e.revenue };
    }

    const ticketData = {
      title: 'REPORTE DE VENTAS',
      periodo: 'rango',
      periodLabel,
      periodDate: `${startDate} - ${endDate}`,
      fecha_generacion: new Date().toISOString(),
      totales: {
        general: totalSales,
        general_formatted: `$${totalSales.toFixed(2)}`,
        total_productos: totalProductos,
      },
      totales_categoria: totalesCategoria,
      totales_categoria_formatted: totalesCategoriaFormatted,
      productos_mas_vendidos: Object.fromEntries(topProducts.map(p => [p.name, p.cantidad])),
      top_extras: topExtrasMap,
      categorias,
      resumen_dias: [],
    };

    return this.print.create({ type: 'report_ticket', data: ticketData });
  }
}
