export type Skin = "neon" | "retro" | "clasico";

export const SKINS: { id: Skin; label: string }[] = [
  { id: "neon", label: "NEÓN" },
  { id: "retro", label: "RETRO" },
  { id: "clasico", label: "CLÁSICO" },
];

export const DEFAULT_SKIN: Skin = "neon";

/** Paleta del canvas de Asteroides (solo apariencia). */
export interface AsteroidsPalette {
  bg: string;
  ship: string;
  flame: string;
  asteroid: string;
  bullet: string;
  particle: string; // "r,g,b" (se le añade el alfa)
  powerUp: string;
  text: string;
  textDim: string;
  glow: number; // shadowBlur; 0 = sin brillo
  lineWidth: number;
  pixel: boolean; // balas/partículas cuadradas, esquinas rectas
  font: string;
}

export const ASTEROIDS_PALETTES: Record<Skin, AsteroidsPalette> = {
  // Cyan/magenta/amarillo saturados con glow sobre casi negro.
  neon: {
    bg: "#05050a",
    ship: "#00f5ff",
    flame: "#ff8a00",
    asteroid: "#ff3d9a",
    bullet: "#f5ff00",
    particle: "255,61,154",
    powerUp: "#00ff88",
    text: "#e6e9ff",
    textDim: "#a9aed6",
    glow: 12,
    lineWidth: 1.8,
    pixel: false,
    font: "monospace",
  },
  // 4 tonos tipo Game Boy, píxeles marcados, sin glow.
  retro: {
    bg: "#0f380f",
    ship: "#9bbc0f",
    flame: "#8bac0f",
    asteroid: "#8bac0f",
    bullet: "#9bbc0f",
    particle: "155,188,15",
    powerUp: "#9bbc0f",
    text: "#9bbc0f",
    textDim: "#8bac0f",
    glow: 0,
    lineWidth: 3,
    pixel: true,
    font: "bold monospace",
  },
  // Vectorial blanco sobre negro con primarios planos.
  clasico: {
    bg: "#000000",
    ship: "#ffffff",
    flame: "#ff3b30",
    asteroid: "#ffffff",
    bullet: "#ffffff",
    particle: "255,255,255",
    powerUp: "#ffd400",
    text: "#ffffff",
    textDim: "#c8c8c8",
    glow: 0,
    lineWidth: 1.5,
    pixel: false,
    font: "monospace",
  },
};

/** Paleta de Tetris. `colors` se indexa 1–8 como las piezas (0 sin uso). */
export interface TetrisPalette {
  bg: string;
  boardBg: string;
  grid: string;
  colors: string[];
  gloss: boolean; // franja superior clara en cada bloque
  hollow: boolean; // piezas pares con hueco central (distingue sin color)
  glow: number;
  text: string;
  textDim: string;
  overlay: string;
}

export const TETRIS_PALETTES: Record<Skin, TetrisPalette> = {
  neon: {
    bg: "#05050a",
    boardBg: "#0a0a14",
    grid: "#22222e",
    colors: ["", "#00f5ff", "#f5ff00", "#d45bff", "#00ff88", "#ff3d6e", "#5b9bff", "#ff8a00", "#c0c4e0"],
    gloss: true,
    hollow: false,
    glow: 8,
    text: "#e6e9ff",
    textDim: "#a9aed6",
    overlay: "rgba(0,0,0,0.7)",
  },
  retro: {
    bg: "#0f380f",
    boardBg: "#0f380f",
    grid: "#306230",
    colors: ["", "#9bbc0f", "#8bac0f", "#9bbc0f", "#8bac0f", "#9bbc0f", "#8bac0f", "#9bbc0f", "#8bac0f"],
    gloss: false,
    hollow: true,
    glow: 0,
    text: "#9bbc0f",
    textDim: "#8bac0f",
    overlay: "rgba(15,56,15,0.85)",
  },
  clasico: {
    bg: "#000000",
    boardBg: "#000000",
    grid: "#3a3a3a",
    colors: ["", "#ffffff", "#ffd400", "#ff3b30", "#ffffff", "#ff3b30", "#4d7cff", "#ffd400", "#c8c8c8"],
    gloss: false,
    hollow: false,
    glow: 0,
    text: "#ffffff",
    textDim: "#c8c8c8",
    overlay: "rgba(0,0,0,0.8)",
  },
};

export type BlockColorName =
  | "gray"
  | "red"
  | "yellow"
  | "cyan"
  | "magenta"
  | "hotpink"
  | "green";

/** Paleta de Arkanoid. Con `sprites` se usa el spritesheet original; si no, formas planas. */
export interface ArkanoidPalette {
  bg: string;
  sprites: boolean;
  blocks: Record<BlockColorName, string>;
  paddle: string;
  ball: string;
  text: string;
  textDim: string;
  overlay: string;
}

export const ARKANOID_PALETTES: Record<Skin, ArkanoidPalette> = {
  neon: {
    bg: "#000000",
    sprites: true,
    blocks: { gray: "", red: "", yellow: "", cyan: "", magenta: "", hotpink: "", green: "" },
    paddle: "",
    ball: "",
    text: "#ffffff",
    textDim: "rgba(255,255,255,0.65)",
    overlay: "rgba(0,0,0,0.65)",
  },
  retro: {
    bg: "#0f380f",
    sprites: false,
    blocks: {
      gray: "#8bac0f",
      red: "#9bbc0f",
      yellow: "#8bac0f",
      cyan: "#9bbc0f",
      magenta: "#8bac0f",
      hotpink: "#9bbc0f",
      green: "#8bac0f",
    },
    paddle: "#9bbc0f",
    ball: "#9bbc0f",
    text: "#9bbc0f",
    textDim: "#8bac0f",
    overlay: "rgba(15,56,15,0.85)",
  },
  clasico: {
    bg: "#000000",
    sprites: false,
    blocks: {
      gray: "#c8c8c8",
      red: "#ff3b30",
      yellow: "#ffd400",
      cyan: "#4d7cff",
      magenta: "#ff3b30",
      hotpink: "#ffffff",
      green: "#4d7cff",
    },
    paddle: "#ffffff",
    ball: "#ffffff",
    text: "#ffffff",
    textDim: "#c8c8c8",
    overlay: "rgba(0,0,0,0.8)",
  },
};

/** Paleta de Serpentina. Con `sprites` la fruta usa el atlas original. */
export interface SerpentinaPalette {
  boardDark: string;
  boardLight: string;
  head: string;
  bodyRgb: [number, number, number];
  tailRgb: [number, number, number];
  radius: number;
  glow: number;
  bodyGlow: string;
  sprites: boolean;
  fruitShape: "disc" | "pixel";
  fruit: string;
  fruitGlow: string;
  eyeWhite: string;
  eyePupil: string;
  overlayBg: string;
  pause: string;
  win: string;
  lose: string;
  hint: string;
}

export const SERPENTINA_PALETTES: Record<Skin, SerpentinaPalette> = {
  neon: {
    boardDark: "#051d15",
    boardLight: "#07261b",
    head: "#b8ffe0",
    bodyRgb: [0, 255, 136],
    tailRgb: [14, 138, 88],
    radius: 8,
    glow: 8,
    bodyGlow: "rgba(0, 255, 136, 0.45)",
    sprites: true,
    fruitShape: "disc",
    fruit: "#ff006e",
    fruitGlow: "rgba(255, 0, 110, 0.75)",
    eyeWhite: "#ffffff",
    eyePupil: "#04100a",
    overlayBg: "rgba(3, 10, 8, 0.72)",
    pause: "#00f5ff",
    win: "#00ff88",
    lose: "#ff006e",
    hint: "#e6e9ff",
  },
  retro: {
    boardDark: "#0f380f",
    boardLight: "#123f12",
    head: "#9bbc0f",
    bodyRgb: [139, 172, 15],
    tailRgb: [139, 172, 15],
    radius: 0,
    glow: 0,
    bodyGlow: "transparent",
    sprites: false,
    fruitShape: "pixel",
    fruit: "#9bbc0f",
    fruitGlow: "transparent",
    eyeWhite: "#0f380f",
    eyePupil: "#9bbc0f",
    overlayBg: "rgba(15, 56, 15, 0.85)",
    pause: "#9bbc0f",
    win: "#9bbc0f",
    lose: "#9bbc0f",
    hint: "#9bbc0f",
  },
  clasico: {
    boardDark: "#000000",
    boardLight: "#0d0d0d",
    head: "#ffffff",
    bodyRgb: [255, 255, 255],
    tailRgb: [170, 170, 170],
    radius: 2,
    glow: 0,
    bodyGlow: "transparent",
    sprites: false,
    fruitShape: "disc",
    fruit: "#ff3b30",
    fruitGlow: "transparent",
    eyeWhite: "#000000",
    eyePupil: "#ffffff",
    overlayBg: "rgba(0, 0, 0, 0.8)",
    pause: "#ffffff",
    win: "#ffd400",
    lose: "#ff3b30",
    hint: "#ffffff",
  },
};

// ── Store (patrón de lib/session.ts) ────────────────────────────────────────
const SKIN_KEY = "av_skin";
let memorySkin: Skin | null = null;
const listeners = new Set<() => void>();

export function isSkin(v: unknown): v is Skin {
  return v === "neon" || v === "retro" || v === "clasico";
}

export function subscribeSkin(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === SKIN_KEY || e.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSkinSnapshot(): Skin {
  try {
    const v = localStorage.getItem(SKIN_KEY);
    if (isSkin(v)) return v;
  } catch {
    if (memorySkin) return memorySkin;
  }
  return memorySkin ?? DEFAULT_SKIN;
}

export function getServerSkinSnapshot(): Skin {
  return DEFAULT_SKIN;
}

export function writeSkin(skin: Skin): void {
  memorySkin = skin;
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {}
  listeners.forEach((l) => l());
}
