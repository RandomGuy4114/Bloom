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
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function withCors(response: Response) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(corsHeaders)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const joinSubcommunity = withSupabase(
  { auth: "user" },
  async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let payload: { subcommunity_id?: unknown };

    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const subcommunityId =
      typeof payload.subcommunity_id === "string"
        ? payload.subcommunity_id.trim()
        : typeof payload.subcommunity_id === "number" &&
            Number.isSafeInteger(payload.subcommunity_id)
          ? String(payload.subcommunity_id)
          : "";
    const claims = ctx.userClaims as
      | { id?: string; sub?: string }
      | undefined;
    const userId = claims?.sub ?? claims?.id;

    const isInt8 =
      /^[1-9]\d*$/.test(subcommunityId) &&
      BigInt(subcommunityId) <= 9223372036854775807n;

    if (!isInt8) {
      return json({ error: "A valid subcommunity_id must be provided" }, 400);
    }

    if (!userId) {
      return json({ error: "Unable to identify authenticated user" }, 401);
    }

    const { data: subcommunity, error: subcommunityError } =
      await ctx.supabaseAdmin
        .from("sub_communities")
        .select("id, community_parent_uid, members")
        .eq("id", subcommunityId)
        .maybeSingle();

    if (subcommunityError) {
      console.error("Failed to retrieve sub-community:", subcommunityError);
      return json({ error: "Unable to retrieve sub-community" }, 500);
    }

    if (!subcommunity) {
      return json({ error: "Sub-community not found" }, 404);
    }

    const { data: parentMembership, error: membershipError } =
      await ctx.supabaseAdmin
        .from("Communities")
        .select("id")
        .eq("id", subcommunity.community_parent_uid)
        .contains("members", [userId])
        .maybeSingle();

    if (membershipError) {
      console.error(
        "Failed to verify parent-community membership:",
        membershipError,
      );
      return json(
        { error: "Unable to verify parent-community membership" },
        500,
      );
    }

    if (!parentMembership) {
      return json(
        {
          error:
            "You must join the parent community before joining this sub-community",
        },
        403,
      );
    }

    const currentMembers = Array.isArray(subcommunity.members)
      ? subcommunity.members
      : [];

    if (currentMembers.includes(userId)) {
      return json({
        success: true,
        already_member: true,
        message: "You are already a member of this sub-community",
      });
    }

    const { data: updatedSubcommunity, error: updateError } =
      await ctx.supabaseAdmin
        .from("sub_communities")
        .update({ members: [...currentMembers, userId] })
        .eq("id", subcommunityId)
        .select("id, title, community_parent_uid")
        .single();

    if (updateError) {
      console.error("Failed to join sub-community:", updateError);
      return json({ error: "Unable to join sub-community" }, 500);
    }

    return json({
      success: true,
      already_member: false,
      message: "Successfully joined the sub-community",
      data: updatedSubcommunity,
    });
  },
);

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      return withCors(await joinSubcommunity(req));
    } catch (error) {
      console.error("Unhandled join-subcommunity error:", error);
      return json({ error: "Unable to join sub-community" }, 500);
    }
  },
};
