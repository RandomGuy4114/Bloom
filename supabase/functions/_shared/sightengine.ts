const textEndpoint = "https://api.sightengine.com/1.0/text/check.json";
const imageEndpoint = "https://api.sightengine.com/1.0/check.json";
const imageModels = "nudity-2.1,weapon,offensive-2.0,gore-2.0,violence";

export class ModerationError extends Error {
  constructor(message: string, readonly rejected = false) {
    super(message);
  }
}

function credentials() {
  const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
  const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
  if (!apiUser || !apiSecret) throw new ModerationError("Content moderation is not configured.");
  return { apiUser, apiSecret };
}

function hasMatches(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const matches = (value as Record<string, unknown>).matches;
  return Array.isArray(matches) && matches.length > 0;
}

function maximumScore(value: unknown): number {
  if (typeof value === "number" && value >= 0 && value <= 1) return value;
  if (!value || typeof value !== "object") return 0;
  return Math.max(0, ...Object.values(value as Record<string, unknown>).map(maximumScore));
}

async function sightengineRequest(endpoint: string, body: FormData) {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("Sightengine request failed:", error);
    throw new ModerationError("Content moderation is temporarily unavailable.");
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== "success") {
    console.error("Sightengine rejected the moderation request:", response.status, result?.error?.type);
    throw new ModerationError("Content moderation is temporarily unavailable.");
  }
  return result as Record<string, unknown>;
}

export async function moderateText(text: string, mode: "rules" | "username" = "rules") {
  if (!text.trim()) return;
  const { apiUser, apiSecret } = credentials();
  const body = new FormData();
  body.append("text", text);
  body.append("mode", mode);
  body.append("lang", "en,es");
  if (mode === "rules") {
    body.append("categories", "profanity,drug,weapon,violence,self-harm,extremism,spam");
  }
  body.append("api_user", apiUser);
  body.append("api_secret", apiSecret);
  const result = await sightengineRequest(textEndpoint, body);
  const categories = mode === "username"
    ? ["profanity", "personal", "link", "misleading"]
    : ["profanity", "drug", "weapon", "violence", "self-harm", "extremism", "spam"];
  if (categories.some((category) => hasMatches(result[category]))) {
    throw new ModerationError("Text was rejected by content moderation.", true);
  }
}

export async function moderateImage(file: File) {
  const { apiUser, apiSecret } = credentials();
  const body = new FormData();
  body.append("media", file, file.name || "upload");
  body.append("models", imageModels);
  body.append("api_user", apiUser);
  body.append("api_secret", apiSecret);
  const result = await sightengineRequest(imageEndpoint, body);
  const nudity = result.nudity as Record<string, unknown> | undefined;
  const weapon = result.weapon as Record<string, unknown> | undefined;
  const weaponClasses = weapon?.classes as Record<string, unknown> | undefined;
  const probability = (value: unknown) => typeof value === "number" ? value : 0;
  const explicitNudity = Math.max(
    maximumScore(nudity?.sexual_activity),
    maximumScore(nudity?.sexual_display),
    maximumScore(nudity?.erotica),
    maximumScore(nudity?.very_suggestive),
  );
  const dangerousWeapon = Math.max(
    probability(weaponClasses?.firearm),
    probability(weaponClasses?.firearm_gesture),
    probability(weaponClasses?.knife),
  );
  const unsafe = explicitNudity >= 0.55
    || dangerousWeapon >= 0.55
    || probability((result.offensive as Record<string, unknown> | undefined)?.prob) >= 0.55
    || probability((result.gore as Record<string, unknown> | undefined)?.prob) >= 0.5
    || probability((result.violence as Record<string, unknown> | undefined)?.prob) >= 0.55;
  if (unsafe) throw new ModerationError("Image was rejected by content moderation.", true);
}

export function moderationResponse(error: unknown) {
  const moderationError = error instanceof ModerationError ? error : new ModerationError("Content moderation failed.");
  return {
    error: moderationError.message,
    code: moderationError.rejected ? "CONTENT_REJECTED" : "MODERATION_UNAVAILABLE",
  };
}
