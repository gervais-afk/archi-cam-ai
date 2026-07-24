import Link from "next/link";
import { Building2, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-anthracite-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-wood-ocre/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 text-center animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-wood-gradient flex items-center justify-center shadow-lg shadow-wood-acajou/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="font-display font-black text-white text-8xl md:text-9xl tracking-tighter mb-4">
          4<span className="text-wood-ocre">0</span>4
        </h1>
        
        <h2 className="font-display font-bold text-white text-2xl md:text-3xl mb-6">
          Chantier introuvable
        </h2>
        
        <p className="text-anthracite-400 text-lg max-w-md mx-auto mb-10 leading-relaxed">
          Il semblerait que cette page n&apos;existe pas encore, ou qu&apos;elle soit en cours de construction.
        </p>

        <Link href="/">
          <button className="btn-primary inline-flex items-center justify-center gap-2 px-8 py-4">
            <Home className="w-5 h-5" />
            Retour à l&apos;accueil
          </button>
        </Link>
      </div>
    </div>
  );
}
