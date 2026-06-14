jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: () => '' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { apiUrl: '' } } },
}));

jest.mock('react-native-ssl-pinning', () => ({
  fetch: jest.fn(),
}));

jest.mock('../src/security/safeLog', () => ({
  safeLog: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

import { ApiError, NetworkError, ParseError } from '../src/services/api/errors';

describe('ApiError', () => {
  it('creates an ApiError with message, statusCode, and code', () => {
    const err = new ApiError('Not found', 404, 'NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('ApiError');
  });

  it('creates an ApiError without optional code', () => {
    const err = new ApiError('Server error', 500);
    expect(err.statusCode).toBe(500);
    expect(err.code).toBeUndefined();
  });
});

describe('NetworkError', () => {
  it('creates a NetworkError with default message', () => {
    const err = new NetworkError();
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Network connection failed');
    expect(err.name).toBe('NetworkError');
  });

  it('creates a NetworkError with custom message', () => {
    const err = new NetworkError('Timeout');
    expect(err.message).toBe('Timeout');
  });
});

describe('ParseError', () => {
  it('creates a ParseError with raw snippet', () => {
    const err = new ParseError('<html>...</html>');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Failed to parse server response');
    expect(err.rawSnippet).toBe('<html>...</html>');
    expect(err.name).toBe('ParseError');
  });
});

describe('API endpoint patterns', () => {
  it('auth API methods have expected endpoint patterns', () => {
    const { authApi } = require('../src/services/api/index');
    expect(typeof authApi.register).toBe('function');
    expect(typeof authApi.login).toBe('function');
    expect(typeof authApi.logout).toBe('function');
    expect(typeof authApi.me).toBe('function');
  });

  it('orders API methods have expected endpoint patterns', () => {
    const { ordersApi } = require('../src/services/api/index');
    expect(typeof ordersApi.list).toBe('function');
    expect(typeof ordersApi.create).toBe('function');
    expect(typeof ordersApi.cancel).toBe('function');
    expect(typeof ordersApi.refund).toBe('function');
  });

  it('reservations API methods have expected endpoint patterns', () => {
    const { reservationsApi } = require('../src/services/api/index');
    expect(typeof reservationsApi.list).toBe('function');
    expect(typeof reservationsApi.create).toBe('function');
    expect(typeof reservationsApi.cancel).toBe('function');
    expect(typeof reservationsApi.updatePreOrder).toBe('function');
  });

  it('cafes API methods have expected endpoint patterns', () => {
    const { cafesApi } = require('../src/services/api/index');
    expect(typeof cafesApi.list).toBe('function');
    expect(typeof cafesApi.getById).toBe('function');
    expect(typeof cafesApi.getMenu).toBe('function');
    expect(typeof cafesApi.getTables).toBe('function');
  });
});
