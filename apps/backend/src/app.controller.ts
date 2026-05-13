import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      service: 'GED Platform API',
      api: '/api',
      docs: '/api/docs',
      health: '/api/health',
    };
  }
}
