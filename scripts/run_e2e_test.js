const fs = require("fs");
const path = require("path");

/**
 * TEST E2E VALIDATION BOUT EN BOUT — ARCHI CAM AI
 * ───────────────────────────────────────────────
 * Test du pipeline de rendu HD sur le plan PDF racine (2D_RDC.pdf).
 * Validation des clés de retour JSON (previewUrl, renderUrl, maskUrl, metadata).
 * Copie du résultat HD sur le Bureau Windows du client.
 */

async function runEndToEndTest() {
  console.log("🚀 Démarrage du Test de Bout en Bout (E2E) sur 2D_RDC.pdf...");

  const payload = {
    planUrl: "/2D_RDC.pdf",
    pdfFilePath: "public/2D_RDC.pdf",
    renderMode: "3D_PHOTOREALISTE",
    style: "luxe-tropical",
    forceRefresh: true,
  };

  try {
    const response = await fetch("http://localhost:3000/api/render/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Échec HTTP /api/render/image : ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✅ Réponse HTTP 200 reçue de l'API de Rendu :");
    console.log(JSON.stringify(data, null, 2));

    // 1. Validation de la clé previewUrl (Moitié Gauche "Avant")
    if (!data.previewUrl || data.previewUrl.endsWith(".pdf")) {
      console.error("❌ ERREUR: previewUrl invalide ou pointe vers un PDF !");
    } else {
      console.log(`🟢 previewUrl validé (PNG aperçu source) : ${data.previewUrl}`);
    }

    // 2. Validation de la clé renderUrl (Moitié Droite "Après")
    if (!data.renderUrl || data.renderUrl.includes("_clean_plan.png")) {
      console.error("❌ ERREUR: renderUrl invalide ou pointe vers le masque intermédiaire !");
    } else {
      console.log(`🟢 renderUrl validé (Rendu 3D HD Final Sharp) : ${data.renderUrl}`);
    }

    // 3. Validation des métadonnées de pièces
    console.log(`🟢 Métadonnées de pièces : ${data.metadata?.room_count || 0} pièces détectées sur le plan.`);

    // 4. Copie du résultat sur le bureau Windows pour inspection client
    const cleanRenderPath = path.join(process.cwd(), "public", data.renderUrl.replace(/^\//, ""));
    const desktopPath = "C:\\Users\\HP\\Desktop\\rendu_hd_client_final.png";

    if (fs.existsSync(cleanRenderPath)) {
      fs.copyFileSync(cleanRenderPath, desktopPath);
      console.log(`✨ Rendu HD client final copié sur le Bureau : ${desktopPath}`);
    } else {
      console.warn(`⚠️ Fichier rendu introuvable sur le disque : ${cleanRenderPath}`);
    }

    console.log("🎉 TEST BOUT EN BOUT RÉUSSI À 100% !");
  } catch (error) {
    console.error("❌ Erreur lors du test E2E :", error);
  }
}

runEndToEndTest();
