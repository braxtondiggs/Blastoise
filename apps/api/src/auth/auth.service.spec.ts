import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { UserService } from '../modules/user/user.service';
import { EmailService } from '../common/email/email.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockUserRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockRefreshRepo = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockPasswordResetRepo = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

describe('AuthService', () => {
  const jwtService = {
    sign: jest.fn().mockReturnValue('access-token'),
  } as unknown as JwtService;

  const configService = {
    get: jest.fn().mockReturnValue('7d'),
  } as unknown as ConfigService;

  const userService = {
    createDefaultPreferences: jest.fn(),
  } as unknown as UserService;

  const emailService = {
    sendPasswordResetEmail: jest.fn(),
  } as unknown as EmailService;

  let userRepository: ReturnType<typeof mockUserRepo>;
  let refreshTokenRepository: ReturnType<typeof mockRefreshRepo>;
  let passwordResetTokenRepository: ReturnType<typeof mockPasswordResetRepo>;
  let service: AuthService;

  beforeEach(() => {
    userRepository = mockUserRepo();
    refreshTokenRepository = mockRefreshRepo();
    passwordResetTokenRepository = mockPasswordResetRepo();

    service = new AuthService(
      userRepository as any,
      refreshTokenRepository as any,
      passwordResetTokenRepository as any,
      jwtService,
      configService,
      userService,
      emailService
    );

    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(32, 1));
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('registers a new user and generates tokens', async () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    userRepository.findOne.mockResolvedValue(null);
    userRepository.save.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      created_at: createdAt,
      password_hash: 'hashed-password',
    } as User);
    refreshTokenRepository.save.mockResolvedValue({} as RefreshToken);

    const result = await service.register('Test@Example.com', 'Password1!');

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password_hash: 'hashed-password',
      })
    );
    expect(userService.createDefaultPreferences).toHaveBeenCalledWith('user-1');
    expect(refreshTokenRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        token_hash: expect.any(String),
        user_id: 'user-1',
        expires_at: expect.any(Date),
      })
    );
    expect(result).toMatchObject({
      access_token: 'access-token',
      refresh_token: expect.any(String),
      user: {
        id: 'user-1',
        email: 'test@example.com',
        created_at: createdAt,
      },
    });
  });

  it('throws when registering an existing email', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'user-1' } as User);

    await expect(
      service.register('duplicate@example.com', 'Password1!')
    ).rejects.toThrow('This email is already registered');
  });

  it('rejects weak passwords', async () => {
    await expect(
      service.register('new@example.com', 'short')
    ).rejects.toThrow('Password must be at least 8 characters');
  });

  it('fails login when password is invalid', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      password_hash: 'stored-hash',
    } as User);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login('test@example.com', 'wrong-password')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rotates refresh tokens when refreshing access token', async () => {
    const refreshToken = 'refresh-token';
    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');

    refreshTokenRepository.findOne.mockResolvedValue({
      id: 'rt-1',
      token_hash: hashed,
      user_id: 'user-1',
      expires_at: new Date(Date.now() + 10000),
    } as RefreshToken);

    userRepository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as User);

    refreshTokenRepository.save.mockResolvedValue({} as RefreshToken);
    refreshTokenRepository.update.mockResolvedValue({} as any);

    const result = await service.refreshAccessToken(refreshToken);

    expect(result.access_token).toBe('access-token');
    expect(refreshTokenRepository.update).toHaveBeenCalledWith(
      { token_hash: hashed },
      { revoked_at: expect.any(Date) }
    );
    expect(refreshTokenRepository.save).toHaveBeenCalled();
  });

  it('returns null when refresh token is expired or revoked', async () => {
    refreshTokenRepository.findOne.mockResolvedValue({
      token_hash: 'hash',
      expires_at: new Date(Date.now() - 1000),
    } as RefreshToken);

    const expired = await service.validateRefreshToken('token');
    expect(expired).toBeNull();

    refreshTokenRepository.findOne.mockResolvedValue({
      token_hash: 'hash',
      expires_at: new Date(Date.now() + 1000),
      revoked_at: new Date(),
    } as RefreshToken);

    const revoked = await service.validateRefreshToken('token');
    expect(revoked).toBeNull();
  });

  it('requests password reset without revealing account existence', async () => {
    userRepository.findOne.mockResolvedValue(null);

    const response = await service.requestPasswordReset('missing@example.com');

    expect(response.message).toContain('If an account exists');
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sends password reset email for existing user', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 'user-2',
      email: 'reset@example.com',
    } as User);

    const saveSpy = passwordResetTokenRepository.save.mockResolvedValue(
      {} as PasswordResetToken
    );

    const result = await service.requestPasswordReset('reset@example.com');

    expect(passwordResetTokenRepository.update).toHaveBeenCalledWith(
      { user_id: 'user-2', used: false },
      { used: true }
    );
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        token_hash: expect.any(String),
        user_id: 'user-2',
        expires_at: expect.any(Date),
      })
    );
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'reset@example.com',
      expect.any(String)
    );
    expect(result.message).toContain('If an account exists');
  });

  it('prevents resetting password with expired token', async () => {
    passwordResetTokenRepository.findOne.mockResolvedValue({
      id: 'prt-1',
      token_hash: 'hash',
      user_id: 'user-1',
      expires_at: new Date(Date.now() - 1000),
      used: false,
    } as PasswordResetToken);

    await expect(
      service.resetPassword('token', 'Password1!')
    ).rejects.toThrow('Reset token has expired');
  });

  it('resets password and revokes existing refresh tokens', async () => {
    const token = 'reset-token';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    passwordResetTokenRepository.findOne.mockResolvedValue({
      id: 'prt-1',
      token_hash: tokenHash,
      user_id: 'user-1',
      expires_at: new Date(Date.now() + 1000),
      used: false,
    } as PasswordResetToken);

    const updateSpy = userRepository.update.mockResolvedValue({} as any);
    refreshTokenRepository.update.mockResolvedValue({} as any);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const response = await service.resetPassword(token, 'Password1!');

    expect(updateSpy).toHaveBeenCalledWith(
      { id: 'user-1' },
      { password_hash: 'new-hash' }
    );
    expect(passwordResetTokenRepository.update).toHaveBeenCalledWith(
      { id: 'prt-1' },
      { used: true }
    );
    expect(refreshTokenRepository.update).toHaveBeenCalledWith(
      { user_id: 'user-1', revoked_at: null as any },
      { revoked_at: expect.any(Date) }
    );
    expect(response.message).toBe('Password has been reset successfully');
  });
});
