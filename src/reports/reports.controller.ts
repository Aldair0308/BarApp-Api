import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ReportsService } from './reports.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales')
  sales(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.sales(period, startDate, endDate);
  }

  @Get('products')
  products(
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reports.topProducts(period, limit ? parseInt(limit, 10) : 10);
  }

  @Get('waiters')
  waiters() {
    return this.reports.waiters();
  }

  @Get('export/pdf')
  exportPdf(@Query('period') period?: string) {
    return this.reports.exportPdf(period);
  }

  @Post('ticket')
  generateTicket(
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.reports.generateReportTicket(startDate, endDate);
  }
}
