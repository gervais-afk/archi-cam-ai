/**
 * 📖 OPENAPI 3.0 / SWAGGER SPECIFICATION ROUTE — ARCHI CAM AI
 * ─────────────────────────────────────────────────────────────
 * Route fournissant la spécification OpenAPI 3.0 de l'API Publique REST v1.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const swaggerSpec = {
    openapi: "3.0.3",
    info: {
      title: "Archi Cam AI — API Publique SaaS BTP",
      version: "1.0.0",
      description: "API REST officielle d'Archi Cam AI pour la génération de rendus architecturaux et la métrique BTP certifiée MINMAP au Cameroun.",
      contact: {
        name: "Support Technique Archi Cam AI",
        email: "support@archicam.cm",
        url: "https://archicam.cm",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        description: "Serveur Principal Production",
      },
    ],
    paths: {
      "/api/render/image": {
        post: {
          summary: "Générer un rendu 3D HD",
          description: "Soumet un plan architecturale et retourne le rendu HD généré.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    planUrl: { type: "string" },
                    style: { type: "string", example: "luxe_tropical" },
                    renderMode: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Succès du rendu" },
            "401": { description: "Non authentifié" },
            "429": { description: "Quota journalier atteint" },
          },
        },
      },
      "/api/health": {
        get: {
          summary: "Vérifier la santé du système",
          responses: {
            "200": { description: "Système opérationnel" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  };

  return NextResponse.json(swaggerSpec);
}
