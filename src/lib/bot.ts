/* ------------------------------------------------------------------ */
/*  imageishere simulator engine                                       */
/*  Mirrors api/webhook.js: same regexes, same reply texts, same       */
/*  keyboard, same 500-char rule, same fallback image URL.             */
/* ------------------------------------------------------------------ */

import { BOT } from "../data/content";
import {
  DEFAULT_RATIO, DEFAULT_STYLE, formatPerchancePrompt, getRatioPreset, type RatioId, type StyleId,
} from "../data/styles";

export type ChatButton = { label: string; callback?: string; url?: string };

export type ChatMsg = {
  id: string;
  role: "user" | "bot" | "system";
  kind: "text" | "photo" | "loading" | "note";
  text?: string;
  imageUrl?: string;
  prompt?: string;
  retryPrompt?: string;
  styleId?: StyleId;
  ratioId?: RatioId;
  width?: number;
  height?: number;
  seed?: number;
  viaBot?: boolean;
  keyboard?: ChatButton[][];
  ts: number;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const botMsg = (partial: Omit<ChatMsg, "id" | "role" | "ts">): ChatMsg => ({
  id: uid(),
  role: "bot",
  ts: Date.now(),
  ...partial,
});

/* ---------------- exact texts from api/webhook.js ---------------- */

export const REPLIES = {
  start:
    "Welcome to Image is Here!\n\nSend a text prompt or choose an option below.\n\nTips:\n• Describe the subject and setting\n• Add style and lighting\n• Keep prompts under 500 characters",
  help:
    "How to use:\n• Send a clear image prompt\n• Wait while the image is generated\n• Prompts are limited to 500 characters\n• Use /examples for ideas or /status for service information",
  about:
    "Image is Here\nDeveloper: Robiul Islam Refat\nOrganization: refatseducare\nWebsite: https://www.refatishere.free.nf\nGitHub: https://github.com/refatwashere/imageishere",
  generate: "Send a clear prompt. A useful format is:\n\nSubject + setting + style + lighting + camera details",
  examples:
    "Try one of these prompts:\n\n• A red fox in a snowy forest, cinematic lighting\n• A cyberpunk city at night, neon rain\n• A watercolor mountain landscape\n• A friendly astronaut exploring a colorful planet",
  status:
    "Image is Here is connected to Telegram and Vercel. To test image generation, send /generate or enter a normal text prompt.",
  website: "Website: https://imageishere.vercel.app/",
  support:
    "Support:\n• Email: refatseducare@gmail.com\n• GitHub: https://github.com/refatwashere/imageishere\n\nInclude the prompt type and a brief error description.",
  cancel: "There is no active prompt session to cancel. Send /generate or enter a new prompt.",
  tooLong: "Please keep your prompt to 500 characters or fewer.",
  loading: "⏳ Generating image... This may take up to 60 seconds.",
  error: "💥 Error generating image. Please try again later.",
  caption: (prompt: string) => `✨ Generated Image\n\nPrompt: ${prompt}`,
};

/** callback_query replies (main keyboard buttons) — note they differ slightly from the commands */
export const CALLBACK_REPLIES: Record<string, string> = {
  generate: "Send a clear image prompt. For example:\n\nA red fox in a snowy forest, cinematic lighting",
  examples:
    "Prompt examples:\n\n• A cyberpunk city at night, neon rain\n• A watercolor fox in a forest\n• A modern glass house in the mountains\n• A friendly dragon reading a book",
  help:
    "Send any normal text message to generate an image. Prompts are limited to 500 characters.\n\nCommands:\n/start — welcome and options\n/generate — prompt instructions\n/examples — prompt ideas\n/status — service status\n/help — usage help\n/about — project information\n/website — open the website\n/support — support information",
  status: "Image is Here is connected to Telegram and Vercel. Send /generate or enter a prompt to test image generation.",
  about: REPLIES.about,
};

export const CALLBACK_TOAST = "Opening option...";

export const MAIN_KEYBOARD: ChatButton[][] = [
  [{ label: "Generate", callback: "generate" }, { label: "Examples", callback: "examples" }],
  [{ label: "Help", callback: "help" }, { label: "About", callback: "about" }],
  [{ label: "Status", callback: "status" }, { label: "Website", url: "https://imageishere.vercel.app/" }],
];

export const WEBSITE_KEYBOARD: ChatButton[][] = [[{ label: "Open website", url: "https://imageishere.vercel.app/" }]];

/** commands registered through setMyCommands (what Telegram's Menu shows) */
export const MENU_COMMANDS = [
  { command: "start", description: "Start the bot and show options" },
  { command: "generate", description: "Get image-generation instructions" },
  { command: "examples", description: "Show useful prompt examples" },
  { command: "help", description: "Show usage and troubleshooting help" },
  { command: "status", description: "Check bot service status" },
  { command: "about", description: "Show developer and project information" },
  { command: "website", description: "Open the public Image is Here website" },
  { command: "support", description: "Get project support information" },
];

/* ---------------- Perchance-aligned renderer — Flux + t2i-styles + ratios ---------------- */

export function fallbackSeed(prompt: string, nonce = 0): number {
  const base = Array.from(prompt).reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0,
    2166136261
  );
  return Math.abs((base + nonce * 2654435761) >>> 0) % 1000000;
}

export type GenerateOptions = {
  styleId?: StyleId;
  ratioId?: RatioId;
  nonce?: number;
};

export function fallbackImageUrl(prompt: string, opts: GenerateOptions = {}): string {
  const cleanPrompt = prompt.trim().slice(0, BOT.promptLimit);
  const styleId = opts.styleId ?? DEFAULT_STYLE;
  const ratio = getRatioPreset(opts.ratioId ?? DEFAULT_RATIO);
  const seed = fallbackSeed(cleanPrompt, opts.nonce ?? 0);
  const wrapped = formatPerchancePrompt(cleanPrompt, styleId);
  const encodedPrompt = encodeURIComponent(wrapped);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${ratio.width}&height=${ratio.height}&model=flux&enhance=false&nologo=true&n=1&seed=${seed}`;
}

/* ---------------- message routing — mirrors the handler's order ---------------- */

export type BotAction =
  | { type: "reply"; messages: ChatMsg[]; delayMs: number }
  | { type: "generate"; prompt: string }
  | { type: "ignored"; note: string };

const command = (name: string) => new RegExp(`^\\/${name}(?:@[^\\s]+)?$`, "i");

export function handleText(raw: string): BotAction {
  const text = raw.trim();
  const reply = (body: string, keyboard?: ChatButton[][]): BotAction => ({
    type: "reply",
    delayMs: 420 + Math.round(Math.random() * 260),
    messages: [botMsg({ kind: "text", text: body, keyboard })],
  });

  if (command("start").test(text)) return reply(REPLIES.start, MAIN_KEYBOARD);
  if (command("help").test(text)) return reply(REPLIES.help, MAIN_KEYBOARD);
  if (command("about").test(text)) return reply(REPLIES.about);
  if (command("generate").test(text)) return reply(REPLIES.generate, MAIN_KEYBOARD);
  if (command("examples").test(text)) return reply(REPLIES.examples, MAIN_KEYBOARD);
  if (command("status").test(text)) return reply(REPLIES.status, MAIN_KEYBOARD);
  if (command("website").test(text)) return reply(REPLIES.website, WEBSITE_KEYBOARD);
  if (command("support").test(text)) return reply(REPLIES.support, MAIN_KEYBOARD);
  if (command("cancel").test(text)) return reply(REPLIES.cancel, MAIN_KEYBOARD);

  if (!text || text.startsWith("/")) {
    const first = text.split(/\s+/)[0] || "Empty message";
    return {
      type: "ignored",
      note: `${first} was ignored. The bot only answers its own commands and plain-text prompts.`,
    };
  }

  if (text.length > BOT.promptLimit) return reply(REPLIES.tooLong);

  return { type: "generate", prompt: text };
}

export function handleCallback(data: string): ChatMsg[] {
  const body = CALLBACK_REPLIES[data];
  if (!body) return [];
  return [botMsg({ kind: "text", text: body, keyboard: MAIN_KEYBOARD })];
}

/* ---------------- inline mode — port of buildInlineResults() ---------------- */

export type InlineResult = {
  id: string;
  title: string;
  description: string;
  messageText: string;
  button: ChatButton;
};

export function buildInlineResults(prompt: string): InlineResult[] {
  const cleanPrompt = (prompt || "").trim().slice(0, 500);
  if (!cleanPrompt) {
    return [
      {
        id: "imageishere-instructions",
        title: "Describe an image for Image is Here",
        description: "Enter a subject, setting, style, and lighting.",
        messageText: "Open @imageishere_bot and send a description to generate an image.",
        button: { label: "Open Image is Here", url: "https://t.me/imageishere_bot?start=inline" },
      },
    ];
  }
  return [
    {
      id: "generate",
      title: "Generate this image",
      description: cleanPrompt,
      messageText: `Create an image with this prompt:\n\n${cleanPrompt}`,
      button: {
        label: "Generate in Image is Here",
        url: `https://t.me/imageishere_bot?start=inline_${encodeURIComponent(cleanPrompt.slice(0, 48)).replace(/%/g, "")}`,
      },
    },
  ];
}
