import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAdMob } from "./utils/admob";

// Initialize AdMob on native platforms
initializeAdMob();

createRoot(document.getElementById("root")!).render(<App />);
