import { agentConducteurTravaux } from "../lib/genkit-agent";

async function testRAG() {
  console.log("🚀 Lancement du test de l'Agent RAG...");
  
  const projectId = "79fe8da5-e868-4433-bda0-85b318481e6f";
  const question = "Je souhaite construire une villa R+1 sur un sol marécageux. As-tu des exemples de projets similaires dans notre historique pour m'aider à estimer et concevoir ?";

  try {
    const result = await agentConducteurTravaux({
      projectId,
      question
    });
    
    console.log("\n✅ Réponse de l'Agent :");
    console.log("=========================================");
    console.log(result);
    console.log("=========================================");
    
  } catch (error) {
    console.error("❌ Erreur du test:", error);
  }
}

testRAG();
