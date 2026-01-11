import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Mindora Backend is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
