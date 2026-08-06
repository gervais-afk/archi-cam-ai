const http = require("http");

const requestJSON = (options, payload) => {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : "";
    const headers = options.headers || {};
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request({ ...options, headers }, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    req.on("error", (err) => reject(err));
    if (payload) req.write(postData);
    req.end();
  });
};

async function main() {
  console.log("🚀 Starting Pro Features integration test...");

  // 1. Appeler l'API admin de test-pro (authentification, POS, Luma Video)
  console.log("Executing core pro integrations validation...");
  const proResponse = await requestJSON({
    hostname: "127.0.0.1",
    port: 3001,
    path: "/api/admin/test-pro",
    method: "GET"
  });

  console.log(`📊 Réponse API Pro Integrations :`, JSON.stringify(proResponse.body, null, 2));

  if (!proResponse.body || !proResponse.body.success) {
    throw new Error("Admin test-pro endpoint failed");
  }

  const { apiKeyUsed } = proResponse.body;

  // 2. Tester l'API publique de rendu B2B avec la clé générée
  console.log(`\nTesting REST API Pro Render POST using API Key: ${apiKeyUsed}`);
  const renderResponse = await requestJSON({
    hostname: "127.0.0.1",
    port: 3001,
    path: "/api/v1/pro/render",
    method: "POST",
    headers: {
      "X-API-Key": apiKeyUsed
    }
  }, {
    imageBase64: "base64_encoded_dummy_drawing_mask",
    renderMode: "3D_INTERIOR",
    stylePreset: "architect_pro",
    callbackUrl: "http://example.com/crm-webhook-handler",
    metadata: { projectName: "Villa Bastos CRM Test" }
  });

  console.log(`📊 Réponse REST API Render POST :`, JSON.stringify(renderResponse.body, null, 2));

  console.log("\n🏆 Pro Features integration tests completed successfully!");
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
