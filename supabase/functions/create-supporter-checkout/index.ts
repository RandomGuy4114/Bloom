import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paddleApiKey = Deno.env.get("PADDLE_API_KEY");
  const supporterPriceId = Deno.env.get("PADDLE_SUPPORTER_PRICE_ID");
  const paddleEnvironment = Deno.env.get("PADDLE_ENVIRONMENT") ?? "sandbox";

  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }
  if (!paddleApiKey || !supporterPriceId) {
    console.error("Missing Paddle checkout secrets.");
    return jsonResponse({ error: "Checkout is not configured." }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const paddleApiUrl = paddleEnvironment === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
  const paddleResponse = await fetch(`${paddleApiUrl}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paddleApiKey}`,
      "Content-Type": "application/json",
      "Paddle-Version": "1",
    },
    body: JSON.stringify({
      items: [{ price_id: supporterPriceId, quantity: 1 }],
      collection_mode: "automatic",
      custom_data: { bloom_user_id: user.id },
    }),
  });

  const paddleResult = await paddleResponse.json();
  const transactionId = paddleResult?.data?.id;
  if (!paddleResponse.ok || !/^txn_[a-z0-9]{26}$/.test(transactionId ?? "")) {
    console.error("Paddle transaction creation failed:", paddleResponse.status, paddleResult?.error?.code);
    return jsonResponse({ error: "Unable to create checkout." }, 502);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error: mappingError } = await adminClient
    .from("supporter_checkout_transactions")
    .insert({ transaction_id: transactionId, user_id: user.id });

  if (mappingError) {
    console.error("Unable to save Supporter transaction owner:", mappingError.message);
    await fetch(`${paddleApiUrl}/transactions/${transactionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      body: JSON.stringify({ status: "canceled" }),
    });
    return jsonResponse({ error: "Unable to secure checkout." }, 500);
  }

  return jsonResponse({ transactionId }, 200);
});
