// Each getter reads process.env.<LITERAL_NAME> directly (not a shared
// helper indexing by a variable name). Next.js's Edge Runtime - which
// src/proxy.ts (middleware) uses by default - only inlines env vars it
// can statically detect via literal dot-notation at build time; dynamic
// `process.env[name]` access is invisible to that analysis and silently
// resolves to undefined at the edge, even though the same code works
// fine in a normal Node.js server context. This is why middleware could
// 500 on every request in production while local `next dev` never showed
// it (Node.js has no such restriction).

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error(
      "Missing required environment variable NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill it in.",
    );
  }
  return value;
}

export function getSupabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) {
    throw new Error(
      "Missing required environment variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill it in.",
    );
  }
  return value;
}
