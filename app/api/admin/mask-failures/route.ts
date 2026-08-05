import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const failures = await prisma.maskProcessingFailure.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: failures.length,
      failures,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: msg, failures: [] },
      { status: 500 }
    );
  }
}
