import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitGuard, RateLimitOptions } from './rate-limit.guard';

jest.mock('@blastoise/data-backend', () => {
  const cacheServiceMock = {
    get: jest.fn(),
    set: jest.fn(),
    increment: jest.fn(),
    ttl: jest.fn(),
  };

  const rateLimitKeyMock = jest.fn(
    (identifier: string, endpoint: string) =>
      `ratelimit:${identifier}:${endpoint}`
  );

  return {
    CacheService: jest.fn(() => cacheServiceMock),
    CacheKeys: {
      rateLimit: rateLimitKeyMock,
    },
    __cacheServiceMock: cacheServiceMock,
    __rateLimitKeyMock: rateLimitKeyMock,
  };
});

const { __cacheServiceMock: cacheServiceMock, __rateLimitKeyMock: rateLimitKeyMock } =
  jest.requireMock('@blastoise/data-backend');

const createContext = (
  rateLimit?: RateLimitOptions,
  requestOverrides: Partial<Request> = {}
): ExecutionContext => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(rateLimit),
  } as unknown as Reflector;

  const request = {
    method: 'GET',
    url: '/test',
    route: { path: '/test' },
    headers: {},
    ...requestOverrides,
  } as any;

  const guard = new RateLimitGuard(reflector);

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({} as any),
    getClass: () => ({} as any),
    getArgByIndex: () => null,
    guard,
  } as any as ExecutionContext & { guard: RateLimitGuard };
};

describe('RateLimitGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows requests when no metadata is set', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as any;
    const guard = new RateLimitGuard(reflector);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => ({} as any),
      getClass: () => ({} as any),
    } as any;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(cacheServiceMock.get).not.toHaveBeenCalled();
  });

  it('sets initial counter on first request in window', async () => {
    const rateLimit: RateLimitOptions = { ttl: 60, limit: 2 };
    const context = createContext(rateLimit);
    cacheServiceMock.get.mockResolvedValue(null);

    const guard = (context as any).guard as RateLimitGuard;
    const allowed = await guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(cacheServiceMock.set).toHaveBeenCalledWith(
      'ratelimit:ip:unknown:GET:/test',
      1,
      { ttl: 60 }
    );
  });

  it('throws when request limit exceeded', async () => {
    const rateLimit: RateLimitOptions = { ttl: 30, limit: 1 };
    const context = createContext(rateLimit);
    cacheServiceMock.get.mockResolvedValue(2);
    cacheServiceMock.ttl.mockResolvedValue(12);

    const guard = (context as any).guard as RateLimitGuard;

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('uses user id as identifier when available', async () => {
    const rateLimit: RateLimitOptions = { ttl: 60, limit: 3 };
    const context = createContext(rateLimit, {
      user: { id: 'user-1' },
      method: 'POST',
      url: '/actions',
      route: { path: '/actions' },
    });
    cacheServiceMock.get.mockResolvedValue(0);

    const guard = (context as any).guard as RateLimitGuard;
    await guard.canActivate(context);

    expect(rateLimitKeyMock).toHaveBeenCalledWith('user:user-1', 'POST:/actions');
    expect(cacheServiceMock.increment).toHaveBeenCalledWith(
      'ratelimit:user:user-1:POST:/actions'
    );
  });
});
