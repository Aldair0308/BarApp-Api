import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';
import { ConfigGroup } from '../products/config-group.entity';
import { ConfigOption } from '../products/config-option.entity';
import { Mesa } from '../mesas/mesa.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentItem } from '../payments/payment-item.entity';
import { Inventory } from '../inventory/inventory.entity';
import { InventoryMovement } from '../inventory/inventory-movement.entity';
import { PrintJob } from '../print/print-job.entity';
import { v4 as uuid } from 'uuid';

config();

async function run() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'Bar',
    entities: [
      User,
      Product,
      ConfigGroup,
      ConfigOption,
      Mesa,
      OrderItem,
      OrderItemConfig,
      Payment,
      PaymentItem,
      Inventory,
      InventoryMovement,
      PrintJob,
    ],
    synchronize: true,
  });
  await ds.initialize();

  console.log('Limpiando tablas...');
  await ds.query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of [
    'print_jobs',
    'payment_items',
    'payments',
    'order_item_configs',
    'order_items',
    'mesas',
    'inventory_movements',
    'inventory',
    'config_options',
    'config_groups',
    'products',
    'users',
  ]) {
    await ds.query(`DELETE FROM \`${t}\``);
  }
  await ds.query('SET FOREIGN_KEY_CHECKS=1');

  console.log('Insertando usuarios...');
  const users = await ds.getRepository(User).save([
    { id: 'u1', name: 'Carlos Admin', email: 'admin@restobar.mx', pin: '1234', role: 'admin', active: 1 },
    { id: 'u2', name: 'Ana Mesero', email: 'ana@restobar.mx', pin: '2222', role: 'mesero', active: 1 },
    { id: 'u3', name: 'Luis Mesero', email: 'luis@restobar.mx', pin: '3333', role: 'mesero', active: 1 },
    { id: 'u4', name: 'Sofía Cocina', email: 'sofia@restobar.mx', pin: '4444', role: 'cocina', active: 1 },
    { id: 'u5', name: 'Marco Barra', email: 'marco@restobar.mx', pin: '5555', role: 'barra', active: 1 },
  ]);
  console.log(`  ✓ ${users.length} usuarios`);

  console.log('Insertando productos...');
  const productDefs: Array<Partial<Product> & { id: string; configs?: any[] }> = [
    {
      id: 'p1', name: 'Hamburguesa Clásica', description: 'Carne angus, queso cheddar, lechuga, jitomate',
      price: 165, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      configs: [
        { name: 'Ingredientes', required: false, type: 'multiple', sortOrder: 0, options: [
          { name: 'Queso', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Jitomate', extraPrice: 0, isDefault: true, sortOrder: 1 },
          { name: 'Lechuga', extraPrice: 0, isDefault: true, sortOrder: 2 },
          { name: 'Cebolla', extraPrice: 0, isDefault: false, sortOrder: 3 },
        ]},
        { name: 'Término de la carne', required: true, type: 'single', sortOrder: 1, options: [
          { name: 'Medio', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Bien cocido', extraPrice: 0, isDefault: false, sortOrder: 1 },
          { name: 'Tres cuartos', extraPrice: 0, isDefault: false, sortOrder: 2 },
        ]},
      ],
    },
    {
      id: 'p2', name: 'Hamburguesa BBQ', description: 'Doble carne, queso, cebolla crispy y BBQ',
      price: 195, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400',
      configs: [
        { name: 'Ingredientes', required: false, type: 'multiple', sortOrder: 0, options: [
          { name: 'Queso cheddar', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Cebolla crispy', extraPrice: 0, isDefault: true, sortOrder: 1 },
          { name: 'Tocino', extraPrice: 25, isDefault: false, sortOrder: 2 },
        ]},
      ],
    },
    {
      id: 'p3', name: 'Tacos de Carne Asada', description: 'Orden de 4 tacos con tortilla de maíz',
      price: 145, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
      configs: [
        { name: 'Salsa', required: true, type: 'single', sortOrder: 0, options: [
          { name: 'Verde', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Roja', extraPrice: 0, isDefault: false, sortOrder: 1 },
          { name: 'Habanero', extraPrice: 5, isDefault: false, sortOrder: 2 },
        ]},
        { name: 'Extras', required: false, type: 'multiple', sortOrder: 1, options: [
          { name: 'Cebolla', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Cilantro', extraPrice: 0, isDefault: true, sortOrder: 1 },
          { name: 'Limón', extraPrice: 0, isDefault: true, sortOrder: 2 },
        ]},
      ],
    },
    {
      id: 'p4', name: 'Orden de Papas', description: 'Papas fritas con sal y chile',
      price: 75, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
    },
    {
      id: 'p5', name: 'Ensalada César', description: 'Lechuga romana, crutones, aderezo césar y parmesano',
      price: 125, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400',
      configs: [
        { name: 'Pollo', required: false, type: 'single', sortOrder: 0, options: [
          { name: 'Sin pollo', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Con pollo', extraPrice: 35, isDefault: false, sortOrder: 1 },
        ]},
      ],
    },
    {
      id: 'p6', name: 'Pizza Margherita', description: 'Salsa de tomate, mozzarella y albahaca',
      price: 220, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
      configs: [
        { name: 'Tamaño', required: true, type: 'single', sortOrder: 0, options: [
          { name: 'Chica', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Mediana', extraPrice: 50, isDefault: false, sortOrder: 1 },
          { name: 'Grande', extraPrice: 90, isDefault: false, sortOrder: 2 },
        ]},
      ],
    },
    {
      id: 'p7', name: 'Margarita', description: 'Tequila, triple sec, limón y sal',
      price: 120, category: 'barra', destination: 'barra', available: 1, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
      configs: [
        { name: 'Tamaño', required: true, type: 'single', sortOrder: 0, options: [
          { name: 'On the rocks', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Frozen', extraPrice: 15, isDefault: false, sortOrder: 1 },
        ]},
      ],
    },
    {
      id: 'p8', name: 'Michelada', description: 'Cerveza con limón, sal y chile',
      price: 95, category: 'barra', destination: 'barra', available: 1, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400',
    },
    {
      id: 'p9', name: 'Agua Fresca', description: 'Horchata, jamaica o limón',
      price: 45, category: 'barra', destination: 'barra', available: 1, image: 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400',
      configs: [
        { name: 'Sabor', required: true, type: 'single', sortOrder: 0, options: [
          { name: 'Horchata', extraPrice: 0, isDefault: true, sortOrder: 0 },
          { name: 'Jamaica', extraPrice: 0, isDefault: false, sortOrder: 1 },
          { name: 'Limón', extraPrice: 0, isDefault: false, sortOrder: 2 },
        ]},
      ],
    },
    {
      id: 'p10', name: 'Pastel de Chocolate', description: 'Rebanada de pastel de chocolate con helado',
      price: 95, category: 'cocina', destination: 'cocina', available: 1, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400',
    },
  ];

  for (const p of productDefs) {
    const { configs, ...pData } = p;
    await ds.getRepository(Product).save(pData);
    if (configs) {
      for (const g of configs) {
        const group = await ds.getRepository(ConfigGroup).save({
          id: uuid(),
          productId: p.id,
          name: g.name,
          required: g.required ? 1 : 0,
          type: g.type,
          sortOrder: g.sortOrder || 0,
        });
        for (const o of g.options) {
          await ds.getRepository(ConfigOption).save({
            id: uuid(),
            groupId: group.id,
            name: o.name,
            extraPrice: o.extraPrice,
            isDefault: o.isDefault ? 1 : 0,
            sortOrder: o.sortOrder,
          });
        }
      }
    }
  }
  console.log(`  ✓ ${productDefs.length} productos`);

  console.log('Insertando inventario...');
  const invData = [
    { productId: 'p1', productName: 'Hamburguesa Clásica', currentStock: 15, minStock: 5, maxStock: 30, category: 'Hamburguesas' },
    { productId: 'p2', productName: 'Hamburguesa BBQ', currentStock: 12, minStock: 5, maxStock: 25, category: 'Hamburguesas' },
    { productId: 'p3', productName: 'Tacos de Carne Asada', currentStock: 18, minStock: 8, maxStock: 30, category: 'Tacos' },
    { productId: 'p4', productName: 'Orden de Papas', currentStock: 25, minStock: 10, maxStock: 50, category: 'Entradas' },
    { productId: 'p5', productName: 'Ensalada César', currentStock: 10, minStock: 5, maxStock: 20, category: 'Ensaladas' },
    { productId: 'p6', productName: 'Pizza Margherita', currentStock: 8, minStock: 4, maxStock: 16, category: 'Pizzas' },
    { productId: 'p7', productName: 'Margarita', currentStock: 30, minStock: 10, maxStock: 60, category: 'Bebidas' },
    { productId: 'p8', productName: 'Michelada', currentStock: 28, minStock: 10, maxStock: 50, category: 'Bebidas' },
    { productId: 'p9', productName: 'Agua Fresca', currentStock: 40, minStock: 15, maxStock: 80, category: 'Bebidas' },
    { productId: 'p10', productName: 'Pastel de Chocolate', currentStock: 6, minStock: 3, maxStock: 12, category: 'Postres' },
  ];
  for (const i of invData) {
    await ds.getRepository(Inventory).save({
      id: uuid(),
      ...i,
      unit: 'pza',
      lastRestocked: new Date(),
    });
  }
  console.log(`  ✓ ${invData.length} ítems de inventario`);

  console.log('Insertando mesas con items y pagos...');
  const m1 = await ds.getRepository(Mesa).save({
    id: 'm1', tableNumber: 4, clientName: 'Juan García', waiterId: 'u2', waiterName: 'Ana Mesero', status: 'activa',
  });
  const m2 = await ds.getRepository(Mesa).save({
    id: 'm2', tableNumber: 7, clientName: 'Familia López', waiterId: 'u2', waiterName: 'Ana Mesero', status: 'activa',
  });
  const m3 = await ds.getRepository(Mesa).save({
    id: 'm3', tableNumber: 12, clientName: 'Empresa MX', waiterId: 'u3', waiterName: 'Luis Mesero', status: 'cerrada',
    closedAt: new Date(),
  });
  const m4 = await ds.getRepository(Mesa).save({
    id: 'm4', tableNumber: 1, clientName: 'Sofía Reyes', waiterId: 'u3', waiterName: 'Luis Mesero', status: 'activa',
  });

  const i1 = await ds.getRepository(OrderItem).save({
    id: 'i1', mesaId: 'm1', productId: 'p1', productName: 'Hamburguesa Clásica',
    basePrice: 165, totalPrice: 165, quantity: 2, paidQty: 1, status: 'entregado',
    destination: 'cocina', paymentStatus: 'parcial', addedByName: 'Ana Mesero',
  });
  const i2 = await ds.getRepository(OrderItem).save({
    id: 'i2', mesaId: 'm1', productId: 'p7', productName: 'Margarita',
    basePrice: 120, totalPrice: 120, quantity: 1, paidQty: 0, status: 'entregado',
    destination: 'barra', paymentStatus: 'pendiente', addedByName: 'Ana Mesero',
  });
  await ds.getRepository(OrderItem).save({
    id: 'i3', mesaId: 'm2', productId: 'p6', productName: 'Pizza Margherita',
    basePrice: 220, totalPrice: 220, quantity: 1, paidQty: 0, status: 'en_proceso',
    destination: 'cocina', paymentStatus: 'pendiente', addedByName: 'Ana Mesero',
  });
  await ds.getRepository(OrderItem).save({
    id: 'i4', mesaId: 'm2', productId: 'p9', productName: 'Agua Fresca',
    basePrice: 45, totalPrice: 45, quantity: 2, paidQty: 0, status: 'listo',
    destination: 'barra', paymentStatus: 'pendiente', addedByName: 'Ana Mesero',
  });
  await ds.getRepository(OrderItem).save({
    id: 'i5', mesaId: 'm3', productId: 'p3', productName: 'Tacos de Carne Asada',
    basePrice: 145, totalPrice: 145, quantity: 2, paidQty: 2, status: 'entregado',
    destination: 'cocina', paymentStatus: 'pagado', addedByName: 'Luis Mesero', paidAt: new Date(),
  });
  await ds.getRepository(OrderItem).save({
    id: 'i6', mesaId: 'm3', productId: 'p8', productName: 'Michelada',
    basePrice: 95, totalPrice: 95, quantity: 3, paidQty: 3, status: 'entregado',
    destination: 'barra', paymentStatus: 'pagado', addedByName: 'Luis Mesero', paidAt: new Date(),
  });
  await ds.getRepository(OrderItem).save({
    id: 'i7', mesaId: 'm3', productId: 'p5', productName: 'Ensalada César',
    basePrice: 125, totalPrice: 125, quantity: 1, paidQty: 1, status: 'entregado',
    destination: 'cocina', paymentStatus: 'pagado', addedByName: 'Luis Mesero', paidAt: new Date(),
  });
  await ds.getRepository(OrderItem).save({
    id: 'i8', mesaId: 'm3', productId: 'p10', productName: 'Pastel de Chocolate',
    basePrice: 95, totalPrice: 95, quantity: 1, paidQty: 0, status: 'entregado',
    destination: 'cocina', paymentStatus: 'pendiente', addedByName: 'Luis Mesero',
  });
  await ds.getRepository(OrderItem).save({
    id: 'i9', mesaId: 'm4', productId: 'p2', productName: 'Hamburguesa BBQ',
    basePrice: 195, totalPrice: 195, quantity: 1, paidQty: 0, status: 'pendiente',
    destination: 'cocina', paymentStatus: 'pendiente', addedByName: 'Luis Mesero',
  });
  await ds.getRepository(OrderItem).save({
    id: 'i10', mesaId: 'm4', productId: 'p4', productName: 'Orden de Papas',
    basePrice: 75, totalPrice: 75, quantity: 1, paidQty: 0, status: 'pendiente',
    destination: 'cocina', paymentStatus: 'pendiente', addedByName: 'Luis Mesero',
  });
  await ds.getRepository(OrderItem).save({
    id: 'i11', mesaId: 'm4', productId: 'p7', productName: 'Margarita',
    basePrice: 120, totalPrice: 120, quantity: 2, paidQty: 0, status: 'pendiente',
    destination: 'barra', paymentStatus: 'pendiente', addedByName: 'Luis Mesero',
  });
  console.log('  ✓ 11 order items en 4 mesas');

  console.log('Insertando pagos...');
  const p1 = await ds.getRepository(Payment).save({
    id: 'pay1', mesaId: 'm1', amount: 165, paymentMethod: 'efectivo', paidBy: 'u2', notes: null,
  });
  await ds.getRepository(PaymentItem).save({
    id: uuid(), paymentId: p1.id, orderItemId: 'i1', paidQty: 1, amount: 165,
  });
  const p2 = await ds.getRepository(Payment).save({
    id: 'pay2', mesaId: 'm3', amount: 660, paymentMethod: 'tarjeta', paidBy: 'u3', notes: null,
  });
  await ds.getRepository(PaymentItem).save([
    { id: uuid(), paymentId: p2.id, orderItemId: 'i5', paidQty: 2, amount: 290 },
    { id: uuid(), paymentId: p2.id, orderItemId: 'i6', paidQty: 3, amount: 285 },
    { id: uuid(), paymentId: p2.id, orderItemId: 'i7', paidQty: 1, amount: 125 },
  ]);
  console.log('  ✓ 2 pagos');

  console.log('\nSeed completado con éxito');
  await ds.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
