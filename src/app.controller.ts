import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Mindora Backend API is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
