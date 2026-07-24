"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, X, Send, Bot, Gavel, Zap, Layers, Search, 
  HelpCircle, Sparkles, BookOpen, AlertCircle, Paperclip, ImageIcon,
  Briefcase, BadgePercent
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent: string;
  sources?: Array<{ document: string; similarity: number }>;
  action?: {
    action: string;
    params: {
      item?: string;
      value: number;
      table?: string;
    }
  };
  attachment?: {
    mimeType: string;
    data: string;
    url?: string;
  };
}

const AGENTS = [
  { id: "router", name: "Routeur", icon: Bot, color: "text-white", glow: "shadow-white/5 bg-white/5 border-white/20", label: "Accueil", desc: "Coordonne et oriente votre projet" },
  { id: "legal", name: "Juridique", icon: Gavel, color: "text-wood-ocre", glow: "shadow-wood-ocre/5 bg-wood-ocre/5 border-wood-ocre/20", label: "Loi 2004", desc: "Expert en droit de l'urbanisme camerounais" },
  { id: "engineer", name: "Technique", icon: Zap, color: "text-ai-glow", glow: "shadow-ai-glow/5 bg-ai-glow/5 border-ai-glow/20", label: "Ingénierie", desc: "Calculs Eurocode 2 & Analyse BIM/IFC" },
  { id: "designer", name: "Conception", icon: Layers, color: "text-purple-400", glow: "shadow-purple-400/5 bg-purple-400/5 border-purple-400/20", label: "Design", desc: "Architecture tropicale & Estimations" },
  { id: "researcher", name: "Prix", icon: Search, color: "text-yellow-400", glow: "shadow-yellow-400/5 bg-yellow-400/5 border-yellow-400/20", label: "Veille", desc: "Marché BTP & prix de la Mercuriale" },
  { id: "conducteur", name: "Conducteur", icon: Briefcase, color: "text-emerald-400", glow: "shadow-emerald-400/5 bg-emerald-400/5 border-emerald-400/20", label: "Chantier & DQE", desc: "Analyse et pilote le DQE de votre projet" },
  { id: "commercial", name: "Commercial", icon: BadgePercent, color: "text-orange-400", glow: "shadow-orange-400/5 bg-orange-400/5 border-orange-400/20", label: "Négociation", desc: "Optimisation de devis, remises et négociation B2B" }
];

const SUGGESTIONS: Record<string, string[]> = {
  router: [
    "Bonjour, comment fonctionne Archi Cam AI ?",
    "J'ai un projet de villa R+1 à Yaoundé, par quoi commencer ?",
    "Qui est l'agent le plus qualifié pour étudier mon sol ?"
  ],
  legal: [
    "Quelles sont les pièces du permis de bâtir au Cameroun ?",
    "Qu'est-ce qu'une zone non-aedificandi ?",
    "Combien de temps dure l'instruction du permis de construire ?"
  ],
  engineer: [
    "Quel dosage de béton pour une dalle R+1 ?",
    "Quelle épaisseur d'enrobage pour Douala (climat côtier) ?",
    "Pouvez-vous m'expliquer les recommandations géotechniques ?"
  ],
  designer: [
    "Combien coûte la construction d'un R+2 standing moyen ?",
    "Quels matériaux locaux durables me conseillez-vous ?",
    "Comment concevoir une bonne ventilation naturelle ?"
  ],
  researcher: [
    "Quel est le prix actuel d'un sac de ciment à Yaoundé ?",
    "Combien coûte un camion de sable de la Sanaga ?",
    "Y a-t-il une inflation sur le fer à béton ce mois-ci ?"
  ],
  conducteur: [
    "Combien coûte le béton sur ce projet ?",
    "Y a-t-il des matériaux à chiffrer manuellement ?",
    "Calculez le budget total estimé de ce DQE."
  ],
  commercial: [
    "Comment réduire le coût de la maçonnerie de 10% ?",
    "Pouvez-vous me proposer un plan d'échelonnement des paiements ?",
    "Quelle remise puis-je espérer sur un achat de 20 tonnes de ciment ?"
  ]
};

interface ChatBotProps {
  projectId?: string;
}

export default function ChatBot({ projectId = "demo-project" }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState("router");
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bienvenue sur l'agence virtuelle **Archi Cam AI** ! 🏛️✨\n\nJe suis votre **Routeur intelligent**. Je suis épaulé par cinq agents spécialisés :\n*   ⚖️ **Agent Juridique** (Lois, Permis de bâtir)\n*   🏗️ **Agent Technique** (Ingénierie BTP, Eurocode 2, IFC)\n*   📐 **Agent Designer** (Plans, Budgets, Architecture tropicale)\n*   🔍 **Agent Researcher** (Prix des matériaux du marché)\n*   💼 **Agent Commercial** (Optimisation, Négociation de devis B2B)\n\nQuelle est votre question aujourd'hui ? Je vais vous guider ou vous pouvez choisir directement votre spécialiste ci-dessous !",
      agent: "router"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ mimeType: string; data: string; url: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if ((!textToSend.trim() && !attachment) || isLoading) return;

    const userMessageText = textToSend;
    const currentAttachment = attachment;
    
    setInput("");
    setAttachment(null);
    setIsLoading(true);

    // Append User Message
    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      role: "user",
      content: userMessageText,
      agent: activeAgent,
      attachment: currentAttachment ? {
        mimeType: currentAttachment.mimeType,
        data: currentAttachment.data,
        url: currentAttachment.url
      } : undefined
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Construct history payload
    const historyPayload = messages
      .filter(m => m.id !== "welcome")
      .map(m => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content
      }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageText,
          agent: activeAgent,
          history: historyPayload,
          model: selectedModel,
          projectId,
          attachment: currentAttachment ? {
            mimeType: currentAttachment.mimeType,
            data: currentAttachment.data
          } : undefined
        })
      });

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      let content = data.content;
      let action: any = null;
      
      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = jsonBlockRegex.exec(content);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed && parsed.action && parsed.params) {
            action = parsed;
            content = content.replace(jsonBlockRegex, "").trim();
            
            // Dispatch dynamic UI action event
            window.dispatchEvent(new CustomEvent("archi-cam-action", {
              detail: parsed
            }));
          }
        } catch (e) {
          console.warn("Failed to parse JSON action block from assistant response:", e);
        }
      }

      // Append Assistant Response
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: content,
        agent: activeAgent,
        sources: data.sources,
        action: action
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Error sending message to chatbot API:", err);
      // Append Error Message
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "⚠️ **Erreur de connexion** : Désolé, je ne parviens pas à joindre le serveur. Veuillez vérifier votre clé API Gemini ou l'état de votre réseau.",
        agent: activeAgent
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      // Re-focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const getAgentHeader = () => {
    return AGENTS.find(a => a.id === activeAgent) || AGENTS[0];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We only accept images and pdfs for now
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      alert("Format non supporté. Veuillez uploader une image ou un PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // split base64 metadata to get raw data
      const data = base64String.split(",")[1];
      setAttachment({
        mimeType: file.type,
        data: data,
        url: URL.createObjectURL(file) // For UI preview
      });
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Helper to render basic markdown bold and bullet points
  const renderFormattedContent = (content: string) => {
    return content.split("\n").map((line, lineIdx) => {
      let formattedLine = line;
      
      // Bold Markdown replacement
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-white font-black">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Check if Bullet Point
      const isBullet = line.trim().startsWith("*") || line.trim().startsWith("-");
      
      if (isBullet) {
        // Strip out leading bullet marker
        const contentOnly = line.replace(/^[\s*-]+/, "").trim();
        return (
          <li key={lineIdx} className="ml-4 list-disc text-anthracite-300 leading-relaxed mb-1 text-xs">
            {parts.length > 0 ? parts : contentOnly}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="text-anthracite-300 leading-relaxed mb-2 text-xs">
          {parts.length > 0 ? parts : formattedLine}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-96 sm:w-[440px] h-[580px] max-h-[calc(100vh-110px)] rounded-2xl bg-anthracite-900/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* 1. Header Widget */}
            <div className="p-4 bg-gradient-to-r from-anthracite-800 to-anthracite-950 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${getAgentHeader().glow} transition-all duration-300`}>
                  {React.createElement(getAgentHeader().icon, { className: `w-5 h-5 ${getAgentHeader().color}` })}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-bold text-sm tracking-wide">Archi Cam Agent</h3>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-ai-glow/10 text-ai-glow border border-ai-glow/20 uppercase tracking-widest font-black">
                      {getAgentHeader().label}
                    </span>
                  </div>
                  <p className="text-[10px] text-anthracite-400 font-medium truncate max-w-[200px] sm:max-w-[240px]">
                    {getAgentHeader().desc}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-lg text-[9px] font-bold text-white px-2 py-1 outline-none focus:border-ai-glow/40 transition-all cursor-pointer"
                >
                  <option value="gemini-3.5-flash">✨ Gemini 3.5 Flash</option>
                  <option value="gemini-2.5-flash-lite">⚡ Gemini 2.5 Lite</option>
                </select>
                
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-anthracite-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Agent Swapper Navigation Tab */}
            <div className="grid grid-cols-6 border-b border-white/5 bg-anthracite-950/60 p-1 gap-1">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setActiveAgent(agent.id);
                    // Add quick router/agent system message on switch if history is empty
                    if (messages.length === 1) {
                      setMessages([
                        {
                          id: `switch-${agent.id}`,
                          role: "assistant",
                          content: `Agent **${agent.name}** activé. ${agent.desc}.\n\nVous pouvez cliquer sur les suggestions de questions ci-dessous ou saisir votre demande technique personnalisée dans le champ de saisie !`,
                          agent: agent.id
                        }
                      ]);
                    }
                  }}
                  className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all duration-300 ${
                    activeAgent === agent.id 
                      ? `${agent.glow} scale-100` 
                      : "border-transparent bg-transparent opacity-40 hover:opacity-80 scale-95"
                  }`}
                  title={agent.desc}
                >
                  {React.createElement(agent.icon, { className: `w-4 h-4 mb-0.5 ${agent.color}` })}
                  <span className="text-[9px] font-black uppercase tracking-wider text-white select-none">
                    {agent.name}
                  </span>
                </button>
              ))}
            </div>

            {/* 3. Messages Window */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-anthracite-950/20 chat-messages">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%] flex gap-2.5 items-start">
                    {msg.role === "assistant" && (
                      <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0 mt-1">
                        {React.createElement(
                          AGENTS.find(a => a.id === msg.agent)?.icon || Bot,
                          { className: `w-3.5 h-3.5 ${AGENTS.find(a => a.id === msg.agent)?.color || "text-white"}` }
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <div className={`p-3 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-wood-ocre to-wood-dark border border-wood-ocre/20 text-white rounded-tr-none"
                          : "bg-anthracite-800/80 border border-white/5 rounded-tl-none"
                      }`}>
                        {msg.role === "user" ? (
                          <div className="flex flex-col gap-2">
                            {msg.attachment?.url && (
                              <div className="relative rounded-lg overflow-hidden border border-white/10 max-w-[200px]">
                                {msg.attachment.mimeType.startsWith("image/") ? (
                                  <img src={msg.attachment.url} alt="Uploaded attachment" className="w-full h-auto object-cover" />
                                ) : (
                                  <div className="flex items-center gap-2 p-3 bg-black/40 text-xs">
                                    <Paperclip className="w-4 h-4" />
                                    <span className="truncate">Document joint</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs leading-relaxed text-white font-medium">{msg.content}</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {renderFormattedContent(msg.content)}
                            {msg.action && (
                              <div className="mt-3 p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2.5 text-[10px] text-green-400 font-bold uppercase tracking-wider animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                                {msg.action.action === "update_supabase_record" ? (
                                  `💾 BDD Mise à jour : Table "${msg.action.params.table}"`
                                ) : (
                                  `🛠️ Action BTP : ${msg.action.action === "update_devis_price" 
                                    ? `Prix "${msg.action.params.item}" -> ${msg.action.params.value.toLocaleString()} FCFA`
                                    : msg.action.action === "update_devis_quantity"
                                    ? `Quantité "${msg.action.params.item}" -> ${msg.action.params.value}`
                                    : `Surface -> ${msg.action.params.value} m²`
                                  }`
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Display RAG citations if present */}
                      {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
                          <BookOpen className="w-3 h-3 text-ai-glow" />
                          <span className="text-[9px] text-ai-glow/80 font-bold uppercase tracking-wider mr-1">RAG Sources :</span>
                          {msg.sources.map((src, srcIdx) => (
                            <span 
                              key={srcIdx}
                              className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 border border-white/10 text-anthracite-300 font-bold truncate max-w-[120px]"
                              title={`Similarité: ${Math.round(src.similarity * 100)}%`}
                            >
                              {src.document.replace(".txt", "")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex gap-2.5 items-start">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0 mt-1 animate-pulse">
                      {React.createElement(getAgentHeader().icon, { className: `w-3.5 h-3.5 ${getAgentHeader().color}` })}
                    </div>
                    <div className="bg-anthracite-800/80 border border-white/5 p-3 rounded-2xl rounded-tl-none flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 4. Suggestion Chips Bar */}
            <div className="px-4 py-2 border-t border-white/5 bg-anthracite-950/40">
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/10 select-none">
                {SUGGESTIONS[activeAgent].map((sug, sugIdx) => (
                  <button
                    key={sugIdx}
                    onClick={() => handleSendMessage(sug)}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] text-anthracite-300 hover:text-white hover:bg-white/10 transition-all font-semibold active:scale-95"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Input Text Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="p-3 bg-gradient-to-r from-anthracite-950 to-anthracite-900 border-t border-white/10 flex flex-col gap-2"
            >
              {/* Attachment Preview UI */}
              {attachment && (
                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5 w-fit">
                  {attachment.mimeType.startsWith("image/") ? (
                    <img src={attachment.url} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg">
                      <Paperclip className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col max-w-[150px]">
                    <span className="text-[9px] text-white font-bold truncate">Pièce jointe</span>
                    <span className="text-[8px] text-anthracite-500 truncate">{attachment.mimeType}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setAttachment(null)}
                    className="p-1 hover:bg-white/10 rounded-lg ml-1"
                  >
                    <X className="w-3 h-3 text-anthracite-300" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp, application/pdf"
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-anthracite-300 hover:text-white transition-all shrink-0"
                  title="Joindre un fichier (Image ou PDF)"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Demandez à l'Agent ${getAgentHeader().name}...`}
                  disabled={isLoading}
                  className="flex-1 py-2 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-anthracite-500 focus:outline-none focus:border-ai-glow/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && !attachment) || isLoading}
                  className="p-2 rounded-xl bg-gradient-to-r from-wood-ocre to-wood-dark text-white border border-wood-ocre/20 hover:opacity-90 active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-wood-ocre/10"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Magnet Action Sphere Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-wood-ocre to-wood-dark border border-wood-ocre/30 shadow-2xl flex items-center justify-center text-white relative group"
      >
        <span className="absolute inset-0 rounded-full bg-ai-glow/20 opacity-0 group-hover:opacity-100 transition-opacity blur duration-500"></span>
        <MessageSquare className="w-6 h-6 shrink-0 relative z-10" />
        
        {/* Animated Badge pulse */}
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ai-glow text-black font-black text-[9px] flex items-center justify-center animate-bounce shadow-md">
          🤖
        </span>
      </motion.button>
    </div>
  );
}
