import { Clock, ExternalLink, FileText } from "lucide-react";

const PROJECTS = [
  { id: 1, name: "Résidence Bastos R+2", date: "Il y a 2h", type: "BIM", status: "Terminé" },
  { id: 2, name: "Villa Kribi Plage", date: "Hier", type: "Vision", status: "Terminé" },
  { id: 3, name: "Immeuble Akwa", date: "3 mai", type: "BIM", status: "Archive" },
];

export default function ProjectHistory() {
  return (
    <div className="card-premium p-6 mt-8">
      <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-wood-ocre" />
        Historique Projets
      </h3>
      
      <div className="space-y-4">
        {PROJECTS.map((project) => (
          <div key={project.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-wood-ocre/20 transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-1">
              <p className="text-white text-xs font-bold group-hover:text-wood-ocre transition-colors">{project.name}</p>
              <ExternalLink className="w-3 h-3 text-anthracite-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                    project.type === "BIM" ? "bg-ai-glow/10 text-ai-glow border border-ai-glow/20" : "bg-wood-ocre/10 text-wood-ocre border border-wood-ocre/20"
                  }`}>
                    {project.type}
                  </span>
                  <span className="text-anthracite-600 text-[10px]">{project.date}</span>
               </div>
               <span className="text-[10px] text-anthracite-500">{project.status}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase text-anthracite-500 hover:text-white hover:bg-white/5 transition-all">
        Voir tous les projets
      </button>
    </div>
  );
}
