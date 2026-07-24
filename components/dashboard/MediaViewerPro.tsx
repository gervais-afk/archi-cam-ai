"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Share2, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Sparkles,
  Info,
  Loader2,
  RefreshCw,
  Building
} from "lucide-react";

interface MediaViewerProProps {
  mediaUrl?: string | null;
  mediaType?: "image" | "video";
  isLoading?: boolean;
  loadingStatusText?: string;
  isPro?: boolean;
  onRetry?: () => void;
  onUpscaleSuccess?: (newImageUrl: string) => void;
  onAnimateInitiated?: (jobId: string) => void;
}

export default function MediaViewerPro({
  mediaUrl,
  mediaType = "image",
  isLoading = false,
  loadingStatusText = "Rendu cinématique en cours de génération...",
  isPro = false,
  onRetry,
  onUpscaleSuccess,
  onAnimateInitiated
}: MediaViewerProProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(20); // 20s estimées par défaut
  
  // Gestion du logo personnalisé (White-Label)
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpscale = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaUrl || isUpscaling) return;
    setIsUpscaling(true);
    try {
      const res = await fetch("/api/render/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: mediaUrl }),
      });
      if (!res.ok) throw new Error("Upscale request failed");
      const data = await res.json();
      if (onUpscaleSuccess) {
        onUpscaleSuccess(data.imageUrl);
      }
    } catch (err) {
      console.error("Upscale error:", err);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleAnimate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaUrl || isAnimating) return;
    setIsAnimating(true);
    try {
      const res = await fetch("/api/render/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: mediaUrl, projectId: "demo-project-123" }),
      });
      if (!res.ok) throw new Error("Animation request failed");
      const data = await res.json();
      if (onAnimateInitiated) {
        onAnimateInitiated(data.jobId);
      }
    } catch (err) {
      console.error("Animation error:", err);
    } finally {
      setIsAnimating(false);
    }
  };

  // ── CHARGEMENT DU LOGO (WHITE-LABEL WORKFLOW) ──────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Fallback local : Récupération du logo enregistré localement par LogoUploader
      const localLogo = localStorage.getItem("archi_cam_agency_logo");
      if (localLogo) {
        setAgencyLogo(localLogo);
      } else {
        // Faux état par défaut si vide (logo élégant simulé d'architecte)
        // Ceci permet d'avoir un rendu immédiatement impressionnant en local
        setAgencyLogo(null); 
      }

      // NOTE POUR LA PRODUCTION (SUPABASE AUTH PROFILE INTEGRATION) :
      // Pour lier aux profils réels en production, décommenter la structure suivante :
      /*
      const fetchUserProfileLogo = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('agency_logo_url, subscription_tier')
            .eq('id', user.id)
            .single();
          if (profile && profile.subscription_tier === 'pro' && profile.agency_logo_url) {
            setAgencyLogo(profile.agency_logo_url);
          }
        }
      };
      fetchUserProfileLogo();
      */
    }
  }, [isPro]);

  // ── DECOMPTE DU COMPTEUR DE CHARGEMENT ───────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      setCountdown(20);
      
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          // Progression simulée liée au compteur (0% -> 95%)
          setProgress(Math.round(((20 - (prev - 1)) / 20) * 95));
          return prev - 1;
        });
      }, 1000);
    } else {
      setProgress(100);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // ── CONTROLES LECTEUR VIDEO ──────────────────────────────────────────
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => console.log("Video play error:", err));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    // En lecture de rendu vidéo, on peut afficher une barre d'avancement
    // mais ici on garde les contrôles simples.
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleDownload = () => {
    if (!mediaUrl) return;
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = mediaType === "video" ? "animation_archi_cameroun.mp4" : "rendu_archi_cameroun.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-anthracite-950 border border-white/5 rounded-3xl overflow-hidden group select-none shadow-2xl">
      
      {/* ── 1. ÉTAT DE CHARGEMENT ASYNCHRONE STYLISÉ (VE0 3 / IMAGEN 3) ───────── */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-anthracite-950/95 backdrop-blur-md"
          >
            {/* Design de chargement : Shimmer + Ornements Ocre */}
            <div className="relative w-28 h-28 flex items-center justify-center mb-8">
              <span className="absolute inset-0 rounded-full border border-wood-ocre/20 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full border border-t-wood-ocre border-r-transparent border-l-transparent border-b-transparent animate-spin duration-1000" />
              <div className="absolute inset-4 rounded-full border border-b-ai-glow border-t-transparent border-l-transparent border-r-transparent animate-spin duration-700 reverse" />
              <div className="w-16 h-16 rounded-full bg-anthracite-900 border border-white/5 flex items-center justify-center shadow-lg shadow-black/80">
                <Sparkles className="w-6 h-6 text-wood-ocre animate-pulse" />
              </div>
            </div>

            <h4 className="text-white font-bold text-base text-center tracking-tight mb-2">
              {mediaType === "video" ? "Modélisation Cinématique Veo 3" : "Génération de Rendu Imagen 3"}
            </h4>
            <p className="text-anthracite-400 text-xs text-center font-medium max-w-sm mb-6 leading-relaxed">
              {loadingStatusText}
            </p>

            {/* Barre de progression haut de gamme */}
            <div className="w-64 space-y-2">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="h-full bg-wood-gradient rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-anthracite-500 uppercase tracking-widest">
                <span>Progression : {progress}%</span>
                <span>Restant ~{countdown}s</span>
              </div>
            </div>

            {/* Conseils contextuels pendant le temps de calcul */}
            <div className="mt-8 flex items-start gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-4 max-w-sm">
              <Info className="w-4 h-4 text-wood-ocre shrink-0 mt-0.5" />
              <p className="text-[10px] text-anthracite-400 font-medium leading-relaxed">
                <strong className="text-white">Note :</strong> Les rendu 4K d'intérieur intègrent automatiquement la pierre volcanique d'Edéa et le bois Iroko pour une adaptation climatique bioclimatique.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* local upscaling loader */}
      <AnimatePresence>
        {isUpscaling && (
          <motion.div
            key="upscaling-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-anthracite-950/90 backdrop-blur-md"
          >
            <div className="relative w-20 h-20 flex items-center justify-center mb-6">
              <span className="absolute inset-0 rounded-full border border-wood-ocre/20 animate-ping opacity-75" />
              <div className="absolute inset-2 rounded-full border border-t-wood-ocre border-r-transparent border-l-transparent border-b-transparent animate-spin duration-700" />
              <div className="w-12 h-12 rounded-full bg-anthracite-900 border border-white/5 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-wood-ocre animate-pulse" />
              </div>
            </div>
            <h4 className="text-white font-bold text-sm text-center tracking-tight mb-1">
              Super-Résolution 4K en cours...
            </h4>
            <p className="text-anthracite-500 text-[10px] text-center font-medium max-w-xs leading-relaxed">
              Amélioration de la netteté et des textures du bois Iroko
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. AFFICHAGE DES MÉDIAS GÉNÉRÉS ───────────────────────────────────── */}
      <div className="relative w-full aspect-[16/9] flex items-center justify-center bg-black overflow-hidden">
        {mediaUrl ? (
          mediaType === "video" ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              playsInline
              loop
              muted={isMuted}
              className="w-full h-full object-cover cursor-pointer"
            />
          ) : (
            <div className="relative w-full h-full group">
              <img
                src={mediaUrl}
                alt="Rendu Architectural Final"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
              />
              
              {/* Boutons d'action premium superposés au survol */}
              {!isLoading && (
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <button
                    onClick={handleUpscale}
                    disabled={isUpscaling}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-anthracite-950/90 hover:bg-wood-gradient text-white border border-wood-ocre/40 shadow-2xl backdrop-blur-md transform scale-90 group-hover:scale-100 transition-all duration-300 hover:border-white font-bold text-xs uppercase tracking-widest"
                  >
                    <Sparkles className="w-4 h-4 text-wood-ocre" />
                    ✨ Passer en 4K
                  </button>

                  <button
                    onClick={handleAnimate}
                    disabled={isAnimating}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-anthracite-950/90 hover:bg-wood-gradient text-white border border-wood-ocre/40 shadow-2xl backdrop-blur-md transform scale-90 group-hover:scale-100 transition-all duration-300 hover:border-white font-bold text-xs uppercase tracking-widest"
                  >
                    <Play className="w-4 h-4 fill-current text-wood-ocre" />
                    🎬 Animer la scène
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          /* État vide initial */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-anthracite-900 border border-dashed border-white/5">
            <Building className="w-12 h-12 text-anthracite-600 mb-4 animate-pulse" />
            <h4 className="text-white font-bold text-sm">Aucun rendu disponible</h4>
            <p className="text-anthracite-500 text-xs mt-1 max-w-xs leading-relaxed">
              Lancez une génération d'image ou de vidéo animée depuis le panneau de commande à gauche.
            </p>
          </div>
        )}

        {/* ── 3. WATERMARK / INCUSTATION LOGO (WHITE-LABEL PRO) ─────────────── */}
        {mediaUrl && !isLoading && (
          <div 
            className="absolute bottom-6 right-6 z-20 pointer-events-auto transition-all duration-300 group-hover:opacity-20 hover:!opacity-10 shadow-lg"
            title={isPro && agencyLogo ? "Logo de l'Agence (Mode Pro Actif)" : "Watermark Archi-Cameroun AI"}
          >
            {isPro && agencyLogo ? (
              /* Logo de l'agence (White-Label) */
              <div className="px-4 py-2.5 rounded-xl bg-anthracite-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center max-w-[160px] h-12">
                <img 
                  src={agencyLogo} 
                  alt="Logo Agence Pro" 
                  className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
              </div>
            ) : isPro ? (
              /* Signature Textuelle Pro élégante en cas de logo absent */
              <div className="px-4 py-2.5 rounded-xl bg-anthracite-950/80 backdrop-blur-md border border-white/10 flex flex-col items-end">
                <span className="text-[9px] font-black text-wood-ocre uppercase tracking-[0.25em] leading-tight">AGENCE PRO</span>
                <span className="text-[7px] font-bold text-white/50 uppercase tracking-widest mt-0.5">Identité Signature</span>
              </div>
            ) : (
              /* Watermark standard gratuit non masquable */
              <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/5 flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-wood-ocre animate-pulse" />
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">
                  Archi-Cameroun AI
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── 4. BOUTON LECTURE CENTRALE (VIDEO UNIQUEMENT) ──────────────────── */}
        {mediaUrl && mediaType === "video" && !isPlaying && !isLoading && (
          <button 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
          >
            <div className="w-16 h-16 rounded-full bg-wood-gradient text-white flex items-center justify-center shadow-2xl shadow-wood-ocre/40 scale-100 hover:scale-105 active:scale-95 transition-all">
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </div>
          </button>
        )}
      </div>

      {/* ── 5. BARRE DE CONTRÔLE INFERIEURE (FLUIDE ET TRANSPARENTE) ────────── */}
      {mediaUrl && !isLoading && (
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          
          {/* Section gauche : Actions spécifiques au média */}
          <div className="flex items-center gap-2">
            {mediaType === "video" && (
              <>
                <button 
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button 
                  onClick={toggleMute}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}
            
            <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-white/5 text-[8px] font-black uppercase tracking-widest text-wood-ocre">
              {mediaType === "video" ? "Veo 3 Animation" : "Imagen 3 Rendu"}
            </span>
          </div>

          {/* Section droite : Actions génériques de fichier */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-wood-gradient text-white text-[9px] font-black uppercase tracking-widest hover:opacity-95 shadow-md shadow-wood-acajou/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger HD
            </button>
            <button 
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
