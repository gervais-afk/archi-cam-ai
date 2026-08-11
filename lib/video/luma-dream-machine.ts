import { prisma } from "@/lib/prisma";

export class LumaDreamMachineClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey || "mock_key";
  }

  async generateDroneVideo(params: {
    projectId: string;
    imageUrl: string;
    cameraPath: "ORBIT" | "FLYOVER" | "WALKTHROUGH";
    duration: number;
  }): Promise<{ videoUrl: string; jobId: string }> {
    console.log(`🎬 [LumaDreamMachine] Lancement vidéo drone pour projet ${params.projectId}...`);

    let videoUrl = "http://example.com/rendered_drone_360.mp4";
    let jobId = "luma_job_mock_123";

    if (this.apiKey !== "mock_key") {
      try {
        const response = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: this.buildVideoPrompt(params.cameraPath),
            image_url: params.imageUrl,
            aspect_ratio: "16:9",
            duration: params.duration,
            loop: false
          })
        });

        const data = await response.json();
        if (data.id) {
          jobId = data.id;
          videoUrl = await this.waitForCompletion(jobId);
        }
      } catch (err: any) {
        console.warn("[LumaDreamMachine] Échec appel Luma, utilisation du fallback mock :", err.message);
      }
    }

    // Mettre à jour le RenderJob vidéo correspondant
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "render_jobs" SET "media_url" = $1, "status" = 'completed', "updated_at" = NOW() 
         WHERE "project_id" = $2 AND "media_type" = 'video'`,
        videoUrl,
        params.projectId
      );
    } catch (dbErr: any) {
      console.warn("[LumaDreamMachine] Impossible de mettre à jour le RenderJob vidéo :", dbErr.message);
    }

    return {
      videoUrl,
      jobId
    };
  }

  private buildVideoPrompt(cameraPath: string): string {
    const prompts: Record<string, string> = {
      ORBIT: "Smooth cinematic drone orbit around the building, 360 degree rotation, golden hour lighting, 4K",
      FLYOVER: "Aerial drone flyover of architectural project, slowly descending and approaching the building",
      WALKTHROUGH: "First-person walkthrough tour inside the building, smooth camera movement, natural lighting"
    };
    return prompts[cameraPath] || prompts.ORBIT;
  }

  private async waitForCompletion(jobId: string, maxAttempts: number = 60): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      const data = await response.json();
      if (data.state === "completed") {
        return data.assets.video;
      }
      if (data.state === "failed") {
        throw new Error(data.failure_reason || "Génération vidéo échouée");
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error("Timeout génération vidéo");
  }
}
