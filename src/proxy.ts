import { NextResponse, type NextRequest } from "next/server";

// Origin dari Expo Web / dev server di jaringan lokal. Aplikasi native tidak
// terkena CORS, tetapi web preview perlu header ini pada preflight dan response.
const DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function originFromEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .flatMap((item) => {
      try {
        return [new URL(item).origin];
      } catch {
        return [];
      }
    });
}

export function isAllowedOrigin(origin: string): boolean {
  if (DEV_ORIGIN.test(origin)) return true;
  const configured = [
    ...originFromEnv(process.env.WEB_ORIGIN),
    ...originFromEnv(process.env.BETTER_AUTH_URL),
  ];
  return configured.includes(origin);
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !isAllowedOrigin(origin)) {
    return NextResponse.next();
  }

  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(cors)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
