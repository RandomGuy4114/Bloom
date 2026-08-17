// Dependencies

import { supabase } from "./supabase.js?v=msx4sye2";
import { callRpc, retryConnection } from "./connection.js?v=msx4sye2";

// Definitions

const minimumUploadInterval = 10_000;

let activeUserId = null;
let browserWatchId = null;
let lastUploadAt = 0;
let locationUploadPromise = null;

// Location

async function submitLocation(location) {
  if (!activeUserId || !location) return;
  const now = Date.now();
  if (now - lastUploadAt < minimumUploadInterval) return;
  if (location.time && now - location.time > 120_000) return;
  if (locationUploadPromise) return locationUploadPromise;

  locationUploadPromise = (async () => {
    const data = await callRpc(supabase, "update_connect_location", {
      user_latitude: location.latitude,
      user_longitude: location.longitude,
      user_accuracy_meters: location.accuracy ?? null,
    }, { retries: 2, timeout: 12_000 });
    lastUploadAt = Date.now();

    const encounter = Array.isArray(data) ? data[0] : data;
    console.info("Connect location synced.", {
      accuracyMeters: Math.round(location.accuracy ?? 0),
      encountered: encounter?.encountered === true,
    });
    if (encounter?.encountered) {
      window.dispatchEvent(new CustomEvent("bloom:connect-encounter", {
        detail: { encounterKey: encounter.encounter_key },
      }));
    }
  })().catch((error) => {
    lastUploadAt = 0;
    throw error;
  }).finally(() => {
    locationUploadPromise = null;
  });

  return locationUploadPromise;
}

function submitBrowserPosition(position) {
  return submitLocation({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    time: position.timestamp,
  });
}

function startBrowserTracking() {
  if (!navigator.geolocation || browserWatchId !== null) return false;
  browserWatchId = navigator.geolocation.watchPosition(
    (position) => submitBrowserPosition(position).catch(console.error),
    (error) => console.error("Connect location error:", error.message),
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
  );
  return true;
}

export async function startConnect(user) {
  if (!user?.id) return false;
  activeUserId = user.id;
  return startBrowserTracking();
}

export async function stopConnect() {
  activeUserId = null;
  lastUploadAt = 0;
  if (browserWatchId !== null) {
    navigator.geolocation.clearWatch(browserWatchId);
    browserWatchId = null;
  }
}

// Preferences

export async function setConnectEnabled(user, enabled) {
  if (!user?.id) throw new Error("Sign in before changing Connect settings.");

  if (enabled) {
    const data = await callRpc(
      supabase,
      "set_connect_enabled",
      { enabled: true },
      { retries: 1 },
    );
    try {
      await startConnect(user);
    } catch (trackingError) {
      await callRpc(supabase, "set_connect_enabled", { enabled: false }, { retries: 1 });
      await stopConnect();
      throw trackingError;
    }
    return data === true;
  }

  await stopConnect();
  const data = await callRpc(
    supabase,
    "set_connect_enabled",
    { enabled: false },
    { retries: 1 },
  );
  return data === false;
}

export async function restoreConnect(user) {
  if (!user?.id) return false;
  const profile = await retryConnection(async () => {
    const result = await supabase
      .from("profiles")
      .select("connect_enabled")
      .eq("id", user.id)
      .single();
    if (result.error) throw result.error;
    return result.data;
  }, { retries: 1 });
  if (profile?.connect_enabled !== true) return false;
  return startConnect(user);
}
