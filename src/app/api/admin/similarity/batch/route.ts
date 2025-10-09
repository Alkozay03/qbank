import { NextResponse } from "next/server";

export const maxDuration = 10;

export async function POST(request: Request) {
  console.error("🚀🚀🚀 [BATCH-SIMPLE] Function started!");
  
  try {
    const body = await request.json();
    console.error("🚀 [BATCH-SIMPLE] Body received:", body);
    
    return NextResponse.json({
      success: true,
      message: "Simple batch endpoint works! Full implementation coming soon.",
      receivedData: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [BATCH-SIMPLE] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  console.error("🚀 [BATCH-SIMPLE] GET request received!");
  return NextResponse.json({
    test: "Batch endpoint is reachable via GET",
    timestamp: new Date().toISOString(),
  });
}
