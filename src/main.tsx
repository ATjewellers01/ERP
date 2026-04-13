  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Prevent numeric inputs from changing value on scroll
  document.addEventListener("wheel", function (event) {
    if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === "number") {
      event.preventDefault();
    }
  }, { passive: false });

  createRoot(document.getElementById("root")!).render(<App />);
  