import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installLocalApi } from "./lib/localApi";

installLocalApi();

createRoot(document.getElementById("root")!).render(<App />);
