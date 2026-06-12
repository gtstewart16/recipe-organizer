import AsyncStorage from '@react-native-async-storage/async-storage';

import { AUTH_SESSION_KEY, clearAuthSession, loadAuthSession, persistAuthSession } from './auth-session';

describe('auth session helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loadAuthSession returns false when no signed-in session exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await expect(loadAuthSession()).resolves.toBe(false);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  });

  it('loadAuthSession returns true when the persisted signed-in session flag is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');

    await expect(loadAuthSession()).resolves.toBe(true);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  });

  it.each(['legacy-session-value', 'false'])(
    'loadAuthSession returns false when a corrupt signed-in session flag %s is stored',
    async (storedValue) => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(storedValue);

      await expect(loadAuthSession()).resolves.toBe(false);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
    },
  );

  it('loadAuthSession returns false when AsyncStorage throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(loadAuthSession()).resolves.toBe(false);
  });

  it('persistAuthSession stores the signed-in session flag using the auth session key', async () => {
    await persistAuthSession();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(AUTH_SESSION_KEY, 'true');
  });

  it('clearAuthSession clears the signed-in session flag using the auth session key', async () => {
    await clearAuthSession();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  });
});
