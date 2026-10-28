import { getAuth } from "@/lib/auth/provider";
import { initializeServer } from "@/lib/server-init";

export async function GET(request: Request) {
  await initializeServer();
  return getAuth().handler(request);
}

export async function POST(request: Request) {
  await initializeServer();
  return getAuth().handler(request);
}
