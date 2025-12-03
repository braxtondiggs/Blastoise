import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';

const createResponse = () => {
  const cookies: Record<string, string> = {};
  return {
    cookie: jest.fn((key: string, value: string) => {
      cookies[key] = value;
    }),
    clearCookie: jest.fn((key: string) => {
      delete cookies[key];
    }),
    cookies,
  };
};

const createRequest = (overrides: Partial<Request> = {}): any => ({
  headers: {},
  cookies: {},
  ...overrides,
});

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  beforeEach(() => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      refreshAccessToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      requestPasswordReset: jest.fn(),
      resetPassword: jest.fn(),
    } as any;
    controller = new AuthController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('registers and sets cookie, including mobile refresh token', async () => {
    const request = createRequest({ headers: { origin: 'http://localhost:8100' } });
    const response = createResponse();
    service.register.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 900,
      user: { id: 'u1', email: 'test@example.com' },
    });

    const result = await controller.register(
      { email: 'test@example.com', password: 'Password1!' } as any,
      request as any,
      response as any
    );

    expect(service.register).toHaveBeenCalledWith('test@example.com', 'Password1!');
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'r',
      expect.objectContaining({ httpOnly: true })
    );
    expect(result.refresh_token).toBe('r');
  });

  it('translates registration errors', async () => {
    const request = createRequest();
    const response = createResponse();
    service.register.mockRejectedValue(new Error('This email is already registered'));

    await expect(
      controller.register({ email: 'dup', password: 'Password1!' } as any, request as any, response as any)
    ).rejects.toBeInstanceOf(ConflictException);

    service.register.mockRejectedValue(new Error('Password must be at least 8 characters'));
    await expect(
      controller.register({ email: 'weak', password: 'weak' } as any, request as any, response as any)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logs in and hides refresh token for web', async () => {
    const request = createRequest({ headers: { origin: 'https://app.example.com' } });
    const response = createResponse();
    service.login.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
      token_type: 'Bearer',
      expires_in: 900,
      user: { id: 'u1', email: 'test@example.com' },
    });

    const result = await controller.login(
      { email: 'test@example.com', password: 'Password1!' } as any,
      request as any,
      response as any
    );

    expect(response.cookie).toHaveBeenCalled();
    expect(result.refresh_token).toBeUndefined();
  });

  it('throws unauthorized on login failure', async () => {
    service.login.mockRejectedValue(new Error('bad creds'));
    await expect(
      controller.login({} as any, createRequest() as any, createResponse() as any)
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens from cookie or body', async () => {
    service.refreshAccessToken.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const response = createResponse();
    const request = createRequest({ cookies: { refreshToken: 'cookie-refresh' }, headers: { origin: 'http://localhost' } });
    const result = await controller.refresh(request as any, response as any, {});

    expect(service.refreshAccessToken).toHaveBeenCalledWith('cookie-refresh');
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'new-refresh',
      expect.any(Object)
    );
    expect(result.refresh_token).toBe('new-refresh');
  });

  it('rejects missing refresh token', async () => {
    await expect(
      controller.refresh(createRequest() as any, createResponse() as any, {})
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout clears cookie and revokes token', async () => {
    const response = createResponse();
    const request = createRequest({ cookies: { refreshToken: 'old' } });
    await controller.logout(request as any, response as any);

    expect(service.revokeRefreshToken).toHaveBeenCalledWith('old');
    expect(response.clearCookie).toHaveBeenCalledWith('refreshToken');
  });

  it('handles forgot and reset flows', async () => {
    await controller.forgotPassword({ email: 'reset@example.com' } as any);
    expect(service.requestPasswordReset).toHaveBeenCalledWith('reset@example.com');

    service.resetPassword.mockResolvedValue({ message: 'ok' });
    const result = await controller.resetPassword({ token: 't', new_password: 'Password1!' } as any);
    expect(service.resetPassword).toHaveBeenCalledWith('t', 'Password1!');
    expect(result).toEqual({ message: 'ok' });

    service.resetPassword.mockRejectedValue(new Error('bad token'));
    await expect(
      controller.resetPassword({ token: 't', new_password: 'Password1!' } as any)
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
