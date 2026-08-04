import fs from 'fs';
import path from 'path';

// CONFIGURATION DU TEST
const API_URL = 'http://localhost:3000/api/render/image';
const INPUT_FILE_PATH = path.join(process.cwd(), '2D RDC.pdf'); // Fichier de test à la racine
const OUTPUT_FILE_PATH = path.join(process.cwd(), 'test-output-render.png');

async function testRenderApi() {
  console.log('🚀 Démarrage du test automatisé de la pipeline de rendu...');

  // 1. Vérification de l'existence du fichier source
  if (!fs.existsSync(INPUT_FILE_PATH)) {
    console.error(`❌ Erreur: Fichier introuvable à l'emplacement ${INPUT_FILE_PATH}`);
    process.exit(1);
  }

  try {
    // 2. Conversion du fichier en Base64
    console.log('📄 Lecture et conversion du plan en Base64...');
    const fileBuffer = fs.readFileSync(INPUT_FILE_PATH);
    const base64Data = fileBuffer.toString('base64');

    const startTime = Date.now();
    console.log(`📡 Envoi de la requête à ${API_URL} ...`);

    // 3. Appel de l'API Next.js
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        mimeType: 'application/pdf',
      }),
    });

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // 4. Analyse du statut de la réponse
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Échec HTTP ${response.status} (${executionTime}s) :`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();

    // 5. Sauvegarde du résultat
    if (data.resultImageBase64) {
      const outputBuffer = Buffer.from(data.resultImageBase64, 'base64');
      fs.writeFileSync(OUTPUT_FILE_PATH, outputBuffer);
      console.log(`✅ Succès ! Rendu généré en ${executionTime}s`);
      console.log(`🖼️  Image enregistrée sous : ${OUTPUT_FILE_PATH}`);
    } else if (data.imageUrl) {
      console.log(`✅ Succès ! Rendu généré en ${executionTime}s`);
      console.log(`🔗 URL de l'image : ${data.imageUrl}`);
    } else {
      console.warn('⚠️ Requête réussie mais aucun champ d\'image reconnu dans le JSON de réponse.');
      console.log('Réponse JSON :', data);
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script de test :', error.message);
  }
}

testRenderApi();
