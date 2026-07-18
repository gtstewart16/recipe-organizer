export type PersistenceMode = 'cloud' | 'local' | 'configuration_error';

type PersistenceModeInput = {
  readonly hasCloudConfig: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
};

export function resolvePersistenceMode({
  hasCloudConfig,
  isDevelopment,
  isTest,
}: PersistenceModeInput): PersistenceMode {
  if (hasCloudConfig) {
    return 'cloud';
  }

  return isDevelopment || isTest ? 'local' : 'configuration_error';
}
