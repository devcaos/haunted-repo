// The single inventory of graphics of the web demo. Plain data only.
// Files: the declared scene illustration `scene.house`, director's decision,
// 18 Nov) and the four Gate_Panel pictures `panel.*`, director's decision,
// 19 Nov). Every other slot is empty and uses its fallback.

export type AssetSlotId =
  | "scene.house"
  | "scene.attic"
  | "scene.middle-floor"
  | "scene.basement"
  | "scene.ghost-room"
  | "ghost.haunted"
  | "ghost.exorcised"
  | "ghost.locked"
  | "prop.door"
  | "prop.candle"
  | "panel.frame"
  | "panel.gargoyle"
  | "panel.lantern"
  | "panel.pumpkin";

export interface AssetLayer {
  /** File name inside src/view/assets/files/, e.g. "attic-back.webp". */
  file: string;
  /** "" for a decorative layer. */
  alt: string;
  /** Who made it and under which licence. Never blank. */
  source: string;
}

export type AssetFallback = "none" | "token-colour" | "text-label";

export interface AssetSlot {
  id: AssetSlotId;
  /** One plain sentence. */
  purpose: string;
  /** Back to front. [] means no asset yet. */
  layers: AssetLayer[];
  /** What a renderer shows when layers is [] or a file is missing. */
  fallback: AssetFallback;
}

export const ASSET_SLOTS: readonly AssetSlot[] = [
  {
    id: "scene.house",
    purpose: "Background of the whole haunted house.",
    layers: [
      {
        file: "house-scene.svg",
        alt: "",
        source:
          "Illustration drafted with Claude (Anthropic AI), declared in the Devpost submission; integrated and animated with Kiro. MIT licence, like the repo.",
      },
    ],
    fallback: "token-colour",
  },
  {
    id: "scene.attic",
    purpose: "Background of the attic, the floor of the easy ghosts.",
    layers: [],
    fallback: "token-colour",
  },
  {
    id: "scene.middle-floor",
    purpose: "Background of the middle floor, the floor of the medium ghosts.",
    layers: [],
    fallback: "token-colour",
  },
  {
    id: "scene.basement",
    purpose: "Background of the basement, the floor of the hard ghosts.",
    layers: [],
    fallback: "token-colour",
  },
  {
    id: "scene.ghost-room",
    purpose: "Background of the room where one ghost is exorcised.",
    layers: [],
    fallback: "token-colour",
  },
  {
    id: "ghost.haunted",
    purpose: "Picture of a ghost that is still haunting its file.",
    layers: [],
    fallback: "text-label",
  },
  {
    id: "ghost.exorcised",
    purpose: "Picture of a ghost that has been exorcised.",
    layers: [],
    fallback: "text-label",
  },
  {
    id: "ghost.locked",
    purpose: "Picture of a ghost that cannot be exorcised in the demo.",
    layers: [],
    fallback: "text-label",
  },
  {
    id: "prop.door",
    purpose: "Door that leads to a floor or a ghost room.",
    layers: [],
    fallback: "none",
  },
  {
    id: "prop.candle",
    purpose: "Candle that decorates the house.",
    layers: [],
    fallback: "none",
  },
  {
    id: "panel.frame",
    purpose: "Stone gate around the HUD on wide screens.",
    layers: [
      {
        file: "panel-frame.svg",
        alt: "",
        source:
          "Drawn with Claude (Anthropic AI) after a ChatGPT (OpenAI) concept, declared in the Devpost submission; integrated with Kiro. MIT licence, like the repo.",
      },
    ],
    fallback: "none",
  },
  {
    id: "panel.gargoyle",
    purpose: "Gargoyle with a rose window on top of the gate.",
    layers: [
      {
        file: "panel-gargoyle.svg",
        alt: "",
        source:
          "Drawn with ChatGPT (OpenAI) and vectorised with Claude (Anthropic AI), declared in the Devpost submission; integrated with Kiro. MIT licence, like the repo.",
      },
    ],
    fallback: "none",
  },
  {
    id: "panel.lantern",
    purpose: "Lantern hanging from the right pillar of the gate.",
    layers: [
      {
        file: "panel-lantern.svg",
        alt: "",
        source:
          "Drawn with ChatGPT (OpenAI) and vectorised with Claude (Anthropic AI), declared in the Devpost submission; integrated with Kiro. MIT licence, like the repo.",
      },
    ],
    fallback: "none",
  },
  {
    id: "panel.pumpkin",
    purpose: "Lit pumpkin at the foot of the gate.",
    layers: [
      {
        file: "panel-pumpkin.svg",
        alt: "",
        source:
          "Drawn with ChatGPT (OpenAI) and vectorised with Claude (Anthropic AI), declared in the Devpost submission; integrated with Kiro. MIT licence, like the repo.",
      },
    ],
    fallback: "none",
  },
];
