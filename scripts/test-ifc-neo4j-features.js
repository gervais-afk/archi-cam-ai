const http = require("http");

const requestGET = (url) => {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    }).on("error", (err) => reject(err));
  });
};

async function main() {
  console.log("🚀 Starting IFC & Neo4j Integration Test...");

  const res = await requestGET("http://127.0.0.1:3001/api/admin/test-ifc-neo4j");

  console.log(`📊 Status Code : ${res.status}`);
  console.log(`📊 Réponse API :`, JSON.stringify(res.body, null, 2));

  if (res.status === 200 && res.body.success) {
    console.log("\n🏆 IFC & Neo4j integrations validated successfully!");
  } else {
    console.error("\n❌ IFC & Neo4j validation failed!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
