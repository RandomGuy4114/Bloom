import { createClient } from "npm:@supabase/supabase-js@2";

const maximumBodySize = 1024 * 1024;
const signatureToleranceSeconds = 300;
const encoder = new TextEncoder();

function respond(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyPaddleSignature(rawBody: string, header: string, secret: string) {
  const values = header.split(";").reduce<Record<string, string[]>>((result, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) {
      return result;
    }
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    (result[key] ??= []).push(value);
    return result;
  }, {});

  const timestamp = values.ts?.[0];
  const signatures = values.h1 ?? [];
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isInteger(timestampNumber) || signatures.length === 0) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - timestampNumber) > signatureToleranceSeconds) {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(`${timestamp}:${rawBody}`),
  );
  const expected = [...new Uint8Array(signatureBytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((signature) => (
    /^[a-f0-9]{64}$/i.test(signature) && constantTimeEqual(expected, signature.toLowerCase())
  ));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return respond("Method not allowed", 405);
  }
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return respond("Unsupported media type", 415);
  }

  const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET_KEY");
  const signatureHeader = request.headers.get("Paddle-Signature");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Paddle webhook environment is not configured.");
    return respond("Service unavailable", 503);
  }
  if (!signatureHeader) {
    return respond("Invalid signature", 401);
  }

  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > maximumBodySize) {
    return respond("Payload too large", 413);
  }

  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > maximumBodySize) {
    return respond("Payload too large", 413);
  }
  if (!await verifyPaddleSignature(rawBody, signatureHeader, webhookSecret)) {
    return respond("Invalid signature", 401);
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return respond("Invalid payload", 400);
  }

  const eventId = typeof event.event_id === "string" ? event.event_id : "";
  const eventType = typeof event.event_type === "string" ? event.event_type : "";
  const data = event.data && typeof event.data === "object"
    ? event.data as Record<string, unknown>
    : {};
  const subscriptionId = typeof data.id === "string" ? data.id : "";
  const transactionId = typeof data.transaction_id === "string" ? data.transaction_id : null;
  const status = typeof data.status === "string" ? data.status : "";
  const supportedEvents = new Set([
    "subscription.created",
    "subscription.updated",
    "subscription.canceled",
  ]);

  if (!supportedEvents.has(eventType)) {
    return respond("Webhook ignored", 200);
  }
  if (
    !/^evt_[a-z0-9]{26}$/.test(eventId)
    || !/^sub_[a-z0-9]{26}$/.test(subscriptionId)
    || status.length < 1
    || status.length > 40
    || (eventType === "subscription.created" && !/^txn_[a-z0-9]{26}$/.test(transactionId ?? ""))
  ) {
    return respond("Invalid payload", 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: processed, error } = await supabase.rpc("process_paddle_subscription_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_subscription_id: subscriptionId,
    p_transaction_id: transactionId,
    p_status: status,
  });

  if (error) {
    console.error("Paddle webhook processing failed:", error.message);
    return respond("Webhook processing failed", 500);
  }

  return respond(processed ? "Webhook processed" : "Webhook already processed", 200);
});
