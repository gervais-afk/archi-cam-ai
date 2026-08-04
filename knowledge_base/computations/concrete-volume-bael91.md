---
type: Attested Computation
title: Calcul du Ferraillage BAEL 91 (Zone Sismique Cameroun)
runtime: python
executor:
  resource: archi_agents/engineer/mcp_ifc_sandbox.py
attester:
  resource: lib/okf/attesters/attest_code_equality.py
status: stable
stale_after: 2026-12-31
generated:
  by: reference_agent/gemini-3.1-pro
  at: 2026-06-30T14:00:00Z
verified:
  - { by: "human:ingénieur_gervais@archi-cam", at: 2026-07-01T10:00:00Z }
sources:
  - id: bael91-norm
    title: Regles BAEL 91 modifiees 99 - Calcul des structures en beton arme
---

# Code de Calcul Agréé

SELECT SUM(volume) * 90.0 AS total_steel_kg FROM building_elements WHERE ifc_type IN ('IfcBeam', 'IfcColumn', 'IfcSlab')
