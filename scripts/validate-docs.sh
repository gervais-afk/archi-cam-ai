#!/bin/bash
# scripts/validate-docs.sh

echo "🔍 Validation de la documentation..."

# 1. Vérifier que tous les fichiers existent
echo -e "\n📁 Vérification des fichiers..."
required_files=(
  "docs/01-guide-fonctionnement-espace-pro.md"
  "docs/02-tableau-temps-couts.md"
  "docs/03-diagramme-sequence-interactif.md"
  "docs/04-faq-technique.md"
  "docs/05-guide-troubleshooting.md"
  "docs/06-exemples-concrets.md"
  "docs/07-glossaire-technique.md"
  "docs/08-checklist-preparation.md"
  "docs/README.md"
  "docs/INDEX.md"
  "docs/CHANGELOG.md"
  "docs/api/rest-api-reference.md"
  "docs/api/webhooks.md"
  "docs/api/sdk-javascript.md"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ MANQUANT: $file"
    exit 1
  fi
done

# 2. Compter les mots et statistiques
echo -e "\n📈 Statistiques documentation..."
total_words=$(cat docs/*.md docs/**/*.md 2>/dev/null | wc -w)
echo "Total mots : $total_words"
echo "Pages équivalent A4 : $((total_words / 500))"

echo -e "\n✅ Validation de base terminée avec succès !"
