import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { OrderItemConfig } from '../orders/order-item-config.entity';
import { Mesa } from '../mesas/mesa.entity';
import { BarService } from './bar.service';
import { BarController } from './bar.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, OrderItemConfig, Mesa]),
    WebhooksModule,
  ],
  controllers: [BarController],
  providers: [BarService],
})
export class BarModule {}
