import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { InventoryService } from './inventory.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

class RestockDto {
  @IsNumber() quantity: number;
}

class AdjustDto {
  @IsOptional() @IsNumber() currentStock?: number;
  @IsOptional() @IsNumber() minStock?: number;
  @IsOptional() @IsNumber() maxStock?: number;
  @IsOptional() @IsString() unit?: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inv: InventoryService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.inv.findAll({ search, status });
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.inv.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/restock')
  restock(@Param('id') id: string, @Body() dto: RestockDto, @Req() req: any) {
    return this.inv.restock(id, dto.quantity, req.user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  adjust(@Param('id') id: string, @Body() dto: AdjustDto, @Req() req: any) {
    return this.inv.adjust(id, dto, req.user.userId);
  }

  @Get(':id/movements')
  movements(@Param('id') id: string) {
    return this.inv.getMovements(id);
  }
}
