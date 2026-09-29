import "./setup/storageShim.js";
import "./animations.css";
import React from "react";
import { createRoot } from "react-dom/client";
import TredziApp from "./App.jsx";

const rootEl = document.getElementById("root");
if (rootEl && !rootEl.__tredziMounted) {
  rootEl.__tredziMounted = true;
  createRoot(rootEl).render(<TredziApp />);
}
