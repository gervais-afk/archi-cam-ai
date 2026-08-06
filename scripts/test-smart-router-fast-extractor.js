const http = require("http");

function postFile(url, fileName, fileContent) {
  return new Promise((resolve, reject) => {
    const boundary = "----WebKitFormBoundary9XY7Z";
    
    const header = `--${boundary}\r\n` +
                   `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
                   `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    
    const part1 = Buffer.from(header, "utf-8");
    const part2 = Buffer.from(fileContent, "utf-8");
    const part3 = Buffer.from(footer, "utf-8");
    
    const payload = Buffer.concat([part1, part2, part3]);
    
    const parsedUrl = new URL(url);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": payload.length,
        "x-user-id": "test_smart_router_user"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    
    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("🚀 Starting Smart Router & Fast IFC Extractor integration test...");
  
  const dummyRvtContent = "REVIT-MODEL-DATA-DRAFT-185";
  const url = "http://127.0.0.1:3001/api/bim/upload-ifc";
  
  try {
    const res = await postFile(url, "villa_bastos.rvt", dummyRvtContent);
    
    console.log(`📊 Response Status Code : ${res.status}`);
    console.log(`📊 Pipeline Executed     : ${res.body.pipeline}`);
    console.log(`📊 Processing Method    : ${res.body.processingMethod}`);
    console.log(`📊 Processing Time      : ${res.body.processingTime}s`);
    console.log(`📊 Extracted Quantities  :`, JSON.stringify(res.body.quantities?.summary, null, 2));
    
    if (
      res.status === 200 &&
      res.body.success &&
      res.body.pipeline === "IFC_EXTRACTION" &&
      res.body.quantities?.summary?.total_concrete_volume > 0
    ) {
      console.log("\n🏆 Smart Router and Fast IFC Extractor validated successfully!");
    } else {
      console.error("\n❌ Smart Router or Fast IFC Extractor checks failed!");
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

main();
