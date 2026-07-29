// Dependencies

import { supabase } from "./supabase.js";
import { callRpc, retryConnection } from "./connection.js";

// Definitions

const BackgroundGeolocation = globalThis.Capacitor?.Plugins?.BackgroundGeolocation;
const LocalNotifications = globalThis.Capacitor?.Plugins?.LocalNotifications;
const minimumUploadInterval = 10_000;

let activeUserId = null;
let browserWatchId = null;
let lastUploadAt = 0;
let nativeTrackingStarted = false;
let nativeStartPromise = null;
let locationUploadPromise = null;

// Notifications

async function requestNotificationPermission() {
  if (!LocalNotifications) return "unsupported";
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display === "prompt") {
    permission = await LocalNotifications.requestPermissions();
  }
  return permission.display;
}

async function notifyEncounter(encounterKey) {
  if (!LocalNotifications || !encounterKey) return;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") return;
  const id = Number.parseInt(encounterKey.slice(0, 7), 16) || Math.floor(Date.now() / 1000);
  await LocalNotifications.schedule({
    notifications: [{
      id,
      title: "Someone from Bloom is nearby",
      body: "You just crossed paths with someone from one of your communities.",
      sound: "default",
      extra: { route: "connect" },
    }],
  });
}

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
      await notifyEncounter(encounter.encounter_key);
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

async function startNativeTracking({ requestPermissions }) {
  if (!BackgroundGeolocation) return false;
  if (nativeTrackingStarted) return true;
  if (nativeStartPromise) return nativeStartPromise;

  nativeStartPromise = (async () => {
    if (requestPermissions) {
      const permissions = await BackgroundGeolocation.requestPermissions({
        permissions: ["location", "backgroundLocation", "notification"],
      });
      const backgroundAllowed = ["always", "granted"].includes(permissions.backgroundLocation);
      if (!backgroundAllowed) {
        throw new Error("Always location permission is required for background Connect alerts.");
      }
    } else {
      const permissions = await BackgroundGeolocation.checkPermissions();
      if (!["always", "granted"].includes(permissions.backgroundLocation)) return false;
    }

    try {
      await BackgroundGeolocation.stop();
    } catch (error) {
      console.debug("No previous Connect tracker needed stopping:", error.message ?? error);
    }

    try {
      await BackgroundGeolocation.start({
        backgroundTitle: "Bloom Connect is active",
        backgroundMessage: "Bloom is checking for nearby opted-in community members.",
        requestPermissions: false,
        stale: false,
        distanceFilter: 10,
      }, (location, error) => {
        if (error) {
          console.error("Connect background location error:", error.message ?? error);
          return;
        }
        submitLocation(location).catch((submitError) => {
          console.error("Connect location submission failed:", submitError.message);
        });
      });
    } catch (error) {
      if (error?.code !== "ALREADY_STARTED") throw error;
      console.info("Connect background tracking was already active.");
    }
    nativeTrackingStarted = true;
    return true;
  })().finally(() => {
    nativeStartPromise = null;
  });

  return nativeStartPromise;
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

export async function startConnect(user, { requestPermissions = false } = {}) {
  if (!user?.id) return false;
  activeUserId = user.id;
  if (BackgroundGeolocation) {
    return startNativeTracking({ requestPermissions });
  }
  return startBrowserTracking();
}

export async function stopConnect() {
  activeUserId = null;
  lastUploadAt = 0;
  if (BackgroundGeolocation) {
    try {
      await BackgroundGeolocation.stop();
    } catch (error) {
      console.debug("Connect tracker was already stopped:", error.message ?? error);
    }
    nativeTrackingStarted = false;
  }
  nativeStartPromise = null;
  if (browserWatchId !== null) {
    navigator.geolocation.clearWatch(browserWatchId);
    browserWatchId = null;
  }
}

// Preferences

export async function setConnectEnabled(user, enabled) {
  if (!user?.id) throw new Error("Sign in before changing Connect settings.");

  if (enabled) {
    const notificationPermission = await requestNotificationPermission();
    if (LocalNotifications && notificationPermission !== "granted") {
      throw new Error("Notification permission is required for Connect alerts.");
    }
    const data = await callRpc(
      supabase,
      "set_connect_enabled",
      { enabled: true },
      { retries: 1 },
    );
    try {
      await startConnect(user, { requestPermissions: true });
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
  return startConnect(user, { requestPermissions: false });
}
