import { NextResponse } from "next/server";
import { QualityMetricsTracker } from "@/lib/metrics/quality-tracker";

export async function GET() {
  try {
    const metrics = await QualityMetricsTracker.getSuccessRate(24);
    return NextResponse.json({
      success: true,
      timeframe: "24h",
      metrics,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        metrics: {
          maskGeneration: 100,
          ruledLinesRemoval: 100,
          renderGeneration: 100,
          metadataExtraction: 100,
          overall: 100,
          totalExecutions: 0,
        },
      },
      { status: 500 }
    );
  }
}
