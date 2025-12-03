import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { Public } from '../common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Get()
  getData() {
    return this.appService.getData();
  }

  @Public()
  @Get('config')
  getConfig() {
    return {
      features: {
        guest_mode: this.configService.get<string>('ENABLE_GUEST_MODE', 'false') === 'true',
        magic_link: this.configService.get<string>('ENABLE_MAGIC_LINK', 'false') === 'true',
      },
    };
  }
}
