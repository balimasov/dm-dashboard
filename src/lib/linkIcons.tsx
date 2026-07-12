import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<{ className?: string }>;

/** A generic page with a folded top-right corner — the shared base shape for the three Google Docs-family icons below, which only differ in what's drawn inside it. */
function DocPage({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <path
        d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3.5v4h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {children}
    </>
  );
}

function DocsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <DocPage>
        <path d="M8 13h8M8 16h8M8 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </DocPage>
    </svg>
  );
}

function SheetsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <DocPage>
        <path
          d="M8 10h8v8H8v-8Zm0 2.7h8M8 15.3h8m-5.3-2.6v5.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </DocPage>
    </svg>
  );
}

function SlidesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <DocPage>
        <rect x="8" y="10.5" width="8" height="6" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M11 12v3l3-1.5-3-1.5Z" fill="currentColor" />
      </DocPage>
    </svg>
  );
}

/** Google Drive's mark, reduced to its core triangle. */
function DriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9 3h6l7 12-3 5H5l-3-5Zm1.7 2 5.6 9.7h3L14 5Zm-3.6 1L2.9 15l1.5 2.6L9.1 9Z" />
    </svg>
  );
}

/** Simplified monogram — a rounded square with a bold "N", standing in for Notion's actual wordmark tile. */
function NotionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 8v8M8.5 8l7 8M15.5 8v8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** An open notebook with a small spark above it, for the "LM" (language model) half of NotebookLM. */
function NotebookLMIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M3.5 6.5c2.4-1 5-1 7 .3v11c-2-1.3-4.6-1.3-7-.3v-11Zm17 0c-2.4-1-5-1-7 .3v11c2-1.3 4.6-1.3 7-.3v-11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M17.5 2.5 18.6 5l2.4.6-2.4.6-1.1 2.3-1.1-2.3-2.4-.6 2.4-.6Z" fill="currentColor" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2.5" y="6" width="19" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 9.5v5l4.5-2.5Z" />
    </svg>
  );
}

/** A rounded blob with two "eye" notches — the friendly-mascot silhouette Discord's own mark is loosely based on. */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M6 8.5c1-1.3 2.6-2 6-2s5 .7 6 2c1 1.4 1.5 4 1.3 7.3-1.5 1.1-3 1.7-4.4 2l-.7-1.4c.7-.2 1.3-.5 1.9-.9-.5.3-1.1.6-1.8.8-1.5.4-3.2.4-4.6 0-.7-.2-1.3-.5-1.8-.8.6.4 1.2.7 1.9.9L9.1 17.8c-1.4-.3-2.9-.9-4.4-2C4.5 12.5 5 9.9 6 8.5Z"
        fill="currentColor"
      />
      <circle cx="9.5" cy="13" r="1.2" fill="#0f172a" />
      <circle cx="14.5" cy="13" r="1.2" fill="#0f172a" />
    </svg>
  );
}

/** A rounded head silhouette with two ear points — a cat-shaped stand-in for the octocat mark. */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3c-5 0-9 4-9 9 0 4 2.6 7.4 6.2 8.6.4.1.6-.2.6-.4v-1.7c-2.5.5-3-1.1-3-1.1-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.4.9 1.4.9.8 1.4 2.2 1 2.7.7.1-.6.3-1 .6-1.2-2-.2-4.1-1-4.1-4.4 0-1 .3-1.7.9-2.4-.1-.2-.4-1.1.1-2.4 0 0 .8-.2 2.5 1a8.6 8.6 0 0 1 4.5 0c1.7-1.2 2.5-1 2.5-1 .5 1.3.2 2.2.1 2.4.6.7.9 1.5.9 2.4 0 3.4-2.1 4.2-4.1 4.4.3.3.6.8.6 1.7v2.5c0 .2.2.5.6.4A9 9 0 0 0 21 12c0-5-4-9-9-9Z" />
    </svg>
  );
}

/** Two overlapping diamonds — the "open box" shape Dropbox's own logo builds on. */
function DropboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 4 2.5 7.3 7 10.6 11.5 7.3 7 4Zm10 0-4.5 3.3 4.5 3.3 4.5-3.3L17 4ZM7 11.4l-4.5 3.3L7 18l4.5-3.3L7 11.4Zm10 0-4.5 3.3L17 18l4.5-3.3-4.5-3.3ZM9.2 19.6 12 21.5l2.8-1.9-2.8-2-2.8 2Z" />
    </svg>
  );
}

/** Figma's mark simplified to its three stacked circles. */
function FigmaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="7" r="3" />
      <circle cx="12" cy="14" r="3" opacity="0.65" />
      <circle cx="12" cy="20" r="2.2" opacity="0.4" />
    </svg>
  );
}

/** A loose swirl, standing in for Miro's abstract mark. */
function MiroIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        d="M12 3.5c4.7 0 8.5 3.6 8.5 8s-3.8 8-8.5 8c-3.4 0-6.3-1.9-7.6-4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 13.5 3 17l3.6-.8Z" fill="currentColor" />
    </svg>
  );
}

/** A board with two lists — Trello's own mark, reduced to its shapes. */
function TrelloIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5.8" y="6.8" width="4.8" height="7.5" rx="0.8" fill="currentColor" />
      <rect x="13.4" y="6.8" width="4.8" height="4.8" rx="0.8" fill="currentColor" />
    </svg>
  );
}

function OneDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8.5 17a4 4 0 0 1-1.2-7.8 5.5 5.5 0 0 1 10.6-1.7A4.3 4.3 0 0 1 20 15.5a1 1 0 0 1-1 1H8.5Z" />
    </svg>
  );
}

/** Fallback trigger + default row icon — a plain chain link. */
export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...props}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.6 4.9a3.5 3.5 0 0 1 5 5L16 11.5" />
      <path d="M13 17.5 11.4 19.1a3.5 3.5 0 0 1-5-5L8 12.5" />
    </svg>
  );
}

interface RegistryEntry {
  name: string;
  match: (host: string, path: string) => boolean;
  Icon: IconComponent;
  colorClass: string;
}

const REGISTRY: RegistryEntry[] = [
  { name: "Google Docs", match: (h, p) => h === "docs.google.com" && p.includes("/document"), Icon: DocsIcon, colorClass: "text-blue-400" },
  { name: "Google Sheets", match: (h, p) => h === "docs.google.com" && p.includes("/spreadsheets"), Icon: SheetsIcon, colorClass: "text-green-400" },
  { name: "Google Slides", match: (h, p) => h === "docs.google.com" && p.includes("/presentation"), Icon: SlidesIcon, colorClass: "text-amber-400" },
  { name: "NotebookLM", match: (h) => h === "notebooklm.google.com", Icon: NotebookLMIcon, colorClass: "text-purple-400" },
  { name: "Google Drive", match: (h) => h === "drive.google.com", Icon: DriveIcon, colorClass: "text-yellow-500" },
  { name: "Notion", match: (h) => h === "notion.so" || h.endsWith(".notion.so") || h === "notion.site" || h.endsWith(".notion.site"), Icon: NotionIcon, colorClass: "text-slate-100" },
  { name: "YouTube", match: (h) => h === "youtube.com" || h === "youtu.be" || h.endsWith(".youtube.com"), Icon: YouTubeIcon, colorClass: "text-red-500" },
  { name: "Discord", match: (h) => h === "discord.com" || h === "discord.gg" || h.endsWith(".discord.com"), Icon: DiscordIcon, colorClass: "text-indigo-400" },
  { name: "GitHub", match: (h) => h === "github.com" || h.endsWith(".github.com"), Icon: GitHubIcon, colorClass: "text-slate-300" },
  { name: "Dropbox", match: (h) => h === "dropbox.com" || h.endsWith(".dropbox.com"), Icon: DropboxIcon, colorClass: "text-sky-400" },
  { name: "Figma", match: (h) => h === "figma.com" || h.endsWith(".figma.com"), Icon: FigmaIcon, colorClass: "text-pink-400" },
  { name: "Miro", match: (h) => h === "miro.com" || h.endsWith(".miro.com"), Icon: MiroIcon, colorClass: "text-fuchsia-400" },
  { name: "Trello", match: (h) => h === "trello.com" || h.endsWith(".trello.com"), Icon: TrelloIcon, colorClass: "text-cyan-400" },
  {
    name: "OneDrive",
    match: (h) => h.endsWith("sharepoint.com") || h === "1drv.ms" || h.endsWith("onedrive.live.com"),
    Icon: OneDriveIcon,
    colorClass: "text-blue-300",
  },
];

/** Stable per-domain hues (not per-position, unlike `CONDITION_HUES` on `StatusRail`) — an unrecognized link should always land on the same color, since its identity is the domain itself, not where it happens to sit in the list. */
function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) % 360;
  return hash;
}

function abbreviate(host: string): string {
  const label = host.replace(/^www\./, "").split(".")[0] || "?";
  return label.slice(0, 2).toUpperCase();
}

export type LinkVisual =
  | { kind: "known"; name: string; Icon: IconComponent; colorClass: string }
  | { kind: "fallback"; abbr: string; hue: number };

/** Never throws — an unparsable URL just falls back to a "??" badge rather than blowing up the row it's rendered in. */
export function getLinkVisual(rawUrl: string): LinkVisual {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const entry = REGISTRY.find((e) => e.match(host, url.pathname));
    if (entry) return { kind: "known", name: entry.name, Icon: entry.Icon, colorClass: entry.colorClass };
    return { kind: "fallback", abbr: abbreviate(host), hue: hashHue(host) };
  } catch {
    return { kind: "fallback", abbr: "??", hue: 0 };
  }
}
