import { animate } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";
import { supabase } from "./supabase.js?v=msgbwtsa";

const homeUrl = new URL("../pages/app/home/", import.meta.url).href;
const { data: { session } } = await supabase.auth.getSession();

if (session?.user) {
  window.location.replace(homeUrl);
}

const title = document.querySelector(".landing-page .LeftSide h1");

const animateTitle = animate(title, { scale: [0.2, 1], y: [-20, 0] }, { duration: 1, ease: "circInOut" });
await animateTitle.finished;
animate("#LandingSubtitle", { opacity: [0, 1], y: [20, 0] }, { duration: 1, ease: "circInOut" });
