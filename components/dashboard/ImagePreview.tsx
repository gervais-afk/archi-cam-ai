import { ZoomIn, Download, Share2 } from "lucide-react";
import { useState } from "react";

interface ImagePreviewProps {
  imageUrl: string;
}

export default function ImagePreview({ imageUrl }: ImagePreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="card-premium p-2 group relative overflow-hidden">
       <div className="relative aspect-[16/9] rounded-xl overflow-hidden cursor-zoom-in" onClick={() => setIsZoomed(!isZoomed)}>
          <img
            src={imageUrl}
            alt="Rendu architectural généré"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <ZoomIn className="w-10 h-10 text-white drop-shadow-2xl" />
          </div>
       </div>
       
       <div className="flex items-center gap-4 p-4">
          <button className="flex-1 btn-primary py-3">
            <Download className="w-4 h-4 mr-2" />
            Télécharger HD
          </button>
          <button className="px-5 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all">
            <Share2 className="w-4 h-4" />
          </button>
       </div>
    </div>
  );
}
