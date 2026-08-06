const http = require("http");

const testPreset = (preset) => {
  return new Promise((resolve) => {
    http.get(`http://127.0.0.1:3001/api/test-presets?preset=${preset}`, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          console.log(`\n======================================================`);
          console.log(`✨ TEST PRESET: ${preset}`);
          console.log(`======================================================`);
          console.log(`Positive Prompt:\n`, parsed.positive);
          console.log(`\nNegative Prompt:\n`, parsed.negative);
          resolve();
        } catch (e) {
          console.log(`Failed to parse preset ${preset}:`, raw);
          resolve();
        }
      });
    });
  });
};

async function main() {
  await testPreset("luxe_tropical");
  await testPreset("architect_pro");
}

main();
