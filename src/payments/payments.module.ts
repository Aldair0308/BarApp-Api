import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentItem } from './payment-item.entity';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Mesa } from '../mesas/mesa.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PrintModule } from '../print/print.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentItem, OrderItem, OrderItemConfig, Mesa]),
    WebhooksModule,
    PrintModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
