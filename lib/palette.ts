export interface PaletteItem {
  number: number;
  name: string;
  hex: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_COUNT: Record<Difficulty, number> = {
  easy: 6,
  medium: 12,
  hard: 24,
};

export const FULL_PALETTE: PaletteItem[] = [
  { number: 1,  name: "Black",       hex: "#1a1a1a" },
  { number: 2,  name: "Dark Blue",   hex: "#1a3a6b" },
  { number: 3,  name: "Green",       hex: "#4a8c3f" },
  { number: 4,  name: "Yellow",      hex: "#f5c518" },
  { number: 5,  name: "Orange",      hex: "#f5820d" },
  { number: 6,  name: "Red",         hex: "#c0392b" },
  { number: 7,  name: "Light Blue",  hex: "#5dade2" },
  { number: 8,  name: "Purple",      hex: "#7d3c98" },
  { number: 9,  name: "Brown",       hex: "#7d5a50" },
  { number: 10, name: "Pink",        hex: "#f48fb1" },
  { number: 11, name: "Light Green", hex: "#82e0aa" },
  { number: 12, name: "Cream",       hex: "#f5f0e8" },
  { number: 13, name: "Dark Red",    hex: "#7b241c" },
  { number: 14, name: "Dark Green",  hex: "#1d6a2d" },
  { number: 15, name: "Gold",        hex: "#d4ac0d" },
  { number: 16, name: "Teal",        hex: "#117a65" },
  { number: 17, name: "Navy",        hex: "#1b2631" },
  { number: 18, name: "Salmon",      hex: "#e59866" },
  { number: 19, name: "Lime",        hex: "#b7e487" },
  { number: 20, name: "Cyan",        hex: "#00bcd4" },
  { number: 21, name: "Indigo",      hex: "#3f51b5" },
  { number: 22, name: "Amber",       hex: "#ffc107" },
  { number: 23, name: "Gray",        hex: "#808080" },
  { number: 24, name: "Beige",       hex: "#f5deb3" },
];

export function getPalette(difficulty: Difficulty): PaletteItem[] {
  return FULL_PALETTE.slice(0, DIFFICULTY_COUNT[difficulty]);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
