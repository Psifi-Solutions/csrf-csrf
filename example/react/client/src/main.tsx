import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AppProvider from "./app/provider";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </StrictMode>,
  );
} else {
  const errorParagraph = document.createElement("p");
  errorParagraph.textContent = "Root element not found";
  document.body.appendChild(errorParagraph);
}
