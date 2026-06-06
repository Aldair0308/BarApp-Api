import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { Payment } from '../payments/payment.entity';
import { PaymentItem } from '../payments/payment-item.entity';
import { Mesa } from '../mesas/mesa.entity';
import { User } from '../users/user.entity';
import { PrintModule } from '../print/print.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderItem, Payment, PaymentItem, Mesa, User]), PrintModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
