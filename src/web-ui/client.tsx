import { createRoot } from "react-dom/client";
import { App } from "./components/App.tsx";
import { applyColors, applyTheme, savedColors, savedTheme } from "./theme.ts";

// Apply the saved theme and colors before the first render so the page never flashes.
applyTheme(savedTheme(), false);
applyColors(savedColors(), false);

createRoot(document.getElementById("root")!).render(<App />);
