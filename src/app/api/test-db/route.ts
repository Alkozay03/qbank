// Test endpoint to check database tables
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    // Test each table
    const tests = [];
    
    try {
      const userCount = await prisma.user.count();
      tests.push({ table: 'User', count: userCount, status: 'OK' });
    } catch (error) {
      tests.push({ table: 'User', error: error instanceof Error ? error.message : 'Unknown error', status: 'ERROR' });
    }
    
    try {
      const notificationCount = await prisma.notification.count();
      tests.push({ table: 'Notification', count: notificationCount, status: 'OK' });
    } catch (error) {
      tests.push({ table: 'Notification', error: error instanceof Error ? error.message : 'Unknown error', status: 'ERROR' });
    }
    
    try {
      const notificationReadCount = await prisma.notificationRead.count();
      tests.push({ table: 'NotificationRead', count: notificationReadCount, status: 'OK' });
    } catch (error) {
      tests.push({ table: 'NotificationRead', error: error instanceof Error ? error.message : 'Unknown error', status: 'ERROR' });
    }
    
    try {
      const questionCount = await prisma.question.count();
      tests.push({ table: 'Question', count: questionCount, status: 'OK' });
    } catch (error) {
      tests.push({ table: 'Question', error: error instanceof Error ? error.message : 'Unknown error', status: 'ERROR' });
    }
    
    return NextResponse.json({ tests });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
