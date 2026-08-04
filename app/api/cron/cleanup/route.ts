import { NextResponse } from "next/server";
import { purgeExpiredCacheFiles } from "@/scripts/clean_cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = purgeExpiredCacheFiles();
    return NextResponse.json({
      success: true,
      message: "Purge du cache temporaire effectuée avec succès.",
      deletedFilesCount: result.deletedCount,
      freedSpaceMB: (result.freedSpaceBytes / (1024 * 1024)).toFixed(2),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erreur dans /api/cron/cleanup :", error);
    return NextResponse.json(
      { error: "Erreur lors de la purge automatique du cache." },
      { status: 500 }
    );
  }
}
