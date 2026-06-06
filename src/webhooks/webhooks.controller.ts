import { Body, Controller, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhook')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  receive(@Body() body: any) {
    return { received: true, event: body?.event, at: new Date().toISOString() };
  }
}
