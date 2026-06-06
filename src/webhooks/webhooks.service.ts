import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('Webhooks');
  private url = process.env.PRINTER_WEBHOOK_URL || 'http://localhost:3100/api/webhook';

  dispatch(event: string, payload: any) {
    const body = { event, payload };
    this.logger.log(`[webhook] ${event} → ${this.url}`);
    axios
      .post(this.url, body, { timeout: 3000 })
      .catch((err) =>
        this.logger.warn(
          `webhook delivery failed: ${err?.message || 'unknown'}`,
        ),
      );
  }
}
