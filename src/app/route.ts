export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    name: "KYANE POS",
    status: "ok",
    description: "Backend API untuk aplikasi POS Cuci Steam.",
    health: "/api/health",
  });
}
