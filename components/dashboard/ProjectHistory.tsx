"use client";

import { Clock, ExternalLink, LogOut, FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MockProject } from "@/lib/mock-auth";

interface ProjectHistoryProps {
  projects?: MockProject[];
}

export default function ProjectHistory({ projects }: ProjectHistoryProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  const projectList = projects || [];

  return (
    <div className="card-premium p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4 text-wood-ocre" />
          Historique Projets
        </h3>
        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-anthracite-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Déco.
        </button>
      </div>
      
      {projectList.length > 0 ? (
        <div className="space-y-4">
          {projectList.map((project) => (
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
                 <span className={`text-[10px] font-bold ${
                   project.status === "Terminé" ? "text-green-500/70" : 
                   project.status === "En cours" ? "text-wood-ocre/70" : 
                   "text-anthracite-500"
                 }`}>{project.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <FolderPlus className="w-8 h-8 text-anthracite-500 mx-auto mb-2 opacity-50" />
          <p className="text-white text-xs font-bold">Aucun projet enregistré</p>
          <p className="text-anthracite-500 text-[10px] mt-1">Glissez un plan PDF ou IFC ci-dessus pour démarrer votre premier rendu.</p>
        </div>
      )}

      {projectList.length > 0 && (
        <button className="w-full mt-6 py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase text-anthracite-500 hover:text-white hover:bg-white/5 transition-all">
          Voir tous les projets
        </button>
      )}
    </div>
  );
}
