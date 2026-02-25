import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Main.tsx executing...");

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;">Root element #root not found. Check index.html.</div>';
} else {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("Failed to render app:", err);
    rootEl.innerHTML = '<div style="padding:2rem;font-family:sans-serif;"><h2>Failed to load app</h2><p>Check the browser console for errors.</p><button onclick="location.reload()">Reload</button></div>';
  }
}
