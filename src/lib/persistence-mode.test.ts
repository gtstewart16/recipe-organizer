import { resolvePersistenceMode } from './persistence-mode';

describe('resolvePersistenceMode', () => {
  it('rejects a release build that has no Supabase configuration', () => {
    expect(
      resolvePersistenceMode({
        hasCloudConfig: false,
        isDevelopment: false,
        isTest: false,
      })
    ).toBe('configuration_error');
  });

  it('uses cloud persistence whenever Supabase is configured', () => {
    expect(
      resolvePersistenceMode({
        hasCloudConfig: true,
        isDevelopment: false,
        isTest: false,
      })
    ).toBe('cloud');
  });

  it.each([
    { isDevelopment: true, isTest: false },
    { isDevelopment: false, isTest: true },
  ])('allows local persistence for development and tests', ({ isDevelopment, isTest }) => {
    expect(resolvePersistenceMode({ hasCloudConfig: false, isDevelopment, isTest })).toBe('local');
  });
});
