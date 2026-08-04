import { supabase } from '@/lib/supabase';

export type PublicProfile = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string | null;
  id: string;
  supporter: boolean | null;
  username: string | null;
};

export function resolveAvatarUrl(value: string | null | undefined) {
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

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .rpc('get_public_profile', { target_user: userId })
    .maybeSingle();

  if (error) {
    console.warn(`Unable to load public profile for ${userId}:`, error.message);
    return null;
  }

  return data as PublicProfile | null;
}

export async function getJoinedCommunityIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('joined_communities')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return (data?.joined_communities ?? []) as string[];
}

export async function moderateUsername(username: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('moderate-username', { body: { username } });
  if (error) throw new Error(error.message || 'Username could not be checked.');
  return (data as { approved?: boolean } | null)?.approved === true;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', { requested_username: username });
  if (error) throw error;
  return data === true;
}

export async function updateProfile(input: { bio: string; displayName: string; username: string }) {
  const { data, error } = await supabase.functions.invoke('update-profile', {
    body: { bio: input.bio, displayName: input.displayName, username: input.username },
  });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'Your profile could not be updated.';
    throw new Error(message);
  }
  return (data as { profile?: PublicProfile } | null)?.profile ?? null;
}

export async function uploadAvatar(file: { name: string; type: string; uri: string }): Promise<string> {
  const form = new FormData();
  form.append('avatar', {
    name: file.name,
    type: file.type,
    uri: file.uri,
  } as unknown as Blob);

  const { data, error } = await supabase.functions.invoke('upload-avatar', { body: form });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'Your photo could not be uploaded.';
    throw new Error(message);
  }
  const avatarUrl = (data as { avatarUrl?: string } | null)?.avatarUrl;
  if (!avatarUrl) throw new Error('Your photo could not be uploaded.');
  return avatarUrl;
}

export type BlockStatus = { blocked: boolean; interactionBlocked: boolean };

async function callBlockUser(action: 'block' | 'status' | 'unblock', targetUser: string): Promise<BlockStatus> {
  const { data, error } = await supabase.functions.invoke('block-user', {
    body: { action, target_user: targetUser },
  });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'This action could not be completed.';
    throw new Error(message);
  }
  const result = data as { blocked?: boolean; interaction_blocked?: boolean } | null;
  return { blocked: result?.blocked === true, interactionBlocked: result?.interaction_blocked === true };
}

export function getBlockStatus(targetUser: string) {
  return callBlockUser('status', targetUser);
}

export function blockUser(targetUser: string) {
  return callBlockUser('block', targetUser);
}

export function unblockUser(targetUser: string) {
  return callBlockUser('unblock', targetUser);
}

export async function extractFunctionErrorMessage(error: { context?: unknown; message?: string }): Promise<string | null> {
  const context = error.context as Response | undefined;
  if (!context || typeof context.json !== 'function') return error.message ?? null;
  try {
    const response = await context.json() as { error?: string };
    return response.error ?? error.message ?? null;
  } catch {
    return error.message ?? null;
  }
}
