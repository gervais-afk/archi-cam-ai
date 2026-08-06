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
  console.log("🚀 Starting Versioning & Feedback integration test...");

  // 1. Appeler l'API de test de versioning qui gère les insertions de versions et les rollbacks
  console.log("Running versioning and rollback operations...");
  const versioningTest = await requestJSON({
    hostname: "127.0.0.1",
    port: 3001,
    path: "/api/admin/test-versioning",
    method: "GET"
  });

  console.log(`📊 Réponse API versioning :`, JSON.stringify(versioningTest.body, null, 2));

  if (!versioningTest.body || !versioningTest.body.success) {
    throw new Error("Versioning test endpoint failed");
  }

  const { projectId } = versioningTest.body;

  // 2. Envoyer une notation de feedback via l'API POST
  console.log("\nSubmitting user rating feedback...");
  const feedbackResponse = await requestJSON({
    hostname: "127.0.0.1",
    port: 3001,
    path: `/api/feedback/render`,
    method: "POST"
  }, {
    projectId,
    renderId: "dummy_render_id",
    rating: 2,
    feedback: "Les murs sont trop épais",
    metadata: { issues: ["geometry"] }
  });
  console.log(`💭 Réponse Feedback API POST :`, JSON.stringify(feedbackResponse.body, null, 2));

  console.log("\n🏆 Versioning & Feedback integration tests completed successfully!");
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
