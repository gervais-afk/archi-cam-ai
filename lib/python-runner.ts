import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface SpawnResult {
    code: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
}

export async function runPythonScript(
    scriptArgs: string[], 
    options?: { 
        cwd?: string; 
        timeoutMs?: number; 
        env?: NodeJS.ProcessEnv 
    }
): Promise<SpawnResult> {
    const { 
        cwd = process.cwd(), 
        timeoutMs = 120000, // 120 secondes par défaut (tolérant pour inpainting lourd)
        env = process.env 
    } = options || {};

    return new Promise<SpawnResult>((resolve, reject) => {
        // Déterminer la commande python correcte selon l'OS
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const scriptPath = path.join(cwd, 'scripts', 'master_plan_processor.py');
        
        console.log(`[python-runner] Executing: ${pythonCmd} "${scriptPath}" ${scriptArgs.join(' ')}`);

        const child: ChildProcess = spawn(pythonCmd, [
            scriptPath,
            ...scriptArgs
        ], {
            cwd,
            env: { ...env, PYTHONIOENCODING: 'utf-8' },
            stdio: ['pipe', 'pipe', 'pipe'] // Capturer les flux
        });

        let stdout = '';
        let stderr = '';
        let completed = false;

        // Capture stdout progressivement (pas en buffer mémoire totale)
        child.stdout?.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            stdout += text;
            // Log léger (ne pas saturer la console)
            if (text.includes('[DEBUG]') || text.includes('[ERROR]') || text.includes('[PERF]') || text.includes('Etape') || text.includes('ETAPE')) {
                console.log(`[PYTHON] ${text.trim()}`);
            }
        });

        child.stderr?.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            stderr += text;
            console.error(`[PYTHON_ERR] ${text.trim()}`);
        });

        // GESTION DU TIMEOUT PROPRE
        const killTimer = setTimeout(() => {
            if (!completed) {
                console.warn(`[TIMEOUT] Killing Python process after ${timeoutMs}ms`);
                child.kill('SIGTERM'); // Tentative douce d'abord
                
                // Si SIGTERM ne suffit pas après 5s, SIGKILL
                setTimeout(() => {
                    try { child.kill('SIGKILL'); } catch(e) {}
                }, 5000);
                
                resolve({ 
                    code: null, 
                    stdout, 
                    stderr: stderr + '\n[KILLED_BY_TIMEOUT]', 
                    timedOut: true 
                });
            }
        }, timeoutMs);

        child.on('close', (code) => {
            completed = true;
            clearTimeout(killTimer); // Important : nettoyer le timer
            
            resolve({
                code,
                stdout,
                stderr,
                timedOut: false
            });
        });

        child.on('error', (err) => {
            completed = true;
            clearTimeout(killTimer);
            reject(err);
        });
    });
}
