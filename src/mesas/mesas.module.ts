import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mesa } from './mesa.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentItem } from '../payments/payment-item.entity';
import { MesasService } from './mesas.service';
import { MesasController } from './mesas.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PrintModule } from '../print/print.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Mesa,
      OrderItem,
      OrderItemConfig,
      Payment,
      PaymentItem,
    ]),
    WebhooksModule,
    PrintModule,
  ],
  controllers: [MesasController],
  providers: [MesasService],
  exports: [MesasService],
})
export class MesasModule {}
