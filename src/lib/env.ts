import Constants from 'expo-constants';

type ExpoExtra = {
  expoPublicSupabaseUrl?: string;
  expoPublicSupabaseAnonKey?: string;
  expoPublicSupabaseImportFunctionUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.expoPublicSupabaseUrl ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.expoPublicSupabaseAnonKey ?? '',
  supabaseImportFunctionUrl:
    process.env.EXPO_PUBLIC_SUPABASE_IMPORT_FUNCTION_URL ?? extra.expoPublicSupabaseImportFunctionUrl ?? '',
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasRemoteImportFunction() {
  return Boolean(env.supabaseImportFunctionUrl);
}
