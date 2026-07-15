import { createClient } from "npm:@supabase/supabase-js@2";
import { moderateImage, moderateText, moderationResponse } from "../_shared/sightengine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validLocation(value: string) {
  const parts = value.split(",").map(Number);
  return parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])
    && parts[0] >= -90 && parts[0] <= 90 && parts[1] >= -180 && parts[1] <= 180;
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Unauthorized." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized." }, 401);

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const communityId = String(form.get("community") ?? "");
  const postType = String(form.get("postType") ?? "post").toLowerCase();
  const location = String(form.get("location") ?? "").trim();
  const date = String(form.get("date") ?? "").trim();
  const images = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (!title || title.length > 200 || !body || body.length > 10000) return json({ error: "Invalid post content." }, 400);
  if (!new Set(["post", "activity", "event"]).has(postType)) return json({ error: "Invalid post type." }, 400);
  if ((postType === "event") !== validLocation(location)) return json({ error: "Invalid event location." }, 400);
  if ((postType === "event") !== validDate(date)) return json({ error: "Invalid event date." }, 400);

  const [{ data: profile }, { data: community, error: communityError }] = await Promise.all([
    userClient.from("profiles").select("supporter, joined_communities").eq("id", user.id).single(),
    userClient.from("Communities").select("id, global").eq("id", communityId).single(),
  ]);
  if (communityError || !community || !profile?.joined_communities?.includes(community.id)) {
    return json({ error: "You cannot post to this community." }, 403);
  }
  if (community.global && user.app_metadata?.role !== "admin") return json({ error: "Administrator access required." }, 403);

  const isSupporter = profile.supporter === true;
  const imageLimit = isSupporter ? 5 : 1;
  const sizeLimit = isSupporter ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
  if (images.length > imageLimit) return json({ error: "Too many images." }, 400);
  if (images.some((file) => !allowedImageTypes.has(file.type) || file.size > sizeLimit)) {
    return json({ error: "An image is invalid or too large." }, 400);
  }

  try {
    await moderateText(`${title}\n${body}`);
    await Promise.all(images.map(moderateImage));
  } catch (error) {
    const response = moderationResponse(error);
    return json(response, response.code === "CONTENT_REJECTED" ? 422 : 503);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const uploadedPaths: string[] = [];
  const imageUrls: string[] = [];
  for (const image of images) {
    const extension = imageExtensions[image.type];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await adminClient.storage.from("Post Images").upload(path, image, {
      cacheControl: "3600",
      contentType: image.type,
    });
    if (error) {
      if (uploadedPaths.length) await adminClient.storage.from("Post Images").remove(uploadedPaths);
      console.error("Post image upload failed:", error.message);
      return json({ error: "Image upload failed." }, 500);
    }
    uploadedPaths.push(path);
    imageUrls.push(adminClient.storage.from("Post Images").getPublicUrl(path).data.publicUrl);
  }

  const { data: post, error: insertError } = await adminClient.from("Posts").insert({
    title,
    body,
    user_id: user.id,
    community: communityId,
    post_type: postType,
    location: postType === "event" ? location : null,
    date: postType === "event" ? date : null,
    img_link: imageUrls[0] ?? null,
    img_links: imageUrls,
  }).select("id").single();
  if (insertError) {
    if (uploadedPaths.length) await adminClient.storage.from("Post Images").remove(uploadedPaths);
    console.error("Post creation failed:", insertError.message);
    return json({ error: "Post creation failed." }, 500);
  }

  return json({ postId: post.id }, 201);
});
