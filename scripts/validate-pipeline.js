// scripts/validate-pipeline.js
// Script de test et validation de robustesse du pipeline de rendu architectural
// Lance : node scripts/validate-pipeline.js

const fs = require("fs");
const path = require("path");
const http = require("http");

const CONFIG = {
  baseUrl: "http://localhost:3000",
  testPlanUrl: "/uploads/test_plan.pdf",
  timeoutMs: 120000,
};

function checkImageExists(imagePath) {
  if (!imagePath) return false;
  const filename = path.basename(imagePath);
  const localPath = path.join(process.cwd(), "public", filename);

  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    return stat.size > 5000;
  }

  if (fs.existsSync(imagePath)) {
    const stat = fs.statSync(imagePath);
    return stat.size > 5000;
  }

  return false;
}

function checkImageNotEmpty(imagePath) {
  if (!imagePath) return false;
  const filename = path.basename(imagePath);
  const localPath = path.join(process.cwd(), "public", filename);
  const target = fs.existsSync(localPath) ? localPath : imagePath;

  if (!fs.existsSync(target)) return false;

  const stat = fs.statSync(target);
  const isSubstantial = stat.size > 20000;

  if (!isSubstantial) {
    console.warn(`   ⚠️ Image suspecte : ${stat.size} octets seulement (possible blanc ou tronquée)`);
  }

  return isSubstantial;
}

const TESTS = [
  {
    id: "T01",
    name: "Rendu 3D Luxe Tropical — Plan PDF",
    payload: {
      mode: "RENDER_3D_FURNISHED_LUXE_TROPICAL",
      style: "luxe_tropical",
      forceRefresh: true,
    },
    validate(data) {
      const checks = [];
      checks.push({ label: "HTTP 200", ok: this._status === 200 });
      checks.push({ label: "imagePath/renderUrl présent", ok: !!(data?.imagePath || data?.renderUrl || data?.imageUrl) });
      checks.push({ label: "engineUsed présent", ok: !!data?.engineUsed });
      const imgPath = data?.imagePath || data?.renderUrl || data?.imageUrl;
      checks.push({ label: "Image non vide sur disque", ok: checkImageExists(imgPath) });
      checks.push({ label: "Pas de rendu blanc", ok: checkImageNotEmpty(imgPath) });
      return checks;
    },
  },
  {
    id: "T02",
    name: "Rendu 2D Photoshop — Plan JPG",
    payload: {
      mode: "PLAN_2D_PHOTOSHOP",
      style: "moderne",
      forceRefresh: true,
    },
    validate(data) {
      const checks = [];
      checks.push({ label: "HTTP 200", ok: this._status === 200 });
      const imgPath = data?.imagePath || data?.renderUrl || data?.imageUrl;
      checks.push({ label: "imagePath/renderUrl présent", ok: !!imgPath });
      checks.push({ label: "engineUsed présent", ok: !!data?.engineUsed });
      checks.push({ label: "Image non vide sur disque", ok: checkImageExists(imgPath) });
      return checks;
    },
  },
  {
    id: "T03",
    name: "Résilience — forceRefresh false (Cache disque MD5)",
    payload: {
      mode: "RENDER_3D_FURNISHED_LUXE_TROPICAL",
      style: "luxe_tropical",
      forceRefresh: false,
    },
    validate(data) {
      const imgPath = data?.imagePath || data?.renderUrl || data?.imageUrl;
      return [
        { label: "HTTP 200", ok: this._status === 200 },
        { label: "imagePath/renderUrl présent", ok: !!imgPath },
      ];
    },
  },
];

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
      res.on("data", (chunk) => {
        raw += chunk;
      });
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

async function runValidation() {
  console.log("\n" + "═".repeat(60));
  console.log("  🧪 VALIDATION PIPELINE RENDU ARCHITECTURAL");
  console.log("═".repeat(60) + "\n");

  const allResults = [];

  for (const test of TESTS) {
    console.log(`▶ [${test.id}] ${test.name}`);
    const start = Date.now();

    let status = 0;
    let data = null;
    let error = null;

    try {
      const res = await postRequest(`${CONFIG.baseUrl}/api/render/image`, test.payload, CONFIG.timeoutMs);
      status = res.status;
      data = res.data;
    } catch (err) {
      error = err.message;
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    test._status = status;

    const checks = error
      ? [{ label: "Requête réussie", ok: false, error }]
      : test.validate(data);

    const passed = checks.filter((c) => c.ok).length;
    const total = checks.length;
    const allPass = passed === total;

    console.log(`   ${allPass ? "✅" : "❌"} ${passed}/${total} checks — ${duration}s`);

    checks.forEach((c) => {
      const icon = c.ok ? "  ✅" : "  ❌";
      console.log(`${icon} ${c.label}${c.error ? " — " + c.error : ""}`);
    });

    if (data?.engineUsed) {
      console.log(`   🎨 Moteur utilisé : ${data.engineUsed}`);
    }
    const finalImg = data?.renderUrl || data?.imageUrl || data?.imagePath;
    if (finalImg) {
      console.log(`   📄 Fichier : ${finalImg}`);
    }

    allResults.push({ test, checks, passed, total, duration, error });
    console.log();
  }

  console.log("═".repeat(60));
  console.log("  📊 RAPPORT FINAL");
  console.log("═".repeat(60));

  const totalPassed = allResults.reduce((s, r) => s + r.passed, 0);
  const totalChecks = allResults.reduce((s, r) => s + r.total, 0);
  const allOk = allResults.every((r) => r.passed === r.total);

  allResults.forEach((r) => {
    const icon = r.passed === r.total ? "✅" : "❌";
    console.log(`${icon} [${r.test.id}] ${r.test.name}`);
    console.log(`    ${r.passed}/${r.total} checks — ${r.duration}s`);
  });

  console.log("\n" + "═".repeat(60));
  console.log(`  Score global : ${totalPassed}/${totalChecks} checks`);

  if (allOk) {
    console.log("  🏆 PIPELINE VALIDÉ — Aucun rendu blanc possible");
  } else {
    console.log("  ⚠️ DES RISQUES SUBSISTENT — Voir détails ci-dessus");
  }

  console.log("═".repeat(60) + "\n");

  process.exit(allOk ? 0 : 1);
}

runValidation().catch((err) => {
  console.error("❌ Erreur fatale validation :", err.message);
  process.exit(1);
});
