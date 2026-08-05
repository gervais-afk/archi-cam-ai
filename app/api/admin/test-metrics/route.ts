import { NextResponse } from 'next/server';
import { QualityMetricsTracker } from '@/lib/metrics/quality-tracker';
import { ProcessingStage } from '@prisma/client';

export async function GET() {
  try {
    // Simuler 10 générations réussies
    for (let i = 0; i < 10; i++) {
      await QualityMetricsTracker.track({
        projectId: `test-${i}`,
        stage: ProcessingStage.MASK_GENERATION,
        success: true,
        durationMs: Math.round(1200 + Math.random() * 500),
        confidence: Math.round((0.85 + Math.random() * 0.15) * 100) / 100
      });
    }
    
    // Simuler 2 échecs
    for (let i = 0; i < 2; i++) {
      await QualityMetricsTracker.track({
        projectId: `test-fail-${i}`,
        stage: ProcessingStage.MASK_GENERATION,
        success: false,
        durationMs: 800,
        confidence: 0.45,
        fallbackUsed: true
      });
    }
    
    const successRates = await QualityMetricsTracker.getSuccessRate(24);
    
    return NextResponse.json({
      message: 'Test data created',
      successRates
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
