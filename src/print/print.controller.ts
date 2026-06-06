import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { PrintService } from './print.service';

class CreatePrintJobDto {
  @IsIn(['mesa_ticket', 'kitchen_order', 'bar_order', 'payment_receipt', 'report_ticket'])
  type: 'mesa_ticket' | 'kitchen_order' | 'bar_order' | 'payment_receipt' | 'report_ticket';
  @IsObject() data: any;
}

class UpdatePrintJobDto {
  @IsIn(['pendiente', 'impreso', 'error']) status: string;
  @IsOptional() @IsString() error?: string;
}

@UseGuards(AuthGuard('jwt'))
@Controller('print')
export class PrintController {
  constructor(private readonly print: PrintService) {}

  @Get('jobs')
  list(@Query('status') status?: string) {
    return this.print.findAll({ status });
  }

  @Post('jobs')
  create(@Body() dto: CreatePrintJobDto) {
    return this.print.create(dto);
  }

  @Get('jobs/pending')
  pending() {
    return this.print.findPending();
  }

  @Patch('jobs/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePrintJobDto) {
    return this.print.update(id, dto);
  }

  @Get('status')
  status() {
    return this.print.status();
  }
}
