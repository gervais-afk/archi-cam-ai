// scripts/test-render-corrupted.js
const http = require("http");
const sharp = require("sharp");

async function main() {
  console.log("⚙️ Generating a 100x100 solid black image to simulate a corrupted mask...");
  const blackBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  }).png().toBuffer();

  const base64Image = blackBuffer.toString("base64");
  const payload = {
    imageBase64: base64Image,
    mimeType: "image/png",
    renderMode: "RENDER_3D_FURNISHED_LUXE_TROPICAL",
    style: "luxe_tropical"
  };

  const body = JSON.stringify(payload);

  const opts = {
    method: "POST",
    hostname: "127.0.0.1",
    port: 3001,
    path: "/api/render/image",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer TEST_TOKEN",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  console.log("🚀 Sending corrupted image to http://localhost:3001/api/render/image...");
  
  const req = http.request(opts, (res) => {
    let raw = "";
    res.on("data", (chunk) => { raw += chunk; });
    res.on("end", () => {
      try {
        const parsed = JSON.parse(raw);
        console.log("📌 Render Response:", JSON.stringify(parsed, null, 2));
        
        // Wait 1 second and check mask failures endpoint
        setTimeout(verifyFailureLog, 1500);
      } catch {
        console.log("📄 Raw Response:", raw);
      }
    });
  });

  req.on("error", (err) => {
    console.error("❌ Request Error:", err.message);
  });

  req.write(body);
  req.end();
}

function verifyFailureLog() {
  console.log("\n🔍 Verifying failure log entries from http://localhost:3001/api/admin/mask-failures...");
  
  const opts = {
    method: "GET",
    hostname: "127.0.0.1",
    port: 3001,
    path: "/api/admin/mask-failures",
    headers: {
      "Authorization": "Bearer TEST_TOKEN",
    },
  };

  const req = http.request(opts, (res) => {
    let raw = "";
    res.on("data", (chunk) => { raw += chunk; });
    res.on("end", () => {
      try {
        const parsed = JSON.parse(raw);
        console.log("✨ Latest Failures in Database:", JSON.stringify(parsed.failures?.slice(0, 2), null, 2));
        console.log(`\n🏆 Test 3 Completed Successfully! Failures count: ${parsed.count}`);
      } catch {
        console.log("📄 Raw Failures:", raw);
      }
    });
  });

  req.on("error", (err) => {
    console.error("❌ Failures API Error:", err.message);
  });

  req.end();
}

main().catch(err => console.error(err));
