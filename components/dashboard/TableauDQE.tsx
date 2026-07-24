"use client";

import { useEffect, useState } from "react";
import { connectDataConnectEmulator, getDataConnect } from "firebase/data-connect";
import { getProjetDqe, connectorConfig } from "@/src/dataconnect-generated";
import type { GetProjetDqeData } from "@/src/dataconnect-generated";
import { AlertTriangle, CheckCircle, FileText, Loader2 } from "lucide-react";

// Initialisation globale du singleton de connexion avec routage automatique vers l'émulateur
const dcInstance = getDataConnect(connectorConfig);
if (
  typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
) {
  try {
    connectDataConnectEmulator(dcInstance, "localhost", 9399);
  } catch (err) {
    // Intercepte les avertissements de re-connexions multiples pendant le Hot Reload de Next.js
    console.debug("Data Connect emulator already connected.");
  }
}

interface TableauDQEProps {
  projectId: string;
}

export default function TableauDQE({ projectId }: TableauDQEProps) {
  const [data, setData] = useState<GetProjetDqeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDQE() {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        // Exécution de la requête via le SDK généré
        const response = await getProjetDqe(dcInstance, { id: projectId });
        setData(response.data);
      } catch (err: any) {
        console.error("Erreur lors de la récupération du DQE:", err);
        setError(err.message || "Impossible de charger les données du DQE.");
      } finally {
        setLoading(false);
      }
    }

    fetchDQE();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Chargement du devis DQE (BIM)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-lg">Une erreur est survenue</h3>
          <p className="text-sm opacity-90 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const projet = data?.projet;
  const devisDqes = projet?.devisDqes_on_projet || [];

  // Calcul du budget total estimé
  const totalGeneraleHt = devisDqes.reduce((acc, curr) => acc + (curr.prixTotalHt || 0), 0);

  // Compteur pour les lignes en attente de chiffrage manuel
  const lignesAChiffrer = devisDqes.filter((l) => l.statutPrix === "À CHIFFRER").length;

  return (
    <div className="w-full space-y-6">
      {/* En-tête du devis */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Détail Quantitatif Estimatif</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{projet?.nomProjet || "Projet Sans Nom"}</h2>
          <p className="text-sm text-slate-400">Localisation : {projet?.localisation || "Non spécifiée"}</p>
        </div>
        
        <div className="flex flex-row md:flex-col items-baseline md:items-end justify-between md:justify-center gap-2 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl shrink-0">
          <span className="text-xs text-indigo-300 font-medium">Estimation Globale HT</span>
          <span className="text-2xl font-black text-white tracking-tight">
            {totalGeneraleHt.toLocaleString("fr-FR")} <span className="text-indigo-400 text-sm">FCFA</span>
          </span>
        </div>
      </div>

      {/* Alerte si des lignes sont à chiffrer */}
      {lignesAChiffrer > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Attention : {lignesAChiffrer} ligne(s) DQE n'ont pas pu être chiffrée(s) automatiquement (seuil de confiance inférieur à 85%) et requièrent une intervention manuelle.
          </p>
        </div>
      )}

      {/* Tableau DQE */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 font-semibold text-slate-400">
                <th className="px-6 py-4">Matériau (BIM)</th>
                <th className="px-6 py-4">Quantité Facturable</th>
                <th className="px-6 py-4 text-right">Prix Unitaire</th>
                <th className="px-6 py-4 text-right">Total HT</th>
                <th className="px-6 py-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devisDqes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Aucune ligne de devis DQE trouvée pour ce projet.
                  </td>
                </tr>
              ) : (
                devisDqes.map((line) => {
                  const estAChiffrer = line.statutPrix === "À CHIFFRER";
                  const nomMat = line.mercurialePrix?.nomMateriau || "Non mappé";
                  const unite = line.mercurialePrix?.unite || "m3";
                  const prixU = line.mercurialePrix?.prixTotalUnitaire || 0;
                  
                  return (
                    <tr 
                      key={line.id}
                      className={`transition-colors duration-200 ${
                        estAChiffrer 
                          ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500" 
                          : "hover:bg-white/5"
                      }`}
                    >
                      {/* Matériau */}
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex flex-col">
                          <span>{nomMat}</span>
                          <span className="text-xs text-slate-500 font-mono mt-0.5">GUID: {line.ifcGuid || "N/A"}</span>
                        </div>
                      </td>
                      
                      {/* Quantité */}
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1">
                          <span className="font-semibold text-slate-100">
                            {line.quantiteFacturable?.toFixed(4) || "0.0000"}
                          </span>
                          <span className="text-xs text-slate-500">{unite}</span>
                        </div>
                      </td>
                      
                      {/* Prix Unitaire */}
                      <td className="px-6 py-4 text-right font-mono">
                        {estAChiffrer ? (
                          <span className="text-amber-500 font-semibold">—</span>
                        ) : (
                          <span>{prixU.toLocaleString("fr-FR")} FCFA</span>
                        )}
                      </td>
                      
                      {/* Total HT */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-white">
                        {estAChiffrer ? (
                          <span className="text-amber-500 font-semibold">À saisir</span>
                        ) : (
                          <span>{(line.prixTotalHt || 0).toLocaleString("fr-FR")} FCFA</span>
                        )}
                      </td>
                      
                      {/* Statut */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          estAChiffrer 
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" 
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {estAChiffrer ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              À Chiffrer
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Validé
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
