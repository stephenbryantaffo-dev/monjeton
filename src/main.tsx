import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const hideSplash = () => {
  const s = document.getElementById("splash-screen");
  if (!s) return;
  s.classList.add("hide");
  setTimeout(() => s.remove(), 400);
};

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash as soon as React has rendered the first frame.
requestAnimationFrame(() => {
  requestAnimationFrame(hideSplash);
});

// Safety net: never leave the user stuck on the splash.
setTimeout(hideSplash, 5000);
