import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ConfigGroup } from './config-group.entity';
import { ConfigOption } from './config-option.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ConfigGroup, ConfigOption]),
    WebhooksModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
