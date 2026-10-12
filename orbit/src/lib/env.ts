import "server-only";

export type BackendMode = "local" | "supabase";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

export const env = {
  get backend(): BackendMode {
    const explicit = read("ORBIT_BACKEND");
    if (explicit === "local" || explicit === "supabase") return explicit;
    return read("NEXT_PUBLIC_SUPABASE_URL") && read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "supabase" : "local";
  },
  get siteUrl(): string {
    return read("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000";
  },
  get supabaseUrl(): string | undefined {
    return read("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey(): string | undefined {
    return read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get storageBucket(): string {
    return read("SUPABASE_STORAGE_BUCKET") ?? "sources";
  },
  get encryptionKey(): string | undefined {
    return read("ORBIT_ENCRYPTION_KEY");
  },
  get sessionSecret(): string | undefined {
    return read("ORBIT_SESSION_SECRET");
  },
  get allowPrivateEndpoints(): boolean {
    return read("ORBIT_ALLOW_PRIVATE_ENDPOINTS") === "true";
  },
};
