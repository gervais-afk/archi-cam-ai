"use client";

/**
 * PREMIUM HERO COMPONENT — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Inspiré par les standards Vercel/Linear/Stripe.
 * 
 * Architecture visuelle :
 * 1. Arrière-plan : Grille architecturale animée + Halo radial "breathing".
 * 2. Typographie : H1 massif avec dégradé cinématique.
 * 3. CTA : Double entrée B2C/B2B avec micro-interactions Framer Motion.
 */

import { motion } from "framer-motion";
import { ArrowRight, Home, CubeIcon, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-anthracite-950 flex items-center justify-center overflow-hidden pt-20">
      
      {/* ── BACKGROUND ARCHITECTURAL (Grille + Halo) ──────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Grille de fond (Blueprint style) */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Halo de lumière respirant (Breathing Gradient) */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full blur-[160px]"
          style={{
            background: "radial-gradient(circle, rgba(0, 240, 255, 0.08) 0%, rgba(79, 70, 229, 0.03) 50%, transparent 100%)"
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Effet de grain subtil pour le côté "premium" */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        
        {/* Badge "Beta" ou Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 text-ai-glow" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-anthracite-400">
            L&apos;IA au service du BTP Africain
          </span>
        </motion.div>

        {/* TITRE PRINCIPAL (Cinematic Gradient) */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display font-black text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight mb-8"
        >
          <span className="text-white">Construisez l&apos;Afrique</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-anthracite-500">
            de Demain avec 
          </span>{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai-glow to-ai-deep">
            l&apos;IA.
          </span>
        </motion.h1>

        {/* SOUS-TITRE */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl mx-auto text-anthracite-400 text-lg md:text-xl font-light leading-relaxed mb-12"
        >
          De l&apos;esquisse 2D au fichier IFC, <span className="text-white font-medium">Archi Cam AI</span> automatise vos devis, 
          génère vos CCTP et valide vos normes en quelques secondes.
        </motion.p>

        {/* CTA DUAL (B2C / B2B) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          {/* Bouton Primaire — Particuliers */}
          <Link href="/dashboard" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-shadow hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <Home className="w-4 h-4" />
              Espace Particuliers
            </motion.button>
          </Link>

          {/* Bouton Secondaire — Professionnels (BIM) */}
          <Link href="/dashboard" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-anthracite-900 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest backdrop-blur-md transition-all hover:bg-white/5 hover:border-white/20"
            >
              {/* Note: CubeIcon is an alias for Box in lucide */}
              <div className="w-4 h-4 text-ai-glow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
              </div>
              Espace Professionnels (BIM)
            </motion.button>
          </Link>
        </motion.div>

        {/* SOCIAL PROOF / TECH STACK */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-24 pt-10 border-t border-white/5 flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-40"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-ai-glow" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Google Gemini Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-wood-ocre" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">IfcOpenShell</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white">Supabase BTP Data</span>
          </div>
        </motion.div>
      </div>

      {/* Decorative Bottom Gradient Line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
    </section>
  );
}
