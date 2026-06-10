import { NativeModules, Platform } from 'react-native';

type KitchenShelfPendingShareModule = {
  consumePendingShare?: () => Promise<string | null>;
};

export async function consumeNativePendingShare(): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  const module = NativeModules.KitchenShelfPendingShare as KitchenShelfPendingShareModule | undefined;
  const pendingShare = await module?.consumePendingShare?.().catch(() => null);
  const trimmedShare = pendingShare?.trim();

  return trimmedShare ? trimmedShare : null;
}
