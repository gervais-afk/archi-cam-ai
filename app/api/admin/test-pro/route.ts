import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { authenticateAPIKey } from "@/lib/auth/api-key";
import { POSRulesEngine } from "@/lib/geo/pos-rules-engine";
import { LumaDreamMachineClient } from "@/lib/video/luma-dream-machine";

export async function GET() {
  try {
    const userId = "test_pro_user_id";
    const apiKeyVal = "key_pro_test_" + Date.now();

    // 1. Initialiser l'utilisateur Enterprise
    await prisma.$executeRawUnsafe(
      `INSERT INTO "users" (id, email, role, credits_balance, created_at, updated_at)
       VALUES ($1, 'pro_test@example.com', 'ENTERPRISE', 500, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      userId
    );

    // 2. Initialiser la clé API
    await prisma.$executeRawUnsafe(
      `INSERT INTO "api_keys" (id, "key", "user_id", "created_at")
       VALUES ($1, $2, $3, NOW())`,
      randomUUID(),
      apiKeyVal,
      userId
    );

    // 3. Tester l'authentification par clé API
    const authenticatedUser = await authenticateAPIKey(apiKeyVal);
    if (!authenticatedUser) {
      throw new Error("Authentification par clé API échouée");
    }

    // 4. Tester le moteur de règles POS
    const geoEngine = new POSRulesEngine();
    
    // Coordonnées de Bastos (Yaoundé)
    const bastosRules = await geoEngine.getRulesForLocation({ lat: 3.891, lng: 11.512 });
    
    // Projet conforme
    const compliantReport = geoEngine.validateProject({
      parcelArea: 1000,
      buildingFootprint: 300, // 30% (limite ZR1 Bastos = 40%)
      totalFloorArea: 600, // (limite = 1000)
      height: 9, // (limite = 12m)
      floors: 2, // (limite = 2)
      setbacks: { street: 5.5, side: 3.5, rear: 4.5 } // conformes
    }, bastosRules);

    // Projet non-conforme (infractions)
    const nonCompliantReport = geoEngine.validateProject({
      parcelArea: 1000,
      buildingFootprint: 500, // 50% (limite = 40%) -> infraction
      totalFloorArea: 1200, // (limite = 1000) -> infraction
      height: 15, // (limite = 12m) -> infraction
      floors: 3, // (limite = 2) -> infraction
      setbacks: { street: 3.0, side: 2.0, rear: 3.0 } // infraction recul voirie (< 5m)
    }, bastosRules);

    // 5. Tester le client vidéo Luma
    const lumaClient = new LumaDreamMachineClient("");
    const lumaResult = await lumaClient.generateDroneVideo({
      projectId: "test_pro_video_project",
      imageUrl: "http://example.com/test_render_pro.png",
      cameraPath: "ORBIT",
      duration: 10
    });

    return Response.json({
      success: true,
      apiKeyUsed: apiKeyVal,
      authenticatedUser,
      bastosRules,
      complianceTest: {
        compliant: compliantReport.isCompliant,
        nonCompliant: nonCompliantReport.isCompliant,
        nonCompliantViolations: nonCompliantReport.violations
      },
      lumaTest: lumaResult
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
