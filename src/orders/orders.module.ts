import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './order-item.entity';
import { OrderItemConfig } from './order-item-config.entity';
import { ConfigOption } from '../products/config-option.entity';
import { Mesa } from '../mesas/mesa.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { PrintModule } from '../print/print.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, OrderItemConfig, ConfigOption, Mesa]),
    InventoryModule,
    WebhooksModule,
    PrintModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
