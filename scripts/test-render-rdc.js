// scripts/test-render-rdc.js
const http = require("http");
const fs = require("fs");
const path = require("path");

const payload = {
  pdfFilePath: "c:/Users/HP/Desktop/Archi Cam AI/projet 270525 _ RDC.pdf",
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
    "Authorization": "Bearer DEV_TOKEN",
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log("🚀 Sending POST request to http://localhost:3001/api/render/image...");
console.log("📦 Payload:", JSON.stringify(payload, null, 2));

const req = http.request(opts, (res) => {
  let raw = "";
  console.log(`📌 HTTP Response Status: ${res.statusCode}`);
  
  res.on("data", (chunk) => { raw += chunk; });
  res.on("end", () => {
    try {
      const parsed = JSON.parse(raw);
      console.log("✨ Response JSON:", JSON.stringify(parsed, null, 2));
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
