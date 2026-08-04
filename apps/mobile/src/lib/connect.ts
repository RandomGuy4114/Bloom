import { supabase } from '@/lib/supabase';

export type ConnectEncounter = {
  avatar_url: string | null;
  connected_at: string;
  display_name: string | null;
  supporter: boolean;
  user_id: string;
  username: string | null;
};

export type ConnectSummary = {
  enabled: boolean;
  encounters: ConnectEncounter[];
};

export function resolveProfilePicture(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    const storagePath = candidate.replace(/^\/+/, '').replace(/^Profile Pictures\//i, '');
    if (!storagePath || storagePath.includes('..')) return null;
    return supabase.storage.from('Profile Pictures').getPublicUrl(storagePath).data.publicUrl;
  }
}

export async function getConnectSummary(): Promise<ConnectSummary> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('You must be logged in to use Connect.');

  const [profileResult, encountersResult] = await Promise.all([
    supabase.from('profiles').select('connect_enabled').eq('id', user.id).single(),
    supabase.rpc('get_connect_encounters'),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (encountersResult.error) throw encountersResult.error;

  return {
    enabled: profileResult.data.connect_enabled === true,
    encounters: (encountersResult.data ?? []) as ConnectEncounter[],
  };
}

export async function setConnectEnabled(enabled: boolean) {
  const { data, error } = await supabase.rpc('set_connect_enabled', { enabled });
  if (error) throw error;
  return data === true;
}
