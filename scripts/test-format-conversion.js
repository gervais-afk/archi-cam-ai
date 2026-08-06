const http = require("http");

function postFile(url, fileName, fileContent) {
  return new Promise((resolve, reject) => {
    const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
    
    // Construction manuelle du payload multipart/form-data pour éviter les dépendances externes npm
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
        "x-user-id": "test_script_converter_user"
      }
    }, (res) => {
      let data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        const bodyBuffer = Buffer.concat(data);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: bodyBuffer.toString("utf-8")
        });
      });
    });
    
    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("🚀 Starting CAD Converter & IFC Quality Validator integration test...");
  
  const dummyRvtContent = "REVIT-BINARY-MOCK-DATA-STREAM-1786";
  const url = "http://127.0.0.1:3001/api/pro/ifc/convert";
  
  try {
    const res = await postFile(url, "villa_bastos.rvt", dummyRvtContent);
    
    console.log(`📊 Response Status Code : ${res.status}`);
    console.log(`📊 Quality Score Header : ${res.headers["x-quality-score"]}`);
    console.log(`📊 Warnings Header      : ${res.headers["x-warnings"]}`);
    console.log(`📊 Output Data Snippet  : \n---\n${res.body.substring(0, 180)}...\n---`);
    
    if (res.status === 200 && res.body.includes("ISO-10303-21")) {
      console.log("\n🏆 CAD format conversion and quality validator validated successfully!");
    } else {
      console.error("\n❌ Conversion or validation checks failed!");
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

main();
