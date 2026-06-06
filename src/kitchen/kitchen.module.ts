import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Mesa } from '../mesas/mesa.entity';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, OrderItemConfig, Mesa]),
    WebhooksModule,
  ],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
