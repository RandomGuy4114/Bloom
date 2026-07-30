import { withSupabase } from "npm:@supabase/server@^1";

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function withCors(response: Response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([name, value]) =>
    headers.set(name, value)
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const getSubcommunities = withSupabase(
  { auth: "user" },
  async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let payload: { subcomms_parent?: unknown };

    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const parentCommunityId =
      typeof payload.subcomms_parent === "string"
        ? payload.subcomms_parent.trim()
        : "";
    const claims = ctx.userClaims as
      | { id?: string; sub?: string }
      | undefined;
    const userId = claims?.sub ?? claims?.id;

    if (!parentCommunityId) {
      return json({ error: "subcomms_parent must be provided" }, 400);
    }

    if (!userId) {
      return json({ error: "Unable to identify authenticated user" }, 401);
    }

    const { data: parent, error: parentError } = await ctx.supabaseAdmin
      .from("Communities")
      .select("id, user_id, members")
      .eq("id", parentCommunityId)
      .maybeSingle();

    if (parentError) {
      console.error("Community membership check failed:", parentError);
      return json({ error: "Unable to verify community membership" }, 500);
    }

    const parentMembers = Array.isArray(parent?.members) ? parent.members : [];
    const isParentOwner = parent?.user_id === userId;

    if (!parent || (!isParentOwner && !parentMembers.includes(userId))) {
      return json({ error: "You are not a member of this community" }, 403);
    }

    const { data, error } = await ctx.supabaseAdmin
      .from("sub_communities")
      .select(
        "id, title, created_at, description, owner_id, members",
      )
      .eq("community_parent_uid", parentCommunityId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Sub-community query failed:", error);
      return json({ error: "Unable to fetch sub-communities" }, 500);
    }

    const records = (data ?? []).map((subcommunity) => ({
      id: String(subcommunity.id),
      title: subcommunity.title,
      created_at: subcommunity.created_at,
      description: subcommunity.description,
      is_member:
        Array.isArray(subcommunity.members) &&
        subcommunity.members.includes(userId),
      can_manage: isParentOwner || subcommunity.owner_id === userId,
      is_owner: subcommunity.owner_id === userId,
    }));

    return json({
      data: records,
      can_create:
        isParentOwner ||
        !data?.some((subcommunity) => subcommunity.owner_id === userId),
      is_parent_owner: isParentOwner,
    });
  },
);

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      return withCors(await getSubcommunities(req));
    } catch (error) {
      console.error("Unhandled get-subcomms error:", error);
      return json({ error: "Unable to fetch sub-communities" }, 500);
    }
  },
};
