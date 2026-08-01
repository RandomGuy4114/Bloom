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

const blockUser = withSupabase(
  { auth: "user" },
  async (req, ctx) => {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    let payload: { action?: unknown; target_user?: unknown };

    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON payload" }, 400);
    }

    const action =
      typeof payload.action === "string" ? payload.action.trim() : "";
    const targetUser =
      typeof payload.target_user === "string"
        ? payload.target_user.trim()
        : "";
    const claims = ctx.userClaims as
      | { id?: string; sub?: string }
      | undefined;
    const userId = claims?.sub ?? claims?.id;
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!userId) {
      return json({ error: "Unable to identify authenticated user" }, 401);
    }

    if (!uuidPattern.test(targetUser) || targetUser === userId) {
      return json({ error: "A valid target_user must be provided" }, 400);
    }

    if (!new Set(["status", "block", "unblock"]).has(action)) {
      return json({ error: "Invalid action" }, 400);
    }

    const { data: targetExists, error: targetError } =
      await ctx.supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", targetUser)
        .maybeSingle();

    if (targetError) {
      console.error("Unable to validate block target:", targetError);
      return json({ error: "Unable to validate user" }, 500);
    }

    if (!targetExists) {
      return json({ error: "User not found" }, 404);
    }

    if (action === "block") {
      const { error } = await ctx.supabaseAdmin
        .from("user_blocks")
        .upsert(
          { blocker_id: userId, blocked_id: targetUser },
          { onConflict: "blocker_id,blocked_id" },
        );

      if (error) {
        console.error("Unable to block user:", error);
        return json({ error: "Unable to block user" }, 500);
      }

      const firstUser = userId < targetUser ? userId : targetUser;
      const secondUser = userId < targetUser ? targetUser : userId;
      const { error: encounterError } = await ctx.supabaseAdmin
        .from("connect_encounters")
        .delete()
        .eq("first_user_id", firstUser)
        .eq("second_user_id", secondUser);

      if (encounterError) {
        console.error(
          "Blocked user but could not remove Connect encounter:",
          encounterError,
        );
      }
    }

    if (action === "unblock") {
      const { error } = await ctx.supabaseAdmin
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", targetUser);

      if (error) {
        console.error("Unable to unblock user:", error);
        return json({ error: "Unable to unblock user" }, 500);
      }
    }

    const [{ data: outgoing }, { data: eitherDirection }] = await Promise.all([
      ctx.supabaseAdmin
        .from("user_blocks")
        .select("blocker_id")
        .eq("blocker_id", userId)
        .eq("blocked_id", targetUser)
        .maybeSingle(),
      ctx.supabaseAdmin
        .from("user_blocks")
        .select("blocker_id")
        .or(
          `and(blocker_id.eq.${userId},blocked_id.eq.${targetUser}),and(blocker_id.eq.${targetUser},blocked_id.eq.${userId})`,
        )
        .limit(1)
        .maybeSingle(),
    ]);

    return json({
      blocked: Boolean(outgoing),
      interaction_blocked: Boolean(eitherDirection),
    });
  },
);

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      return withCors(await blockUser(req));
    } catch (error) {
      console.error("Unhandled block-user error:", error);
      return json({ error: "Unable to update block status" }, 500);
    }
  },
};
