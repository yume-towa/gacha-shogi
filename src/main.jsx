import React from "react";
import { createRoot } from "react-dom/client";
import GachaShogi from "./GachaShogi.jsx";
import "./index.css";

// StrictMode は開発時に処理を2回走らせるため、効果音・AIの思考と相性が悪いので使わない
createRoot(document.getElementById("root")).render(<GachaShogi />);
