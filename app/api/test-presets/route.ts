import { buildMasterPrompt, StylePreset } from "@/lib/prompts/render-prompts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const preset = (searchParams.get("preset") as StylePreset) || "luxe_tropical";

  const mockRoomData = {
    rooms: [
      { name: "Salon", type: "living", area: 35 },
      { name: "Véranda", type: "outdoor_veranda", area: 12 }
    ]
  };

  const { positive, negative } = buildMasterPrompt(mockRoomData, preset);

  return Response.json({
    preset,
    positive,
    negative,
    preview: `Aperçu du prompt pour le style ${preset}`
  }, {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
