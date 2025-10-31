// Test endpoint to isolate the issue
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.error("🔵 [TEST] Simple GET endpoint hit");
    return NextResponse.json({ ok: true, message: "Test endpoint works" });
  } catch (error) {
    console.error("🔴 [TEST] Error:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.error("========================================");
    console.error("🔵 [TEST] POST endpoint hit");
    console.error("🔵 [TEST] Step 1: Parse body...");
    
    const body = await req.json();
    console.error("🟢 [TEST] Body parsed:", body);
    
    console.error("🔵 [TEST] Step 2: Import Prisma...");
    const { prisma } = await import("@/server/db");
    console.error("🟢 [TEST] Prisma imported");
    
    console.error("🔵 [TEST] Step 3: Test DB connection...");
    await prisma.$queryRaw`SELECT 1`;
    console.error("🟢 [TEST] DB connection works");
    
    console.error("🔵 [TEST] Step 4: Import requireRole...");
    const { requireRole } = await import("@/lib/rbac");
    console.error("🟢 [TEST] requireRole imported");
    
    console.error("🔵 [TEST] Step 5: Check permissions...");
    const userInfo = await requireRole(["ADMIN", "MASTER_ADMIN", "WEBSITE_CREATOR"]);
    console.error("🟢 [TEST] Permissions OK:", userInfo);
    
    console.error("========================================");
    return NextResponse.json({ 
      ok: true, 
      message: "All tests passed",
      userInfo 
    });
  } catch (error) {
    console.error("========================================");
    console.error("🔴 [TEST] Error caught:", error);
    if (error instanceof Error) {
      console.error("🔴 [TEST] Error message:", error.message);
      console.error("🔴 [TEST] Error stack:", error.stack);
    }
    console.error("========================================");
    return NextResponse.json({ 
      error: "Test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
