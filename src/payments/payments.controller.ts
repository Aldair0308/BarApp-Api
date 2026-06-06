import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentsService } from './payments.service';

class PaymentItemInputDto {
  @IsString() orderItemId: string;
  @IsInt() @Min(1) paidQty: number;
}

class CreatePaymentDto {
  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia';
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentItemInputDto)
  items: PaymentItemInputDto[];
}

@UseGuards(AuthGuard('jwt'))
@Controller('mesas/:mesaId/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(
    @Param('mesaId') mesaId: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: any,
  ) {
    return this.payments.create(mesaId, req.user.userId, dto);
  }

  @Get()
  list(@Param('mesaId') mesaId: string) {
    return this.payments.findByMesa(mesaId);
  }
}
