import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const fallbackSupabaseUrl = 'https://auilmosognuitlpoqchn.supabase.co';
const fallbackSupabasePublishableKey = 'sb_publishable_tk45nARRDwS9I4iLJ-8KbA_iqq_avnG';

export const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || fallbackSupabaseUrl;

export const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  fallbackSupabasePublishableKey;

try {
  new URL(supabaseUrl);
} catch {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL must be a valid URL.');
}

if (!supabasePublishableKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    lock: processLock,
    persistSession: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'bloom-react-native',
    },
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
