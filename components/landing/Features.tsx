import {
  Building,
  Sofa,
  FileImage,
  Video,
  Zap,
  Shield,
  Globe,
  Palette,
} from "lucide-react";

const MAIN_FEATURES = [
  {
    icon:        Building,
    title:       "Rendus Extérieurs",
    description:
      "Façades photoréalistes avec éclairage naturel simulé, environnement végétal et contexte urbain camerounais authentique.",
    badge:       "Bestseller",
    badgeColor:  "text-wood-ocre",
    imgUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=70",
  },
  {
    icon:        Sofa,
    title:       "Décoration Intérieure",
    description:
      "Visualisation 3D des espaces intérieurs avec mobilier, matières et ambiances lumineuses paramétrables.",
    badge:       "Nouveau",
    badgeColor:  "text-green-400",
    imgUrl:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=70",
  },
  {
    icon:        FileImage,
    title:       "Plan de Vente 2D",
    description:
      "Génération automatique de plans de vente annotés, cotés et mis en page professionnellement.",
    badge:       null,
    badgeColor:  "",
    imgUrl:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=70",
  },
  {
    icon:        Video,
    title:       "Vidéos d'Animation",
    description:
      "Visite virtuelle cinématique 4K générée par Veo 3. Parfait pour les supports commerciaux et présentations clients.",
    badge:       "Pro",
    badgeColor:  "text-purple-400",
    imgUrl:
      "https://images.unsplash.com/photo-1536566482680-fca31930a0bd?w=600&q=70",
  },
];

const SECONDARY_FEATURES = [
  {
    icon:  Zap,
    title: "Génération en 30 secondes",
    desc:  "Infrastructure IA dédiée pour des temps de traitement ultra-rapides.",
  },
  {
    icon:  Shield,
    title: "Logo d'agence personnalisé",
    desc:  "Remplacez le filigrane par votre identité visuelle (Pass Pro).",
  },
  {
    icon:  Globe,
    title: "Intégration Google Maps",
    desc:  "Positionnez votre rendu en situation réelle sur le plan de ville.",
  },
  {
    icon:  Palette,
    title: "Audit Bioclimatique IA",
    desc:  "Rapport automatique sur les performances énergétiques du bâtiment.",
  },
];

export default function Features() {
  return (
    <section id="fonctionnalites" className="py-24 bg-anthracite-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="wood-badge mb-4 mx-auto w-fit">Fonctionnalités</div>
          <h2 className="section-title">
            Tout ce dont votre agence a besoin
          </h2>
          <p className="section-subtitle mx-auto">
            De la visualisation extérieure à la vidéo de vente, notre IA couvre
            l&apos;intégralité du workflow de présentation architecturale.
          </p>
        </div>

        {/* Main Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {MAIN_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="card-dark group hover:border-wood-ocre/40 transition-all duration-300 overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={feature.imgUrl}
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-anthracite-900 via-anthracite-900/20 to-transparent" />
                  {feature.badge && (
                    <span
                      className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full bg-anthracite-900/80 border border-anthracite-600 ${feature.badgeColor}`}
                    >
                      {feature.badge}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-wood-ocre/10 border border-wood-ocre/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-wood-ocre" />
                    </div>
                    <h3 className="font-display font-semibold text-white text-lg">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-anthracite-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Secondary Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECONDARY_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="card-dark p-5 hover:border-wood-ocre/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-wood-acajou/20 border border-wood-acajou/30 flex items-center justify-center mb-4 group-hover:bg-wood-acajou/30 transition-colors">
                  <Icon className="w-5 h-5 text-wood-light" />
                </div>
                <h4 className="text-white font-semibold text-sm mb-2">
                  {feat.title}
                </h4>
                <p className="text-anthracite-400 text-xs leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
