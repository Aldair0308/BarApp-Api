import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, IsString, Min } from 'class-validator';
import { MesasService } from './mesas.service';
import { Roles, RolesGuard } from '../auth/roles.guard';

class CreateMesaDto {
  @IsInt() @Min(1) tableNumber: number;
  @IsString() clientName: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('mesas')
export class MesasController {
  constructor(private readonly mesas: MesasService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('waiterId') waiterId?: string,
  ) {
    return this.mesas.findAll({ status, waiterId });
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.mesas.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMesaDto, @Req() req: any) {
    return this.mesas.create({
      tableNumber: dto.tableNumber,
      clientName: dto.clientName,
      waiterId: req.user.userId,
      waiterName: req.user.name,
    });
  }

  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.mesas.close(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mesas.remove(id);
  }

  @Get(':id/balance')
  balance(@Param('id') id: string) {
    return this.mesas.balance(id);
  }
}
