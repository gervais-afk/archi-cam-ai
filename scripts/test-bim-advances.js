const http = require("http");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);

function postFile(url, fileName, fileContentBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = "----WebKitFormBoundary9XY7Z";
    const header = `--${boundary}\r\n` +
                   `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
                   `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    
    const part1 = Buffer.from(header, "utf-8");
    const part3 = Buffer.from(footer, "utf-8");
    
    const payload = Buffer.concat([part1, fileContentBuffer, part3]);
    
    const parsedUrl = new URL(url);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": payload.length,
        "x-user-id": "test_adv_router_user"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    
    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("🚀 Starting Advanced BIM Cache, Pre-Flights, Diff and Exporter tests...");

  // 1. Tester la validation Pre-Flight (Magic Bytes)
  console.log("\n1. Testing Pre-Flight Magic Bytes Validation...");
  const badContent = Buffer.from("bad-text-corrupted-magic-bytes");
  const badRes = await postFile("http://127.0.0.1:3001/api/bim/upload-ifc", "model.rvt", badContent);
  
  console.log(`📊 Bad File Status Code : ${badRes.status}`);
  console.log(`📊 Bad File Error Message:`, badRes.body.error);
  
  if (badRes.status !== 400 || !badRes.body.error.includes("corrompu")) {
    console.error("❌ Pre-Flight validator failed to block corrupted Revit file signature!");
    process.exit(1);
  }
  console.log("✅ Pre-Flight validator successfully blocked corrupted file signature!");

  // 2. Tester le Cache de Conversion
  console.log("\n2. Testing Conversion Cache (First Upload - Miss)...");
  // En-tête binaire Revit valide : d0cf11e0a1b11ae1
  const validRvtMagic = Buffer.from("d0cf11e0a1b11ae1434f4e56455253494f4e", "hex");
  const uploadUrl = "http://127.0.0.1:3001/api/bim/upload-ifc";
  
  const res1 = await postFile(uploadUrl, "villa_bastos_v1.rvt", validRvtMagic);
  console.log(`📊 Miss Status Code      : ${res1.status}`);
  console.log(`📊 Miss Processing Method: ${res1.body.processingMethod}`);
  console.log(`📊 Miss Concrete Volume  : ${res1.body.quantities?.summary?.total_concrete_volume} m³`);

  console.log("\n3. Testing Conversion Cache (Second Upload - Hit)...");
  const res2 = await postFile(uploadUrl, "villa_bastos_v1.rvt", validRvtMagic);
  console.log(`📊 Hit Status Code       : ${res2.status}`);
  console.log(`📊 Hit Processing Method : ${res2.body.processingMethod}`);
  
  if (res2.body.processingMethod !== "CACHE_HIT") {
    console.error("❌ Conversion cache failed to hit cached IFC on second upload!");
    process.exit(1);
  }
  console.log("✅ Conversion cache hit works perfectly!");

  // 4. Tester le script de Diff IFC
  console.log("\n4. Testing IFC Diff Viewer Python script...");
  const diffCommand = "python scripts/ifc_diff_viewer.py dummy_v1.ifc dummy_v2.ifc";
  const diffResult = await execAsync(diffCommand);
  const diffJson = JSON.parse(diffResult.stdout);
  console.log("📊 Diff output added count   :", diffJson.summary?.added_count);
  console.log("📊 Diff output modified count:", diffJson.summary?.modified_count);

  if (diffJson.summary?.added_count !== 1) {
    console.error("❌ IFC diff viewer script output format incorrect!");
    process.exit(1);
  }
  console.log("✅ IFC diff viewer script works perfectly!");

  // 5. Tester l'export DXF AutoCAD
  console.log("\n5. Testing AutoCAD DXF Exporter Python script...");
  const dxfOutPath = path.join(process.cwd(), "scripts", "villa_export.dxf");
  const dxfCommand = `python scripts/ifc_to_dwg_exporter.py dummy.ifc "${dxfOutPath}"`;
  const dxfResult = await execAsync(dxfCommand);
  console.log("📊 DXF export output:", dxfResult.stdout.trim());

  if (!fs.existsSync(dxfOutPath)) {
    console.error("❌ AutoCAD DXF file was not generated!");
    process.exit(1);
  }
  
  // Nettoyer
  fs.unlinkSync(dxfOutPath);
  console.log("✅ AutoCAD DXF exporter script works perfectly!");

  console.log("\n🏆 All Advanced BIM optimizations validated successfully!");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
