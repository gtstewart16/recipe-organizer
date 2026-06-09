import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_SESSION_KEY = 'recipe-organizer-auth-session-v1';

const AUTH_SESSION_VALUE = 'true';

export async function loadAuthSession(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(AUTH_SESSION_KEY);

    return value !== null;
  } catch {
    return false;
  }
}

export async function persistAuthSession(): Promise<void> {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, AUTH_SESSION_VALUE);
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}
