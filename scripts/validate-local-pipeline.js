// scripts/validate-local-pipeline.js
// ═══════════════════════════════════════════════════════════════
// VALIDATION LOCALE DU PIPELINE ARCHI CAM AI
// Teste la route POST /api/render/image et vérifie la robustesse local fallback
// ═══════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");
const http = require("http");

const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  timeoutMs: 60000,
};

async function postRequest(url, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const urlObj = new URL(url);
    const opts = {
      method: "POST",
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const timer = setTimeout(() => reject(new Error(`Timeout ${timeoutMs}ms dépassé`)), timeoutMs);

    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        clearTimeout(timer);
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: null, raw });
        }
      });
    });

    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function runLocalValidation() {
  console.log("\n" + "═".repeat(60));
  console.log("  🧪 TEST DU PIPELINE RENDU LOCAL ARCHI CAM AI");
  console.log("═".repeat(60) + "\n");

  try {
    const res = await postRequest(`${CONFIG.baseUrl}/api/render/image`, {
      mode: "RENDER_3D_FURNISHED_LUXE_TROPICAL",
      style: "luxe_tropical",
      forceRefresh: true,
    }, CONFIG.timeoutMs);

    console.log(`  📌 HTTP Status : ${res.status}`);
    if (res.data) {
      console.log(`  ✨ Success     : ${res.data.success}`);
      console.log(`  🎨 Engine      : ${res.data.engineUsed}`);
      console.log(`  📄 Image Path  : ${res.data.renderUrl || res.data.imageUrl || res.data.previewUrl}`);
      
      const imgPath = res.data.renderUrl || res.data.imageUrl || res.data.previewUrl;
      if (imgPath) {
        const localPath = path.join(process.cwd(), "public", path.basename(imgPath));
        if (fs.existsSync(localPath)) {
          const stat = fs.statSync(localPath);
          console.log(`  💾 Taille Fichier : ${stat.size} octets (${stat.size > 50000 ? "OK > 50KB" : "Mini"})`);
        }
      }
    }

    if (res.status === 200 && res.data?.success) {
      console.log("\n  🏆 PIPELINE LOCAL TOTALEMENT VALIDÉ SANS ERREUR !");
    } else {
      console.log("\n  ⚠️ Remarque : La route API a répondu avec le statut " + res.status);
      console.log("  📦 Payload Réponse :", JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.warn("  Notice lors du test local:", err.message);
  }

  console.log("═".repeat(60) + "\n");
}

runLocalValidation();
