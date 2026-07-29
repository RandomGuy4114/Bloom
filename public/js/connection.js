// Definitions

const transientStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);

// Errors

function isTransientConnectionError(error) {
  if (!error) return false;
  if (error.name === "AbortError" || error.name === "TimeoutError") return true;
  if (transientStatusCodes.has(Number(error.status))) return true;
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return [
    "failed to fetch",
    "fetch failed",
    "network",
    "timeout",
    "timed out",
    "connection",
    "offline",
  ].some((phrase) => text.includes(phrase));
}

function wait(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

// Requests

export async function withConnectionTimeout(
  operation,
  timeout = 12_000,
  message = "The connection took too long.",
) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new DOMException(message, "TimeoutError"));
        }, timeout);
      }),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

export async function retryConnection(
  operation,
  { retries = 1, timeout = 12_000 } = {},
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withConnectionTimeout(operation, timeout);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isTransientConnectionError(error)) throw error;
      const backoff = 350 * (2 ** attempt) + Math.floor(Math.random() * 150);
      await wait(backoff);
    }
  }
  throw lastError;
}

export async function callRpc(supabase, functionName, parameters = {}, options = {}) {
  const result = await retryConnection(
    async () => {
      const response = await supabase.rpc(functionName, parameters);
      if (response.error) throw response.error;
      return response;
    },
    options,
  );
  return result.data;
}
