import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import axios, { AxiosInstance } from 'axios';
import cookieParser from 'cookie-parser';
import { AuthController } from '../../../api/src/auth/auth.controller';
import { AuthService } from '../../../api/src/auth/auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshAccessToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
};

describe('Auth API e2e', () => {
  let app: INestApplication;
  let client: AxiosInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    await app.listen(0);

    const baseURL = await app.getUrl();
    client = axios.create({
      baseURL,
      validateStatus: () => true,
    });
  });

  afterAll(async () => {
    consoleErrorSpy?.mockRestore();
    await app?.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a user and returns refresh token for mobile origin', async () => {
    mockAuthService.register.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      token_type: 'Bearer',
      expires_in: 900,
      user: { id: 'u1', email: 'a@example.com' },
    });

    const res = await client.post(
      '/auth/register',
      { email: 'a@example.com', password: 'Password1!' },
      { headers: { origin: 'http://localhost:8100' } }
    );

    expect(res.status).toBe(201);
    expect(res.data.refresh_token).toBe('refresh');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate registration with conflict', async () => {
    mockAuthService.register.mockRejectedValue(
      new Error('This email is already registered')
    );

    const res = await client.post('/auth/register', {
      email: 'dup@example.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(409);
    expect(res.data.message).toContain('already registered');
  });

  it('logs in web users without returning refresh token body but sets cookie', async () => {
    mockAuthService.login.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh-cookie',
      token_type: 'Bearer',
      expires_in: 900,
      user: { id: 'u1', email: 'a@example.com' },
    });

    const res = await client.post('/auth/login', {
      email: 'a@example.com',
      password: 'Password1!',
    });

    expect(res.status).toBe(200);
    expect(res.data.refresh_token).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on invalid login', async () => {
    mockAuthService.login.mockRejectedValue(new Error('Invalid email or password'));

    const res = await client.post('/auth/login', {
      email: 'wrong@example.com',
      password: 'bad',
    });

    expect(res.status).toBe(401);
    expect(res.data.message).toContain('Invalid email or password');
  });

  it('refreshes access token using cookie refresh token', async () => {
    mockAuthService.refreshAccessToken.mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'rotated',
      token_type: 'Bearer',
      expires_in: 900,
    });

    const res = await client.post(
      '/auth/refresh',
      {},
      { headers: { Cookie: 'refreshToken=refresh-cookie;' } }
    );

    expect(res.status).toBe(200);
    expect(res.data.refresh_token).toBeUndefined(); // web clients rely on cookie rotation
    expect(res.headers['set-cookie']).toBeDefined();
    expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('refresh-cookie');
  });

  it('rejects refresh without token', async () => {
    const res = await client.post('/auth/refresh', {});

    expect(res.status).toBe(401);
    expect(res.data.message).toContain('Refresh token not found');
  });

  it('handles forgot-password and reset-password flows', async () => {
    mockAuthService.requestPasswordReset.mockResolvedValue({
      message: 'sent',
    });
    mockAuthService.resetPassword.mockResolvedValue({ message: 'ok' });

    const forgotRes = await client.post('/auth/forgot-password', {
      email: 'reset@example.com',
    });
    expect(forgotRes.status).toBe(200);
    expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith('reset@example.com');

    const resetRes = await client.post('/auth/reset-password', {
      token: 'reset-token',
      new_password: 'Password1!',
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.data.message).toBe('ok');
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
      'reset-token',
      'Password1!'
    );
  });
});
