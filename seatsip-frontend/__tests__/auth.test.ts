jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: () => '' },
}));

describe('Auth token storage (web platform)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('migrates legacy AsyncStorage tokens on first load', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({ accessToken: 'legacy-token', refreshToken: 'legacy-refresh' }),
    );
    const { loadTokens } = require('../src/security/secureStorage');
    const loaded = await loadTokens();
    expect(loaded).toEqual({ accessToken: 'legacy-token', refreshToken: 'legacy-refresh' });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@seatsip:tokens');
  });

  it('saveTokens stores accessToken and refreshToken in memory', async () => {
    const { saveTokens, loadTokens } = require('../src/security/secureStorage');
    await saveTokens({ accessToken: 'abc123', refreshToken: 'ref456' });
    const loaded = await loadTokens();
    expect(loaded).toEqual({ accessToken: 'abc123', refreshToken: 'ref456' });
  });

  it('saveTokens stores accessToken without refreshToken', async () => {
    const { saveTokens, loadTokens } = require('../src/security/secureStorage');
    await saveTokens({ accessToken: 'token-only' });
    const loaded = await loadTokens();
    expect(loaded).toEqual({ accessToken: 'token-only' });
  });

  it('clearTokens clears stored tokens', async () => {
    const { saveTokens, loadTokens, clearTokens } = require('../src/security/secureStorage');
    await saveTokens({ accessToken: 'abc', refreshToken: 'ref' });
    await clearTokens();
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });

  it('loadTokens returns null when no tokens stored', async () => {
    const { loadTokens } = require('../src/security/secureStorage');
    const loaded = await loadTokens();
    expect(loaded).toBeNull();
  });
});
