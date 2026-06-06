import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { MesasModule } from './mesas/mesas.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { BarModule } from './bar/bar.module';
import { ReportsModule } from './reports/reports.module';
import { PrintModule } from './print/print.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'Bar',
      autoLoadEntities: true,
      synchronize: false,
      charset: 'utf8mb4_unicode_ci',
      extra: { connectionLimit: 10 },
    }),
    AuthModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    MesasModule,
    OrdersModule,
    PaymentsModule,
    KitchenModule,
    BarModule,
    ReportsModule,
    PrintModule,
    WebhooksModule,
  ],
})
export class AppModule {}
