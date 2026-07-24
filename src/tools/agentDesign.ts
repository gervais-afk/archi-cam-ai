/**
 * agentDesign.ts — Archi Cam AI Specialist Interior & Architectural Rendering Agent
 *
 * Agent IA spécialisé (@agent-design) responsable de la génération de plans 2D texturés
 * style Photoshop et de rendus 3D d'architecture intérieure/extérieure (Imagen 3.0)
 * combinant le modernisme et des touches d'artisanat d'art camerounais.
 */

export interface RenderRequest {
  roomType: 'SALON' | 'CUISINE' | 'CHAMBRE_PARENTALE' | 'FACADE_EXTERIEURE' | 'PLAN_2D_PHOTOSHOP';
  styleTheme: 'AFRO_CONTEMPORAIN' | 'MODERNE_MINIMALISTE' | 'TROPICAL_LUXE';
  hasCameroonTouch: boolean;
  maskLocked: boolean;
  customPrompt?: string;
}

export interface RenderPromptResult {
  formattedPrompt: string;
  roomType: string;
  styleTheme: string;
  negativePrompt: string;
  controlNetMaskStatus: string;
}

/**
 * Construit un prompt architectural ultra-détaillé sans hallucination pour Imagen 3.0 / ControlNet.
 */
export function generateArchitecturalRenderPrompt(request: RenderRequest): RenderPromptResult {
  const { roomType, styleTheme, hasCameroonTouch, customPrompt } = request;

  let baseDescription = "";
  let cameroonElements = "";

  if (hasCameroonTouch) {
    cameroonElements = ", subtle Cameroonian artistic touches, elegant Bamiléké carved wooden accents, polished iroko wood furniture, woven raffia decorative elements, warm earth tones (terracotta, deep green, warm ochre), tropical indoor plants (monstera, palms)";
  }

  switch (roomType) {
    case 'PLAN_2D_PHOTOSHOP':
      baseDescription = "Top-down 2D floorplan visualization, professional architectural Photoshop rendering style, textured parquet and glossy tile floors, scaled modern furniture layout, soft drop shadows under walls, clean architectural drawing aesthetics";
      break;

    case 'SALON':
      baseDescription = "Photorealistic architectural 3D interior render of a spacious luxury living room, floor-to-ceiling glass windows with natural sunlight, plush contemporary sofa, sleek recessed LED lighting, polished concrete floor";
      break;

    case 'CUISINE':
      baseDescription = "Modern gourmet kitchen interior design, quartz marble countertops, custom dark oak cabinets, built-in appliances, warm ambient pendant lights over island";
      break;

    case 'CHAMBRE_PARENTALE':
      baseDescription = "Master bedroom suite interior render, king-size bed with premium linen, warm wooden headboard, soft accent wall lighting, cozy balcony view";
      break;

    case 'FACADE_EXTERIEURE':
      baseDescription = "Exterior architectural photograph of a modern tropical 2-storey villa in West Africa, stone feature wall, cantilevered upper floor, lush tropical garden landscaping, clear blue sky, bright afternoon sunlight";
      break;
  }

  const finalPrompt = `${baseDescription}${cameroonElements}, high architectural digest quality, 8k resolution, photorealistic, professional archviz rendering, 16:9 aspect ratio. ${customPrompt || ''}`;

  // Negative prompt pour interdire les distorsions et structures chaotiques
  const negativePrompt = "distorted walls, floating windows, extra doors, unrealistic architecture, messy lines, low resolution, blurry, oversaturated";

  return {
    formattedPrompt: finalPrompt,
    roomType,
    styleTheme,
    negativePrompt,
    controlNetMaskStatus: request.maskLocked ? "MASK_STRICTLY_LOCKED" : "UNLOCKED",
  };
}
