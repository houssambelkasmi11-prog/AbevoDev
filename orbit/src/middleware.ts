import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase mode: refreshes the auth session cookie on every request so Server
 * Components always see a valid session. Local mode: a cheap cookie presence
 * check for /app (the real verification happens server-side).
 */
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const mode = process.env.ORBIT_BACKEND ?? (url && key ? "supabase" : "local");

  if (mode !== "supabase" || !url || !key) {
    if (req.nextUrl.pathname.startsWith("/app") && !req.cookies.get("orbit_session")) {
      const to = req.nextUrl.clone();
      to.pathname = "/sign-in";
      to.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
      return NextResponse.redirect(to);
    }
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(list) {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && req.nextUrl.pathname.startsWith("/app")) {
    const to = req.nextUrl.clone();
    to.pathname = "/sign-in";
    to.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)$).*)"],
};
