// Simple API route with minimal UTF-8 content
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "TurkishIDE Project Detector API",
    status: "active"
  });
} 