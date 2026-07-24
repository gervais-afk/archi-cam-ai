import * as fs from 'fs';
import * as path from 'path';

/**
 * Charge un fichier de la base de connaissances Markdown locale.
 * @param fileName Nom du fichier (ex: 'normes_bael.md')
 */
export function loadKnowledgeBase(fileName: string): string {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'knowledge_base', fileName),
      path.join(process.cwd(), '..', 'knowledge_base', fileName),
      path.join(__dirname, '..', '..', '..', '..', 'knowledge_base', fileName)
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`[RAG INFO] Fichier chargé avec succès : ${filePath}`);
        return fs.readFileSync(filePath, 'utf-8');
      }
    }
    
    console.warn(`[RAG WARN] Fichier manquant dans la base : ${fileName}`);
    return '';
  } catch (error) {
    console.error(`[RAG ERROR] Impossible de lire le fichier ${fileName}:`, error);
    return '';
  }
}
