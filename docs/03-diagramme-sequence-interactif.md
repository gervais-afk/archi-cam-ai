# 03 - Diagramme de Séquence Interactif

Le diagramme ci-dessous illustre le cycle de vie complet d'une demande de traitement de fichier d'architecture, depuis le téléversement de la maquette CAO jusqu'à la restitution du DQE et du score de conformité.

```mermaid
sequenceDiagram
    autonumber
    actor Archi as 👨💼 Architecte
    participant UI as 💻 Interface Web
    participant Valid as 🔍 Validateur Pre-Flight
    participant Cache as 💾 Cache Conversion
    participant Router as 🧠 Smart Router
    participant Conv as ☁️ Antygravity API
    participant Extract as 🐍 Fast Extractor
    participant Audit as ⚖️ Audit BAEL/POS
    participant DB as 🗄️ PostgreSQL
    
    Archi->>UI: Upload villa.rvt (15 MB)
    UI->>Valid: Vérification magic bytes
    
    alt Fichier invalide
        Valid-->>UI: ❌ Erreur 400
        UI-->>Archi: "Fichier corrompu"
    else Fichier valide
        Valid->>Cache: Calcul SHA-256
        
        alt Cache HIT
            Cache-->>Router: IFC existant trouvé
            Note over Cache: ⚡ Économie: 5 FCFA + 60s
        else Cache MISS
            Cache->>Router: Pas en cache
            Router->>Conv: Conversion .rvt → .ifc
            Conv-->>Router: villa.ifc (60s, 5 FCFA)
            Router->>Cache: Enregistrement
        end
        
        Router->>Extract: Extraction quantités
        Extract->>Extract: Lecture Property Sets<br/>(0.004s)
        Extract-->>Audit: {béton: 27.25m³, acier: 3270kg}
        
        Audit->>Audit: Vérif BAEL 91<br/>Vérif POS Bastos
        Audit-->>DB: Journalisation
        
        DB-->>UI: Résultats + Score conformité
        UI-->>Archi: 📊 Dashboard interactif
    end
```
