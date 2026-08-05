import Navbar from "@/components/layout/Navbar";
import { BetaFeedbackForm } from "@/components/BetaFeedbackForm";
import { CheckCircle2, AlertTriangle, Cpu, Ruler, Shield, Layers, FileText } from "lucide-react";

export const metadata = {
  title: "Bêta Privée — Archi-Cameroun AI",
  description: "Espace d'évaluation exclusif pour les architectes et professionnels du BTP au Cameroun.",
};

export default function BetaPage() {
  return (
    <main className="min-h-screen bg-hero-gradient text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        {/* Header Section */}
        <div className="text-center space-y-4 mb-12">
          <span className="wood-badge">Accès Restreint</span>
          <h1 className="font-display font-bold text-4xl md:text-6xl text-white tracking-tight">
            🎉 Bienvenue dans la Bêta Privée
          </h1>
          <p className="text-anthracite-400 text-lg max-w-2xl mx-auto">
            Vous faites partie des 20 testeurs sélectionnés pour éprouver la première plateforme d&apos;IA architecturale adaptée aux réalités du Cameroun.
          </p>
        </div>

        {/* Warning Alert Banner */}
        <div className="bg-wood-dark/20 border border-wood-ocre/40 rounded-2xl p-6 mb-12 flex flex-col md:flex-row items-start gap-4 backdrop-blur-md max-w-4xl mx-auto animate-pulse-slow">
          <div className="p-3 bg-wood-ocre/10 rounded-xl text-wood-ocre">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-white mb-1">Version en cours d&apos;évaluation</h2>
            <p className="text-sm text-anthracite-300 leading-relaxed">
              Cette version bêta est conçue pour tester la robustesse de notre pipeline local-first et du moteur d&apos;estimation DQE. Vos retours sur la précision des devis et la qualité des rendus sont cruciaux pour notre déploiement final.
            </p>
          </div>
        </div>

        {/* Features & Form Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Features */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-anthracite-800/30 border border-white/5 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
              <h3 className="font-display font-semibold text-xl text-white border-b border-white/5 pb-3">
                Fonctionnalités Activées
              </h3>
              
              <ul className="space-y-4">
                {[
                  {
                    icon: Cpu,
                    title: "Croquis → Rendu HD 2D/3D",
                    desc: "Transformation d'un dessin à main levée en plan d'exécution propre.",
                  },
                  {
                    icon: Ruler,
                    title: "Devis DQE certifié Mercuriale",
                    desc: "Calcul automatique basé sur la Mercuriale MINMAP 2026.",
                  },
                  {
                    icon: Layers,
                    title: "Calcul structural BAEL 91",
                    desc: "Pré-dimensionnement béton armé et calcul des aciers.",
                  },
                  {
                    icon: Shield,
                    title: "Jumeau numérique interactif",
                    desc: "Modèle BIM 3D généré directement depuis le plan 2D.",
                  },
                  {
                    icon: FileText,
                    title: "Rapport PDF avec QR Code",
                    desc: "Exportation sécurisée avec filigrane et métadonnées de traçabilité.",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <li key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 mt-1 text-wood-ocre">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                        <p className="text-xs text-anthracite-400 mt-0.5">{item.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="bg-anthracite-800/10 border border-white/5 rounded-2xl p-6 text-center text-xs text-anthracite-500">
              Des questions ou besoin d&apos;assistance ? Contactez le support technique à <span className="text-wood-ocre">support@archi-cameroun.ai</span>
            </div>
          </div>

          {/* Right Column: Feedback Form */}
          <div className="lg:col-span-7">
            <BetaFeedbackForm />
          </div>
        </div>
      </div>
    </main>
  );
}
