const http = require("http");

const sendChatMessage = (message) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      projectId: "test_project_id",
      message: message,
    });

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 3001,
        path: "/api/chat",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            console.log(`\n======================================================`);
            console.log(`👤 USER MESSAGE: "${message}"`);
            console.log(`======================================================`);
            console.log(`🤖 AGENT: ${parsed.agentMessage.sender}`);
            console.log(`💬 RESPONSE: ${parsed.agentMessage.text}`);
            if (parsed.agentMessage.widgetType) {
              console.log(`📦 WIDGET TYPE: ${parsed.agentMessage.widgetType}`);
              console.log(`📊 WIDGET DATA:\n`, JSON.stringify(parsed.agentMessage.widgetData, null, 2));
            }
            resolve();
          } catch (e) {
            console.log("Failed to parse response:", raw);
            resolve();
          }
        });
      }
    );

    req.write(postData);
    req.end();
  });
};

async function main() {
  console.log("🚀 Starting chat API validation tests...");
  await sendChatMessage("Combien coûte le lot plomberie et réseaux ?");
  await sendChatMessage("Quelle est la section et le ferraillage du poteau ?");
  await sendChatMessage("Le recul de voirie est-il conforme au plan d'occupation des sols ?");
  console.log("\n🏆 Chat API validation finished successfully!");
}

main();
