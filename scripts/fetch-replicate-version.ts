#!/usr/bin/env ts-node
// ============================================================
// UTILITAIRE : Récupère et affiche le hash de version Replicate
// Usage : npx ts-node scripts/fetch-replicate-version.ts
// ============================================================

async function fetchReplicateVersions(
  owner: string,
  model: string,
  token: string
): Promise<void> {
  console.log(`\n📡 Récupération des versions de ${owner}/${model}...`);

  const res = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${model}/versions`,
    {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Erreur HTTP ${res.status}:`, err);
    process.exit(1);
  }

  const data = (await res.json()) as {
    results: Array<{ id: string; created_at: string }>;
  };

  if (!data.results || data.results.length === 0) {
    console.error("❌ Aucune version trouvée pour ce modèle");
    process.exit(1);
  }

  console.log(`\n✅ ${data.results.length} version(s) disponible(s) :\n`);

  data.results.slice(0, 5).forEach((v, i) => {
    const label = i === 0 ? " ← DERNIÈRE VERSION" : "";
    console.log(`  ${i + 1}. ${v.id}${label}`);
    console.log(`     Créée le : ${new Date(v.created_at).toLocaleDateString("fr-FR")}\n`);
  });

  console.log("📋 À utiliser dans controlnet-bridge.ts :");
  console.log(`   version: "${data.results[0].id}"\n`);
}

const MODELS_TO_CHECK = [
  { owner: "lucataco", model: "sdxl-controlnet" },
  { owner: "stability-ai", model: "sdxl" },
  { owner: "jagilley", model: "controlnet-canny" },
];

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? "";

if (!REPLICATE_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN non défini dans les variables d'environnement");
  process.exit(1);
}

(async () => {
  for (const { owner, model } of MODELS_TO_CHECK) {
    await fetchReplicateVersions(owner, model, REPLICATE_TOKEN);
  }
})();
