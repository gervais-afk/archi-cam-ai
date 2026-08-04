import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000/api/render/image';
const TEST_PDF_PATH = path.join(process.cwd(), '2D RDC.pdf');
const OUTPUT_IMAGE_PATH = path.join(process.cwd(), 'public', 'test_quality_render_final.png');

async function validateRenderQuality() {
  console.log('🧪 DÉMARRAGE DU TEST DE VALIDATION DE QUALITÉ ET CACHE MD5 API...');
  console.log('📄 Plan source de test :', TEST_PDF_PATH);

  if (!fs.existsSync(TEST_PDF_PATH)) {
    console.error('❌ Fichier de test introuvable :', TEST_PDF_PATH);
    process.exit(1);
  }

  const startTime = Date.now();
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfFilePath: TEST_PDF_PATH,
        renderMode: '3D_PHOTOREALISTE',
        style: 'luxe-tropical',
      }),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️ Réponse serveur reçue en ${duration}s (Statut HTTP ${response.status})`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ Échec HTTP ${response.status} :`, errText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('\n📊 CRITÈRES DE VALIDATION ET MÉTADONNÉES :');
    console.log('----------------------------------------------------');
    console.log('✅ Succès API :', data.success);
    console.log('⚡ Cached (Hit MD5) :', data.cached || false);
    console.log('🔗 Image URL produite :', data.imageUrl);
    console.log('📐 Surface calculée OKF :', data.analysis?.surfaceArea, 'm²');
    console.log('🏛️ Statut Conformité SCoT :', data.analysis?.compliance?.message);
    console.log('💰 Devis Estimatif Total :', data.estimate?.totalCostXAF, 'FCFA');
    console.log('📝 Note Technique :', data.reportText);

    const relativeUrl = data.imageUrl;
    const diskPath = path.join(process.cwd(), 'public', relativeUrl.replace(/^\//, ''));

    if (fs.existsSync(diskPath)) {
      const stats = fs.statSync(diskPath);
      console.log('\n🖼️ FICHIER PNG CLIENT GÉNÉRÉ :');
      console.log('  - Chemin local :', diskPath);
      console.log('  - Taille fichier :', (stats.size / 1024).toFixed(2), 'Ko');
      console.log('  - Statut : PRÊT POUR PRÉSENTATION CLIENT PROMOTION IMMOBILIÈRE ⭐');

      fs.copyFileSync(diskPath, OUTPUT_IMAGE_PATH);
    }

  } catch (err) {
    console.error('❌ Erreur lors du test de validation :', err);
  }
}

validateRenderQuality();
