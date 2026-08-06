# SDK JavaScript / TypeScript

Intégrez facilement les fonctionnalités d'Archi Cam AI dans vos applications web.

## Installation

```bash
npm install @archicam/sdk
```

## Exemple d'utilisation

```typescript
import { ArchiCamClient } from '@archicam/sdk';

const client = new ArchiCamClient({
  apiKey: process.env.ARCHICAM_API_KEY
});

// Lancer le traitement d'une maquette
const result = await client.bim.uploadAndProcess({
  filePath: './villa.rvt',
  userId: 'user_123'
});
console.log('Quantités extraites :', result.quantities.summary);
```
