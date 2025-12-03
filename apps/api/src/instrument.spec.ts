import * as Sentry from '@sentry/nestjs';

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
}));

jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(() => 'profile'),
}));

describe('instrument.ts', () => {
  const originalEnv = { ...process.env };
  const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (Sentry.init as jest.Mock).mockClear();
    consoleWarn.mockClear();
    consoleLog.mockClear();
  });

  it('initializes Sentry when DSN is present and scrubs sensitive data', async () => {
    process.env.SENTRY_DSN = 'https://example';
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      require('./instrument');
    });

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const initArgs = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(initArgs.dsn).toBe('https://example');
    expect(initArgs.environment).toBe('production');
    expect(initArgs.tracesSampleRate).toBe(0.1);
    expect(initArgs.profilesSampleRate).toBe(0.1);

    const sanitized = initArgs.beforeSend(
      {
        request: {
          headers: {
            Authorization: 'secret',
            cookie: 'token',
          },
          cookies: { session: 'abc' },
        },
        extra: {
          password: 'p',
          tokenValue: 't',
          safe: 'ok',
        },
        breadcrumbs: [
          { data: { secretKey: 'x', keep: 'ok' } },
        ],
      },
      {}
    );

    expect(sanitized.request?.headers?.Authorization).toBeUndefined();
    expect(sanitized.request?.headers?.cookie).toBeUndefined();
    expect(sanitized.request?.cookies).toBeUndefined();
    expect(sanitized.extra).toEqual({ safe: 'ok' });
    expect(sanitized.breadcrumbs?.[0].data).toEqual({ keep: 'ok' });
  });

  it('warns when DSN is missing', () => {
    delete process.env.SENTRY_DSN;

    jest.isolateModules(() => {
      require('./instrument');
    });

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalled();
  });
});
