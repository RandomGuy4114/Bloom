import { supabase } from '@/lib/supabase';
import { extractFunctionErrorMessage } from '@/lib/profiles';

export type CommunityRow = {
  banner_url: string | null;
  business: boolean | null;
  description: string | null;
  global: boolean | null;
  id: string;
  latitude: number | null;
  location_label: string | null;
  longitude: number | null;
  members: string[] | null;
  name: string;
  picture_url: string | null;
  private: boolean | null;
  radius_meters: number | null;
  user_id: string;
};

export type JoinStatus = 'already_joined' | 'already_requested' | 'joined' | 'out_of_range' | 'private_requested';
export type LeaveStatus = 'left' | 'not_joined' | 'owner_cannot_leave';

export function isWithinCommunityRadius(
  community: Pick<CommunityRow, 'global' | 'latitude' | 'longitude' | 'radius_meters'>,
  userLocation: { latitude: number; longitude: number } | null,
) {
  if (community.global) return true;
  if (!userLocation || community.latitude == null || community.longitude == null) return false;
  const radius = community.radius_meters ?? 0;
  const distance = haversineMeters(userLocation, { latitude: community.latitude, longitude: community.longitude });
  return distance <= radius;
}

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadiusMeters = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

export async function listCommunities(): Promise<CommunityRow[]> {
  const { data, error } = await supabase
    .from('Communities')
    .select('id, name, description, user_id, banner_url, picture_url, members, global, latitude, longitude, radius_meters, location_label, business, private');
  if (error) throw error;
  return (data ?? []) as CommunityRow[];
}

export async function getCommunity(communityId: string): Promise<CommunityRow> {
  const { data, error } = await supabase
    .from('Communities')
    .select('id, name, description, user_id, banner_url, picture_url, members, global, business, private, location_label, latitude, longitude, radius_meters')
    .eq('id', communityId)
    .single();
  if (error) throw error;
  return data as CommunityRow;
}

export async function joinCommunity(communityId: string, userLocation: { latitude: number; longitude: number } | null): Promise<JoinStatus> {
  const { data, error } = await supabase.rpc('join_community', {
    target_community: communityId,
    user_latitude: userLocation?.latitude ?? null,
    user_longitude: userLocation?.longitude ?? null,
  });
  if (error) throw error;
  return data as JoinStatus;
}

export async function leaveCommunity(communityId: string): Promise<LeaveStatus> {
  const { data, error } = await supabase.rpc('leave_community', { target_community: communityId });
  if (error) throw error;
  return data as LeaveStatus;
}

export async function createCommunity(input: {
  description: string;
  isPrivate: boolean;
  location: { latitude: number; longitude: number };
  name: string;
  pictureUrl: string | null;
  radiusMeters: number;
  userId: string;
}) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from('Communities').insert({
    id,
    name: input.name,
    description: input.description,
    picture_url: input.pictureUrl,
    user_id: input.userId,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    radius_meters: input.radiusMeters,
    members: [input.userId],
    private: input.isPrivate,
  });
  if (error) throw error;
  return id;
}

export async function updateCommunityInfo(communityId: string, userId: string, input: { description: string; name: string }) {
  const { error } = await supabase
    .from('Communities')
    .update({ name: input.name, description: input.description })
    .eq('id', communityId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setCommunityPicture(communityId: string, pictureUrl: string | null) {
  const { error } = await supabase.rpc('set_community_picture', { target_community: communityId, new_picture_url: pictureUrl });
  if (error) throw error;
}

export async function uploadCommunityBanner(communityId: string, file: { name: string; type: string; uri: string } | null) {
  const form = new FormData();
  form.append('communityId', communityId);
  if (file) {
    form.append('banner', { name: file.name, type: file.type, uri: file.uri } as unknown as Blob);
  } else {
    form.append('action', 'remove');
  }
  const { data, error } = await supabase.functions.invoke('upload-community-banner', { body: form });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'The banner could not be updated.';
    throw new Error(message);
  }
  return (data as { bannerUrl?: string | null } | null)?.bannerUrl ?? null;
}

export async function deleteCommunity(communityId: string) {
  const { data, error } = await supabase.functions.invoke('delete-community', { body: { communityId } });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'This community could not be deleted.';
    throw new Error(message);
  }
  return (data as { deleted?: boolean } | null)?.deleted === true;
}

export async function setCommunityPrivacy(communityId: string, makePrivate: boolean): Promise<boolean> {
  const { data, error } = await supabase.rpc('set_community_privacy', { target_community: communityId, make_private: makePrivate });
  if (error) throw error;
  return data === true;
}

export async function getPendingJoinRequests(communityId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_owned_community_request_uuids', { target_community: communityId });
  if (error) throw error;
  return (data ?? []) as string[];
}

export type JoinRequestResponse = 'approved' | 'denied' | 'request_not_found';

export async function respondToJoinRequest(communityId: string, requesterId: string, approve: boolean): Promise<JoinRequestResponse> {
  const { data, error } = await supabase.rpc('respond_to_community_join_request', {
    target_community: communityId,
    requester_id: requesterId,
    approve_request: approve,
  });
  if (error) throw error;
  return data as JoinRequestResponse;
}

// --- Sub-communities ---

export type SubCommunitySummary = {
  can_manage: boolean;
  created_at: string;
  description: string | null;
  id: number;
  is_member: boolean;
  is_owner: boolean;
  owner_id: string;
  title: string;
};

export type SubCommunityListResponse = {
  canCreate: boolean;
  isParentOwner: boolean;
  subCommunities: SubCommunitySummary[];
};

export async function listSubCommunities(parentCommunityId: string): Promise<SubCommunityListResponse> {
  const { data, error } = await supabase.functions.invoke('get-subcomms', {
    body: { subcomms_parent: parentCommunityId },
  });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'Sub-communities could not be loaded.';
    throw new Error(message);
  }
  const result = data as { can_create?: boolean; data?: SubCommunitySummary[]; is_parent_owner?: boolean } | null;
  return {
    subCommunities: result?.data ?? [],
    canCreate: result?.can_create === true,
    isParentOwner: result?.is_parent_owner === true,
  };
}

export async function joinSubCommunity(subCommunityId: number | string) {
  const { data, error } = await supabase.functions.invoke('join-subcommunity', {
    body: { subcommunity_id: subCommunityId },
  });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'This sub-community could not be joined.';
    throw new Error(message);
  }
  return data as { already_member?: boolean; message?: string; success?: boolean };
}

export async function createSubCommunity(parentCommunityId: string, title: string, description: string): Promise<number> {
  const { data, error } = await supabase.rpc('create_subcommunity', {
    parent_community: parentCommunityId,
    subcommunity_title: title,
    subcommunity_description: description,
  });
  if (error) throw error;
  return data as number;
}

export type SubCommunityRow = {
  community_parent_uid: string;
  description: string | null;
  id: number;
  members: string[];
  owner_id: string;
  title: string;
};

export async function getSubCommunity(subCommunityId: number | string): Promise<SubCommunityRow> {
  const { data, error } = await supabase
    .from('sub_communities')
    .select('id, title, description, community_parent_uid, owner_id, members')
    .eq('id', subCommunityId)
    .single();
  if (error) throw error;
  return data as SubCommunityRow;
}

export async function isSubCommunityManager(subCommunityId: number | string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_subcommunity_manager', { target_subcommunity: subCommunityId });
  if (error) throw error;
  return data === true;
}

export async function updateSubCommunity(subCommunityId: number | string, title: string, description: string) {
  const { error } = await supabase.rpc('update_subcommunity', {
    target_subcommunity: subCommunityId,
    subcommunity_title: title,
    subcommunity_description: description,
  });
  if (error) throw error;
}

export async function deleteSubCommunity(subCommunityId: number | string) {
  const { error } = await supabase.rpc('delete_subcommunity', { target_subcommunity: subCommunityId });
  if (error) throw error;
}
