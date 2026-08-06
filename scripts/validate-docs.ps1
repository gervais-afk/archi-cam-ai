# scripts/validate-docs.ps1

Write-Host "Validation de la documentation..." -ForegroundColor Cyan

# 1. Verifier que tous les fichiers existent
Write-Host "Verification des fichiers..." -ForegroundColor Cyan
$requiredFiles = @(
  "docs/01-guide-fonctionnement-espace-pro.md",
  "docs/02-tableau-temps-couts.md",
  "docs/03-diagramme-sequence-interactif.md",
  "docs/04-faq-technique.md",
  "docs/05-guide-troubleshooting.md",
  "docs/06-exemples-concrets.md",
  "docs/07-glossaire-technique.md",
  "docs/08-checklist-preparation.md",
  "docs/README.md",
  "docs/INDEX.md",
  "docs/CHANGELOG.md",
  "docs/api/rest-api-reference.md",
  "docs/api/webhooks.md",
  "docs/api/sdk-javascript.md"
)

foreach ($file in $requiredFiles) {
  if (Test-Path $file) {
    Write-Host "OK: $file" -ForegroundColor Green
  } else {
    Write-Host "MISSING: $file" -ForegroundColor Red
    Exit 1
  }
}

# 2. Compter les mots et statistiques
Write-Host "Statistiques documentation..." -ForegroundColor Cyan
$totalWords = 0
$files = Get-ChildItem -Path "docs" -Filter "*.md" -Recurse
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $words = $content.Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
  $totalWords += $words.Length
}

Write-Host "Total mots : $totalWords"
$pages = [math]::Floor($totalWords / 500)
Write-Host "Pages equivalent A4 : $pages"
Write-Host ""
Write-Host "Validation terminee avec succes !" -ForegroundColor Green
