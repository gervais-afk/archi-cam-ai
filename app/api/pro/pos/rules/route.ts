import { POSRulesEngine } from "@/lib/geo/pos-rules-engine";

export async function POST(req: Request) {
  try {
    const { coords } = await req.json();

    if (!coords || coords.lat === undefined || coords.lng === undefined) {
      return Response.json({ error: "Missing lat or lng in coords" }, { status: 400 });
    }

    const engine = new POSRulesEngine();
    const rules = await engine.getRulesForLocation(coords);

    return Response.json({ success: true, rules });
  } catch (err: any) {
    console.error("[API POS Rules] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
