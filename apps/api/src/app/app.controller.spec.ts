import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  it('returns hello data', () => {
    const service = { getData: jest.fn().mockReturnValue({ message: 'Hi' }) } as unknown as AppService;
    const config = {} as ConfigService;
    const controller = new AppController(service, config);

    expect(controller.getData()).toEqual({ message: 'Hi' });
  });

  it('returns feature flags based on env', () => {
    const service = { getData: jest.fn() } as unknown as AppService;
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'ENABLE_GUEST_MODE') return 'true';
        if (key === 'ENABLE_MAGIC_LINK') return 'false';
        return fallback;
      }),
    } as unknown as ConfigService;
    const controller = new AppController(service, config);

    const result = controller.getConfig();

    expect(config.get).toHaveBeenCalledWith('ENABLE_GUEST_MODE', 'false');
    expect(config.get).toHaveBeenCalledWith('ENABLE_MAGIC_LINK', 'false');
    expect(result.features).toEqual({
      guest_mode: true,
      magic_link: false,
    });
  });
});
