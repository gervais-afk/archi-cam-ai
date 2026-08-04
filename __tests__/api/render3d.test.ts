import { POST } from "@/app/api/render/3d/route";
import { NextRequest } from "next/server";

// 1. Mock du SDK Google Gemini
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify({
            prompt: "Top-down 3D architectural floor plan rendering of a modern apartment...",
            detectedRooms: ["Chambre", "Salon", "SDB"],
            dominantStyle: "Modern Luxury",
          }),
        }),
      },
    })),
  };
});

// 2. Mock du SDK Replicate
jest.mock("replicate", () => {
  return jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue(["https://replicate.delivery/pbxt/sample_render_3d.png"]),
  }));
});

describe("POST /api/render/3d", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("devrait retourner une erreur 400 si lineartImageBase64 et planUrl sont manquants", async () => {
    const req = new NextRequest("http://localhost:3000/api/render/3d", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Image d'armature (lineartImageBase64) ou planUrl requise.");
  });

  it("devrait générer avec succès le rendu 3D et renvoyer l'URL", async () => {
    const mockPayload = {
      lineartImageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    const req = new NextRequest("http://localhost:3000/api/render/3d", {
      method: "POST",
      body: JSON.stringify(mockPayload),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.mode).toBe("3D_PHOTOREALISTE");
    expect(data.meta.dominantStyle).toBeDefined();
    expect(data.meta.detectedRooms).toBeDefined();
  });
});
