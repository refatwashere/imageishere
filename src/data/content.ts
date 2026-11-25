/* ------------------------------------------------------------------ */
/*  imageishere — central content model                                */
/*  Source of truth: github.com/refatwashere/imageishere (README,      */
/*  api/webhook.js, lib/image-generator.js, vercel.json, package.json) */
/* ------------------------------------------------------------------ */

export const BOT = {
  name: "imageishere",
  displayName: "Image is Here",
  handle: "@imageishere_bot",
  username: "imageishere_bot",
  telegramUrl: "https://t.me/imageishere_bot",
  telegramDisplay: "t.me/imageishere_bot",
  webUrl: "https://imageishere.vercel.app",
  webDisplay: "imageishere.vercel.app",
  webhookPath: "/api/webhook",
  webhookUrl: "https://imageishere.vercel.app/api/webhook",
  developer: "Robiul Islam Refat",
  githubUser: "refatwashere",
  githubProfile: "https://github.com/refatwashere",
  repoSlug: "refatwashere/imageishere",
  repoUrl: "https://github.com/refatwashere/imageishere",
  repoGit: "https://github.com/refatwashere/imageishere.git",
  repoDisplay: "github.com/refatwashere/imageishere",
  rawBase: "https://raw.githubusercontent.com/refatwashere/imageishere/main",
  avatar: "https://github.com/refatwashere.png?size=160",
  /** fallback only — the live value is read from package.json on GitHub */
  version: "1.6.3",
  shortDescription: "Create AI images directly in Telegram.",
  description:
    "Generate AI images from text prompts using Perchance and Browserless. Send a prompt or choose a command to begin.",
  promptLimit: 500,
  maxDuration: 300,
  browserlessTimeoutSec: 115,
  allowedUpdates: ["message", "callback_query", "inline_query"],
  healthResponse: '{"status":"ok","service":"Image is Here webhook"}',
  stack: ["Node.js ≥ 18", "Vercel Functions", "@vercel/functions · waitUntil", "Browserless", "Perchance", "node-telegram-bot-api", "axios"],
};

/* ---------------- Bot commands (api/webhook.js + README §Bot commands) ---------------- */

export type BotCommand = {
  cmd: string;
  /** description registered through setMyCommands (menu text) */
  menu: string;
  /** behaviour documented in README */
  behavior: string;
  category: "Core" | "Info" | "Session";
  inMenu: boolean;
  keyboard: "main" | "website" | "none";
};

export const BOT_COMMANDS: BotCommand[] = [
  { cmd: "/start", menu: "Start the bot and show options", behavior: "Sends the welcome message with prompt tips and the main keyboard.", category: "Core", inMenu: true, keyboard: "main" },
  { cmd: "/generate", menu: "Get image-generation instructions", behavior: "Explains the prompt format: subject + setting + style + lighting + camera details.", category: "Core", inMenu: true, keyboard: "main" },
  { cmd: "/examples", menu: "Show useful prompt examples", behavior: "Shows four ready-to-use prompt ideas.", category: "Core", inMenu: true, keyboard: "main" },
  { cmd: "/help", menu: "Show usage and troubleshooting help", behavior: "Sends usage instructions, including the 500-character prompt limit.", category: "Core", inMenu: true, keyboard: "main" },
  { cmd: "/status", menu: "Check bot service status", behavior: "Confirms the bot is connected to Telegram and Vercel.", category: "Info", inMenu: true, keyboard: "main" },
  { cmd: "/about", menu: "Show developer and project information", behavior: "Sends project and developer information.", category: "Info", inMenu: true, keyboard: "none" },
  { cmd: "/website", menu: "Open the public Image is Here website", behavior: "Replies with the website link and an “Open website” button.", category: "Info", inMenu: true, keyboard: "website" },
  { cmd: "/support", menu: "Get project support information", behavior: "Shows support contacts (email + GitHub).", category: "Info", inMenu: true, keyboard: "main" },
  { cmd: "/cancel", menu: "Cancel the current prompt instruction", behavior: "Confirms that no prompt session is active. Handled, but not registered in the command menu.", category: "Session", inMenu: false, keyboard: "main" },
];

/** README → BotFather /setcommands list */
export const SETCOMMANDS_SNIPPET = `start - Start the bot and show options
generate - Get image-generation instructions
examples - Show useful prompt examples
help - Show usage and troubleshooting help
status - Check bot service status
about - Show developer and project information
website - Open the public website
support - Get project support information
cancel - Cancel the current prompt instruction`;

export const BOT_DESCRIPTION_SNIPPET = "Generate AI images from text prompts using Perchance and Browserless.";

/* ---------------- Environment variables (README §Add environment variables) ---------------- */

export type EnvVar = {
  name: string;
  level: "required" | "recommended" | "optional";
  secret: boolean;
  purpose: string;
  example: string;
  defaultValue?: string;
};

export const ENV_VARS: EnvVar[] = [
  { name: "TELEGRAM_BOT_TOKEN", level: "required", secret: true, purpose: "Authenticates Telegram Bot API requests.", example: "123456789:AA…" },
  { name: "WEBHOOK_SECRET", level: "recommended", secret: true, purpose: "Validates Telegram's X-Telegram-Bot-Api-Secret-Token header. Mismatch → 403. (TELEGRAM_WEBHOOK_SECRET is accepted as an alias.)", example: "64 hex chars" },
  { name: "BROWSERLESS_KEY", level: "required", secret: true, purpose: "Authenticates Browserless requests (sent as a Bearer token).", example: "your_browserless_api_key" },
  { name: "BROWSERLESS_URL", level: "optional", secret: false, purpose: "Browserless endpoint.", example: "https://chrome.browserless.io", defaultValue: "https://chrome.browserless.io" },
  { name: "PERCHANCE_URL", level: "optional", secret: false, purpose: "Perchance generator URL.", example: "https://perchance.org/ai-text-to-image-generator", defaultValue: "https://perchance.org/ai-text-to-image-generator" },
];

export const ENV_EXAMPLE = `TELEGRAM_BOT_TOKEN=your_telegram_bot_token
WEBHOOK_SECRET=choose_a_long_random_secret
BROWSERLESS_KEY=your_browserless_api_key
BROWSERLESS_URL=https://chrome.browserless.io
PERCHANCE_URL=https://perchance.org/ai-text-to-image-generator`;

/* ---------------- Project structure (README §Project Structure) ---------------- */

export type TreeNode = {
  name: string;
  type: "dir" | "file";
  note?: string;
  desc?: string;
  preview?: boolean;
  children?: TreeNode[];
};

export const FILE_TREE: TreeNode[] = [
  {
    name: "api", type: "dir", note: "Vercel functions",
    children: [
      { name: "webhook.js", type: "file", note: "Vercel Telegram webhook handler", desc: "GET returns the health JSON. POST checks the secret_token header (403 on mismatch), then routes commands, callback queries and inline queries. Prompts go to the generator inside waitUntil, so Telegram gets an immediate 200." },
    ],
  },
  {
    name: "lib", type: "dir", note: "shared integration",
    children: [
      { name: "image-generator.js", type: "file", note: "Shared Browserless/Perchance integration", desc: "Runs a stealth headless-Chrome function on Browserless that fills Perchance's prompt box, clicks Generate and returns the image source. If Browserless fails, it falls back to a deterministic Pollinations URL." },
    ],
  },
  {
    name: "test", type: "dir", note: "node:test",
    children: [
      { name: "webhook.test.js", type: "file", note: "Webhook behavior tests", desc: "Tests the webhook with node:test and node:assert against a mocked response object. For example, it checks that the GET health check returns the service status." },
    ],
  },
  { name: "bot.js", type: "file", note: "Optional local polling mode", desc: "Local polling mode built on node-telegram-bot-api. Start it with npm start, and never run it while a webhook is active." },
  { name: ".env.example", type: "file", note: "Public environment variable template", desc: "Public template for the environment variables. Copy it to .env and fill in your own secrets." },
  { name: ".gitignore", type: "file", note: "Secret and generated-file exclusions", desc: "Keeps secrets and generated files out of git." },
  { name: "package.json", type: "file", note: "Scripts and dependencies", desc: "Defines the scripts start, dev, check, test and vercel:dev. Dependencies: @vercel/functions, axios, dotenv, node-telegram-bot-api." },
  { name: "package-lock.json", type: "file", note: "Reproducible dependency versions", desc: "Lockfile that pins exact dependency versions so installs are reproducible.", preview: false },
  { name: "vercel.json", type: "file", note: "Vercel function configuration", desc: "Vercel function configuration. Sets maxDuration to 300 seconds for api/webhook.js." },
  { name: "README.md", type: "file", note: "Deployment and operation guide", desc: "The full guide to deploying and operating the bot. This console is built from it." },
];

/* ---------------- Troubleshooting (README §Troubleshooting) ---------------- */

export type Trouble = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  symptom: string;
  causes: string[];
  fix: string[];
};

export const TROUBLESHOOTING: Trouble[] = [
  {
    id: "403",
    severity: "critical",
    title: "403 Forbidden",
    symptom: "getWebhookInfo shows a 403 in last_error_message, and updates pile up because the handler rejects every POST.",
    causes: [
      "WEBHOOK_SECRET differs from the secret_token registered with Telegram",
      "Vercel has not redeployed after a secret change",
      "The Telegram request header is missing",
    ],
    fix: [
      "Confirm the Vercel variable exactly matches the registered secret",
      "Redeploy production",
      "Register the webhook again",
      "Send another /start update",
    ],
  },
  {
    id: "404",
    severity: "critical",
    title: "404 from the webhook URL",
    symptom: "Telegram can't reach the handler. Opening the webhook URL in a browser doesn't return the health JSON.",
    causes: ["Incorrect Vercel domain", "Incorrect route path", "File is not named or located under api/"],
    fix: [
      "Use https://<domain>/api/webhook. A healthy route answers GET with {\"status\":\"ok\",\"service\":\"Image is Here webhook\"}",
      "Confirm api/webhook.js exists",
      "Confirm Vercel deployed the latest commit",
    ],
  },
  {
    id: "env",
    severity: "critical",
    title: "Missing required environment variables",
    symptom: "Logs show “Missing required environment variables”, the handler returns 500, and the bot replies “Bot configuration is incomplete. Please try again later.”",
    causes: ["TELEGRAM_BOT_TOKEN or BROWSERLESS_KEY isn't set for the Production environment", "The variables were added after the last deployment"],
    fix: ["Add TELEGRAM_BOT_TOKEN and BROWSERLESS_KEY to Vercel", "Redeploy. Environment variables only apply to new deployments"],
  },
  {
    id: "browserless",
    severity: "warning",
    title: "Browserless fails or times out",
    symptom: "Logs show “Browserless generation failed; using fallback”. The bot still replies, but with the Pollinations fallback image.",
    causes: ["Browserless account status or quota", "Wrong BROWSERLESS_KEY", "Wrong BROWSERLESS_URL", "Perchance availability", "Vercel function duration"],
    fix: [
      "Check the Browserless account status and quota",
      "Verify BROWSERLESS_KEY and BROWSERLESS_URL",
      "Check that Perchance is available",
      "Check the Browserless response logs. The function runs with timeout=115000 and stealth=true",
      "Check the function duration. vercel.json allows maxDuration 300 s for api/webhook.js",
    ],
  },
  {
    id: "silent",
    severity: "warning",
    title: "Telegram sends no message",
    symptom: "Messages reach the bot but nothing comes back.",
    causes: [
      "Unknown /commands are ignored by design (e.g. /imagine gets no reply)",
      "The update isn't a supported message",
      "The bot was blocked by the Telegram user",
      "Bot privacy settings in groups",
    ],
    fix: ["Check getWebhookInfo", "Check Vercel Runtime Logs", "Check bot privacy settings", "Check the Telegram bot token"],
  },
  {
    id: "image",
    severity: "warning",
    title: "Image URL is invalid",
    symptom: "Logs show “No image source found”, “No Generate button found” or “Perchance generator frame not found”.",
    causes: ["Browserless selectors changed", "Perchance changed its UI structure"],
    fix: ["Update lib/image-generator.js", "Redeploy"],
  },
  {
    id: "pending",
    severity: "critical",
    title: "Updates repeat or remain pending",
    symptom: "pending_update_count keeps growing, or the same prompt gets answered more than once.",
    causes: ["Repeated errors in the handler", "Slow webhook responses make Telegram retry", "Environment or external service errors"],
    fix: [
      "Check Vercel logs for repeated errors",
      "Confirm the webhook responds quickly (the handler returns 200 \"accepted\" and keeps working in waitUntil)",
      "Fix the environment or external service error",
      "Register with drop_pending_updates=true to clear stale updates",
    ],
  },
];
