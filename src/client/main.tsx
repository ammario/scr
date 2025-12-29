import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import ViewNote from "./pages/ViewNote";
import "../styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:noteId" element={<ViewNote />} />
        </Routes>
      </App>
    </BrowserRouter>
  </StrictMode>
);
