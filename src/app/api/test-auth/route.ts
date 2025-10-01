// Test endpoint to check if authentication is working
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        authenticated: false, 
        message: "No session found" 
      });
    }
    
    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      message: "Authentication working!" 
    });
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Authentication error" 
    }, { status: 500 });
  }
}
