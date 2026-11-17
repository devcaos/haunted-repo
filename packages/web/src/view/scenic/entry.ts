import "./styles/scenic-tokens.css";
import "./styles/base.css";
import "./styles/hud.css";
import "./styles/motion.css";
import { loadScenicFonts } from "./fonts.js";
import { createScenicRenderer } from "./renderer.js";
loadScenicFonts();
export const createRenderer = createScenicRenderer;
