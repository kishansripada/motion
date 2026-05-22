// logo.dev image helper. Publishable tokens (prefixed `pk_`) are designed
// for client-side use — see https://docs.logo.dev/platform/api-keys —
// so it's safe to inline this here. If you want to swap to your own
// account, replace the token below or wire it through Vite env vars.

export const LOGO_DEV_TOKEN = "pk_TQOqpfjpSTmr85RWdZaENQ";

export type LogoOptions = {
   size?: number;
   format?: "png" | "jpg" | "webp";
   theme?: "light" | "dark" | "auto";
   retina?: boolean;
   greyscale?: boolean;
};

export function logoUrl(domain: string, options: LogoOptions = {}) {
   const params = new URLSearchParams({ token: LOGO_DEV_TOKEN });
   params.set("size", String(options.size ?? 128));
   params.set("format", options.format ?? "png");
   if (options.theme && options.theme !== "auto") params.set("theme", options.theme);
   if (options.retina ?? true) params.set("retina", "true");
   if (options.greyscale) params.set("greyscale", "true");
   return `https://img.logo.dev/${encodeURIComponent(domain)}?${params.toString()}`;
}
