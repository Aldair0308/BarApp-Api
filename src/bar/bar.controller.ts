import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString } from 'class-validator';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { BarService } from './bar.service';

class MarkAllDto {
  @IsString() mesaId: string;
}

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'barra')
@Controller('bar/orders')
export class BarController {
  constructor(private readonly bar: BarService) {}

  @Get()
  list() {
    return this.bar.getOrders();
  }

  @Patch('mark-all-delivered')
  markAll(@Body() dto: MarkAllDto) {
    return this.bar.markAllDelivered(dto.mesaId);
  }
}
