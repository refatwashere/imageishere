/* ------------------------------------------------------------------ */
/*  Perchance-style prompt templates & aspect ratios                   */
/*  Ported from t2i-styles and t2i-framework-plugin-v2 presets         */
/* ------------------------------------------------------------------ */

export type StyleId =
  | "cinematic"
  | "photo"
  | "painted-anime"
  | "drawn-anime"
  | "ghibli"
  | "digital-painting"
  | "concept-art"
  | "oil-painting"
  | "disney-3d"
  | "watercolor"
  | "pixel-art"
  | "none";

export type StylePreset = {
  id: StyleId;
  label: string;
  short: string;
  format: (description: string) => string;
  negative?: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "cinematic",
    label: "Cinematic",
    short: "Film · 75mm · HDR",
    format: (d) =>
      `${d}, cinematic shot, dynamic lighting, 75mm, Technicolor, Panavision, cinemascope, sharp focus, fine details, 8k, HDR, realism, realistic, key visual, film still, cinematic color grading, depth of field. Overall, it's an absolute world-class cinematic masterpiece with impeccable attention to detail and impressive composition.`,
  },
  {
    id: "photo",
    label: "Professional Photo",
    short: "DSLR · Canon R5 · 75mm",
    format: (d) =>
      `${d}, sharp focus, depth of field, 8k photo, HDR, professional lighting, taken with Canon EOS R5, DSLR, 75mm lens`,
  },
  {
    id: "painted-anime",
    label: "Painted Anime",
    short: "Pixiv · Painterly anime",
    format: (d) =>
      `painterly anime artwork, ${d}, world-class masterpiece, fine details, breathtaking artwork, painterly art style, high quality, 8k, very detailed, high resolution, exquisite composition and lighting. Overall, it's an absolute world-class masterpiece painterly anime artwork with impeccable attention to detail and impressive composition.`,
  },
  {
    id: "drawn-anime",
    label: "Drawn Anime",
    short: "Clean linework · Cel shaded",
    format: (d) =>
      `anime-style illustration with perfect clean lines, illustration of ${d}, bold linework, cel shaded, anime-style digital illustration, looks like a screencap from an anime series. Overall, it's a world-class illustration with flawless line work, perfect composition, and impeccable attention to detail.`,
  },
  {
    id: "ghibli",
    label: "Studio Ghibli",
    short: "Warm film still · Hand-painted",
    format: (d) =>
      `Studio Ghibli style artwork of ${d}, Studio Ghibli style art film still, sharp, very detailed, high resolution, inspired by the style of Hayao Miyazaki, anime film still. Overall, it's an aesthetically pleasing classic Studio Ghibli style artwork with impeccable attention to detail and impressive composition.`,
  },
  {
    id: "digital-painting",
    label: "Digital Painting",
    short: "ArtStation · Rich brushwork",
    format: (d) =>
      `${d}, breathtaking digital art, trending on artstation, 8k, high resolution, best quality. Overall, it's an absolute world-class masterpiece digital painting with impeccable attention to detail and impressive composition.`,
  },
  {
    id: "concept-art",
    label: "Concept Art",
    short: "Detailed · Matte environment",
    format: (d) =>
      `${d}, concept art, digital art, illustration, 8k, fine details, sharp, very detailed, high resolution, world-class masterpiece. Overall, it's an aesthetically pleasing concept art with impeccable attention to detail and impressive composition.`,
  },
  {
    id: "oil-painting",
    label: "Oil Painting",
    short: "Alla prima · Oil on canvas",
    format: (d) =>
      `breathtaking alla prima oil painting, ${d}, alla prima style, oil on linen, painterly oil on canvas, exquisite composition and lighting, award-winning painterly alla prima oil painting. Overall, it's an absolute world-class masterpiece oil painting.`,
  },
  {
    id: "disney-3d",
    label: "3D Animated",
    short: "CGI · Stylized 3D render",
    format: (d) =>
      `3D cartoon animated character render, ${d}, bokeh, 4k, highly detailed, CGI animation, depth of field, subtle details, sharp focus, HDR, octane render, incredible composition, superb lighting and detail.`,
  },
  {
    id: "watercolor",
    label: "Watercolor",
    short: "Textured paper · Soft wash",
    format: (d) =>
      `${d}, watercolor, high resolution, intricate details, 4k, watercolor on textured paper. Overall, it's an absolute world-class masterpiece watercolor artwork with impeccable attention to detail and impressive composition.`,
  },
  {
    id: "pixel-art",
    label: "Pixel Art",
    short: "16-bit · Crisp dithering",
    format: (d) =>
      `(pixel art), ${d}, best pixel art, neo-geo graphical style, retro nostalgic masterpiece, 128px, 16-bit pixel art, 2D adventure game pixel art, masterful dithering, superb composition, beautiful palette, exquisite pixel detail`,
  },
  {
    id: "none",
    label: "No style",
    short: "Raw prompt only",
    format: (d) => d,
  },
];

export type RatioId = "square" | "portrait" | "landscape";

export type RatioPreset = {
  id: RatioId;
  label: string;
  ratio: string;
  width: number;
  height: number;
};

export const RATIO_PRESETS: RatioPreset[] = [
  { id: "square", label: "Square", ratio: "1:1", width: 1024, height: 1024 },
  { id: "portrait", label: "Portrait", ratio: "2:3", width: 768, height: 1152 },
  { id: "landscape", label: "Landscape", ratio: "3:2", width: 1152, height: 768 },
];

export const DEFAULT_STYLE: StyleId = "cinematic";
export const DEFAULT_RATIO: RatioId = "square";

export function getStylePreset(id?: StyleId): StylePreset {
  return STYLE_PRESETS.find((s) => s.id === id) ?? STYLE_PRESETS[0];
}

export function getRatioPreset(id?: RatioId): RatioPreset {
  return RATIO_PRESETS.find((r) => r.id === id) ?? RATIO_PRESETS[0];
}

export function formatPerchancePrompt(rawPrompt: string, styleId: StyleId = DEFAULT_STYLE): string {
  const clean = rawPrompt.trim();
  const preset = getStylePreset(styleId);
  const formatted = preset.format(clean);
  return preset.negative ? `${formatted}. Avoid: ${preset.negative}` : formatted;
}
