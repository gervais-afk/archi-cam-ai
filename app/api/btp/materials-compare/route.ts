import { NextResponse } from "next/server";
import { deductCredits } from "@/lib/credits/credit-manager";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { city = "Yaoundé", materialQuery = "Ciment CPJ 42.5", userId = "demo-user" } = body;

    // Déduction de 1 crédit pour le comparateur de matériaux
    const creditCheck = await deductCredits(userId, "BTP_ESTIMATE");
    if (!creditCheck.success) {
      return NextResponse.json({ error: creditCheck.error, code: "PAYMENT_REQUIRED" }, { status: 402 });
    }

    const comparisonData = {
      city,
      query: materialQuery,
      updated_at: new Date().toISOString(),
      suppliers: [
        {
          name: "Cimencam / LafargeHolcim",
          price_unit_xaf: city === "Douala" ? 4600 : 4900,
          unit: "Sac 50kg",
          availability: "EN_STOCK",
          bulk_discount_percentage: 5,
        },
        {
          name: "Dangote Cement Cameroun",
          price_unit_xaf: city === "Douala" ? 4500 : 4850,
          unit: "Sac 50kg",
          availability: "EN_STOCK",
          bulk_discount_percentage: 6,
        },
        {
          name: "Mira Cement",
          price_unit_xaf: city === "Douala" ? 4400 : 4750,
          unit: "Sac 50kg",
          availability: "STOCK_LIMITÉ",
          bulk_discount_percentage: 8,
        },
      ],
      buying_group_savings_estimate_xaf: 185000,
      recommendation: "Acheter par palette complète (40 sacs) pour bénéficier d'une remise d'usine de 6%.",
    };

    return NextResponse.json(comparisonData);
  } catch (error: any) {
    console.error("Erreur /api/btp/materials-compare :", error);
    return NextResponse.json({ error: "Erreur comparateur matériaux." }, { status: 500 });
  }
}
