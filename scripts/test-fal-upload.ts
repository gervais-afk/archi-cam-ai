import { fal } from "@fal-ai/client";
import fs from "fs";

async function testUpload() {
  const apiKey = process.env.FAL_KEY || "82186fe0-a9e8-4de6-a5a6-961279896548:38cbff86e45dc9f2f82481cd28d37253";
  fal.config({ credentials: apiKey });

  console.log("🔍 Test d'upload sur Fal Storage Cloud...");
  const sampleBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

  try {
    const file = new File([sampleBuffer], "test_mask.png", { type: "image/png" });
    const url = await fal.storage.upload(file);
    console.log("✅ SUCCÈS Upload Fal Storage URL :", url);
  } catch (err: any) {
    console.error("❌ ERREUR Upload avec File :", err?.message || err);
  }

  try {
    // Méthode 2 : Direct REST API Fal Storage
    const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
      method: "POST",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        file_name: "test_mask.png",
        content_type: "image/png"
      })
    });
    const initData = await initRes.json();
    console.log("✅ Initié REST Upload :", initData);

    if (initData.upload_url) {
      await fetch(initData.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: sampleBuffer
      });
      console.log("✨ SUCCÈS REST Upload URL finale :", initData.file_url);
    }
  } catch (err2: any) {
    console.error("❌ ERREUR REST Upload :", err2?.message || err2);
  }
}

testUpload();
