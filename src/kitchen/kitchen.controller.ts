import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { KitchenService } from './kitchen.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'cocina')
@Controller('kitchen/orders')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Get()
  list() {
    return this.kitchen.getOrders();
  }

  @Patch(':itemId/mark-delivered')
  deliver(@Param('itemId') itemId: string) {
    return this.kitchen.markDelivered(itemId);
  }
}
