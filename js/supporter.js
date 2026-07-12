// Dependencies

import { supabase } from "./supabase.js";
import {
  getCurrentUserOrRedirect,
  showCurrentUser,
  withLoadingOverlay,
} from "./main.js";

// Definitions

const paddleClientToken = "live_a78666236cfe51641543b122f30";
const supporterProductId = "pro_01kxa7adj886zy9zemh5tngf0e";
const supporterItem = {
  priceId: "pri_01kxa7b8axdvap0erdrpj5bgpy",
  quantity: 1,
};

const usernameLabel = document.getElementById("username-label");
const supporterPriceElement = document.getElementById("SupportPriceElement");
const buySupporterButton = document.getElementById("buySupporterButton");

let paddle;
let currentUser;

// Paddle

function initializePaddle() {
  if (!window.Paddle) {
    throw new Error("Paddle.js failed to load.");
  }

  paddle = window.Paddle;
  paddle.Initialize({ token: paddleClientToken });
}

async function loadSupporterPrice() {
  try {
    const preview = await paddle.PricePreview({ items: [supporterItem] });
    const supporterLineItem = preview.data.details.lineItems.find(
      (item) => item.product.id === supporterProductId,
    );

    if (!supporterLineItem) {
      throw new Error("The Bloom Supporter product was not returned by Paddle.");
    }

    supporterPriceElement.textContent = `${supporterLineItem.formattedTotals.subtotal} / month`;
  } catch (error) {
    console.error("Error loading the Bloom Supporter price:", error);
    supporterPriceElement.textContent = "Price unavailable";
  }
}

async function openSupporterCheckout() {
  if (!paddle || !currentUser) {
    return;
  }

  buySupporterButton.disabled = true;
  try {
    await withLoadingOverlay(async () => {
      const { data, error } = await supabase.functions.invoke("create-supporter-checkout");
      const transactionId = data?.transactionId;

      if (error || !/^txn_[a-z0-9]{26}$/.test(transactionId ?? "")) {
        console.error("Unable to create a secure Supporter checkout:", error);
        alert("Unable to start checkout. Please try again.");
        return;
      }

      paddle.Checkout.open({ transactionId });
    }, "Preparing secure checkout...");
  } catch (error) {
    console.error("Secure Supporter checkout failed:", error);
    alert("Unable to start checkout. Please try again.");
  } finally {
    buySupporterButton.disabled = false;
  }
}

// Events

buySupporterButton.addEventListener("click", openSupporterCheckout);

// Initialization

buySupporterButton.disabled = true;

await withLoadingOverlay(async () => {
  currentUser = await getCurrentUserOrRedirect();
  if (!currentUser) {
    return;
  }

  await showCurrentUser(currentUser, usernameLabel);

  try {
    initializePaddle();
    await loadSupporterPrice();
    buySupporterButton.disabled = false;
  } catch (error) {
    console.error("Unable to initialize Bloom Supporter checkout:", error);
    supporterPriceElement.textContent = "Checkout unavailable";
  }
}, "Loading supporter page...");
