import type { MobilePost, PostKind } from '@/components/post';
import { supabase } from '@/lib/supabase';
import { extractFunctionErrorMessage, getPublicProfile, resolveAvatarUrl, type PublicProfile } from '@/lib/profiles';

export type PostRow = {
  body: string | null;
  community: string | null;
  created_at: string | null;
  date: string | null;
  id: string;
  img_link: string | null;
  img_links: string[] | null;
  location: string | null;
  post_type: string | null;
  subcommunity: number | string | null;
  title: string | null;
  user_id: string;
};

export type ReplyRow = {
  body: string;
  created_at: string;
  id: string;
  post_id: string;
  user_id: string;
};

export async function fetchPost(postId: string): Promise<PostRow> {
  const { data, error } = await supabase.rpc('get_visible_posts', { post_id: postId }).single();
  if (error) throw error;
  return data as PostRow;
}

export async function updatePost(postId: string, input: { body: string; title: string }) {
  const { data, error } = await supabase.functions.invoke('update-post', {
    body: { postId, title: input.title, body: input.body },
  });
  if (error) {
    const message = await extractFunctionErrorMessage(error) ?? 'This post could not be updated.';
    throw new Error(message);
  }
  return (data as { post?: PostRow } | null)?.post ?? null;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from('Posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function getLikeCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  if (error) throw error;
  return count ?? 0;
}

export async function isLikedByUser(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean) {
  const query = supabase.from('post_likes');
  const { error } = currentlyLiked
    ? await query.delete().eq('post_id', postId).eq('user_id', userId)
    : await query.insert({ post_id: postId, user_id: userId });
  if (error && error.code !== '23505') throw error;
  const liked = error?.code === '23505' ? true : !currentlyLiked;
  const count = await getLikeCount(postId);
  return { liked, count };
}

export async function listReplies(postId: string): Promise<ReplyRow[]> {
  const { data, error } = await supabase
    .from('post_replies')
    .select('id, user_id, body, created_at, post_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReplyRow[];
}

export async function createReply(postId: string, userId: string, body: string): Promise<ReplyRow> {
  const trimmed = body.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    throw new Error('Replies must be between 1 and 2000 characters.');
  }
  const { data, error } = await supabase
    .from('post_replies')
    .insert({ post_id: postId, user_id: userId, body: trimmed })
    .select('id, user_id, body, created_at, post_id')
    .single();
  if (error) throw error;
  return data as ReplyRow;
}

export async function reportPost(postId: string, reporterId: string) {
  const { error } = await supabase.from('PostReports').insert([{ post_id: postId, reporter_id: reporterId }]);
  if (error && error.code !== '23505') throw error;
  return error?.code === '23505' ? 'already-reported' as const : 'reported' as const;
}

/** Enriches raw `Posts` rows with author profile, community name, and like/reply engagement — the same
 * lookups the home feed needs, reused by Profile/Activity/Community feeds so it isn't duplicated per screen. */
export async function hydratePosts(rows: PostRow[], viewerId: string): Promise<MobilePost[]> {
  const authorIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  const communityIds = [...new Set(rows.map((row) => row.community).filter((id): id is string => Boolean(id)))];
  const postIds = rows.map((row) => row.id);

  const [profileEntries, communitiesResult, likesResult, repliesResult] = await Promise.all([
    Promise.all(authorIds.map(async (authorId) => [authorId, await getPublicProfile(authorId)] as const)),
    communityIds.length
      ? supabase.from('Communities').select('id, name').in('id', communityIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    postIds.length
      ? supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null }),
    postIds.length
      ? supabase.from('post_replies').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profiles = new Map(profileEntries.filter((entry): entry is readonly [string, PublicProfile] => entry[1] !== null));
  const communities = new Map((communitiesResult.data ?? []).map((community) => [String(community.id), community.name]));
  const likeCounts = new Map<string, number>();
  const replyCounts = new Map<string, number>();
  const viewerLikes = new Set<string>();

  (likesResult.data ?? []).forEach((like: { post_id: string | number; user_id: string }) => {
    const id = String(like.post_id);
    likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
    if (like.user_id === viewerId) viewerLikes.add(id);
  });
  (repliesResult.data ?? []).forEach((reply: { post_id: string | number }) => {
    const id = String(reply.post_id);
    replyCounts.set(id, (replyCounts.get(id) ?? 0) + 1);
  });

  return rows.map((row) => {
    const id = String(row.id);
    const profile = profiles.get(row.user_id);
    const kind: PostKind = row.post_type === 'activity' || row.post_type === 'event' ? row.post_type : 'post';
    const imageUrls = [...(Array.isArray(row.img_links) ? row.img_links : []), row.img_link].filter((url): url is string => typeof url === 'string' && Boolean(url));
    return {
      id,
      type: kind,
      title: row.title,
      body: row.body,
      location: row.location,
      imageUrls,
      createdAt: row.created_at,
      communityName: row.community ? communities.get(row.community) ?? null : null,
      likeCount: likeCounts.get(id) ?? 0,
      likedByViewer: viewerLikes.has(id),
      replyCount: replyCounts.get(id) ?? 0,
      author: {
        id: row.user_id,
        name: profile?.display_name || profile?.username || 'Bloom user',
        avatarUrl: resolveAvatarUrl(profile?.avatar_url),
        supporter: profile?.supporter === true,
      },
    };
  });
}
