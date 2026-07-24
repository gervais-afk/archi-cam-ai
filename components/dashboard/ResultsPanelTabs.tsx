import { motion } from "framer-motion";
import { ZoomIn, Activity, Receipt, FileText, Sparkles } from "lucide-react";
import type { UserMode } from "@/types";

interface ResultsPanelTabsProps {
  mode: UserMode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export default function ResultsPanelTabs({ mode, activeTab, setActiveTab }: ResultsPanelTabsProps) {
  const tabs = [
    { id: "image",    label: mode === "b2b" ? "Rendu Réaliste (4K)" : "Rendu 4K",     icon: ZoomIn },
    mode === "b2b" && { id: "insights", label: "Audit Expert", icon: Sparkles },
    { id: "analysis", label: mode === "b2b" ? "Analyse BIM" : "Analyse IA",   icon: Activity },
    { id: "estimate", label: mode === "b2b" ? "DQE (FCFA)" : "Devis (FCFA)", icon: Receipt },
    { id: "report",   label: mode === "b2b" ? "CCTP Technique" : "Note Tech",    icon: FileText },
  ].filter(Boolean) as any[];

  return (
    <div className="relative flex items-center gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-2xl w-fit">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
              isActive ? "text-white" : "text-anthracite-500 hover:text-anthracite-300"
            }`}
          >
            {isActive && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon className={`w-3.5 h-3.5 ${isActive ? "text-ai-glow" : ""}`} />
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
