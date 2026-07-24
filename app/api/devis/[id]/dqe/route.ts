import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyFirebaseToken } from "@/lib/firebase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const firebaseToken = req.cookies.get("firebaseToken")?.value;
    const user = await verifyFirebaseToken(firebaseToken || "");
    const isDev = process.env.NODE_ENV === 'development';

    if (!user && !isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing projet ID" }, { status: 400 });
    }

    // Interrogation de la vue analytique locale PostgreSQL
    const dbResult = await query(
      `SELECT * FROM v_dqe_lod400 
       WHERE projet_id = $1 
       ORDER BY niveau_spatial ASC, element_constructif ASC`,
      [id]
    );

    return NextResponse.json(dbResult.rows);
  } catch (error: any) {
    console.error("[DQE API] Error fetching DQE LOD 400:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
