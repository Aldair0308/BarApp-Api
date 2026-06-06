import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrdersService } from './orders.service';

class ConfigSelectionDto {
  @IsString() groupId: string;
  @IsString() groupName: string;
  @IsArray() @IsString({ each: true }) selectedOptionIds: string[];
}

class AddItemDto {
  @IsString() productId: string;
  @IsString() productName: string;
  @IsNumber() basePrice: number;
  @IsNumber() totalPrice: number;
  @IsNumber() quantity: number;
  @IsIn(['cocina', 'barra', 'otros']) destination: 'cocina' | 'barra' | 'otros';
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ConfigSelectionDto)
  configurations?: ConfigSelectionDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) modifications?: string[];
  @IsOptional() @IsString() notes?: string;
}

class AddItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AddItemDto)
  items: AddItemDto[];
}

class UpdateStatusDto {
  @IsIn(['pendiente', 'en_proceso', 'listo', 'entregado']) status: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('mesas/:mesaId/items')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  add(
    @Param('mesaId') mesaId: string,
    @Body() dto: AddItemsDto,
    @Req() req: any,
  ) {
    return this.orders.addItems(
      mesaId,
      req.user.userId,
      req.user.name,
      dto.items,
    );
  }

  @Patch(':itemId/status')
  status(
    @Param('mesaId') mesaId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.updateStatus(itemId, dto.status);
  }

  @Delete(':itemId')
  remove(@Param('mesaId') mesaId: string, @Param('itemId') itemId: string) {
    return this.orders.removeItem(mesaId, itemId);
  }
}
