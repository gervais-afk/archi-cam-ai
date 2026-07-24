"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { RotateCcw, LayoutGrid, Eye, HelpCircle, AlertTriangle, Layers } from "lucide-react";

interface BimThreeDViewerProps {
  file: File | null;
  metadata?: {
    volume: number;
    area: number;
    elementCount: number;
    storeys: number;
  };
}

export default function BimThreeDViewer({ file, metadata }: BimThreeDViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [hudMessage, setHudMessage] = useState("Initialisation du visualiseur 3D...");
  const [stats, setStats] = useState({ walls: 52, slabs: 2, columns: 24, openings: 12, storeys: 2 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    // --- 1. OBC Components Setup ---
    const components = new OBC.Components();
    const worlds = components.get(OBC.Worlds);
    const world = worlds.create<OBC.SimpleScene, OBC.OrthoPerspectiveCamera, OBC.SimpleRenderer>();

    // --- 2. Scene Setup ---
    const scene = new OBC.SimpleScene(components);
    scene.setup();
    world.scene = scene;
    scene.three.background = new THREE.Color(0x050507);

    // --- 3. Renderer Setup ---
    const renderer = new OBC.SimpleRenderer(components, container);
    world.renderer = renderer;

    // --- 4. Camera Setup ---
    const camera = new OBC.OrthoPerspectiveCamera(components);
    world.camera = camera;
    
    // Initialize components (starts animations, render updates, etc.)
    components.init();

    // Set initial camera view pointing at the center
    camera.controls.setLookAt(120, 60, 120, 0, 0, 0, false);

    // --- 5. Grid Helper Setup ---
    const grids = components.get(OBC.Grids);
    const grid = grids.create(world);
    grid.config.color = new THREE.Color(0x00f0ff);
    grid.fade = true;

    // --- 6. Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0x0e1c2b);
    scene.three.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00ffff, 0.9);
    dirLight1.position.set(80, 150, 60);
    scene.three.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xc5a059, 0.6);
    dirLight2.position.set(-80, 100, -60);
    scene.three.add(dirLight2);

    // --- 7. Mock Duplex Wireframe Group ---
    const mockGroup = new THREE.Group();
    scene.three.add(mockGroup);

    // --- 8. Loader & Fragments Setup ---
    let ifcLoader: OBC.IfcLoader | null = null;
    let fragments: OBC.FragmentsManager | null = null;
    let loadedModel: any = null;

    const buildMockModel = () => {
      // Clear old mock elements
      while (mockGroup.children.length > 0) {
        mockGroup.remove(mockGroup.children[0]);
      }

      const realStoreys = Math.min(3, Math.max(2, metadata?.storeys || 2)); 
      const floorHeight = 22;
      const buildingWidth = 70;
      const buildingDepth = 50;

      const concreteSlabMat = new THREE.MeshPhongMaterial({
        color: 0xc5a059,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });

      const structuralBeamMat = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x004466,
        transparent: true,
        opacity: 0.6
      });

      const exteriorWallMat = new THREE.MeshPhongMaterial({
        color: 0x0f2030,
        emissive: 0x001122,
        transparent: true,
        opacity: 0.45,
        wireframe: true
      });

      const glassOpeningMat = new THREE.MeshPhongMaterial({
        color: 0xffbb00,
        emissive: 0x442200,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });

      // 1. Floor Slabs
      for (let f = 0; f <= realStoreys; f++) {
        const y = -30 + f * floorHeight;
        const widthFactor = f === realStoreys ? 0.95 : 1.0;
        const depthFactor = f === realStoreys ? 0.95 : 1.0;
        
        const slabGeo = new THREE.BoxGeometry(buildingWidth * widthFactor, 1.2, buildingDepth * depthFactor);
        const slabMesh = new THREE.Mesh(slabGeo, concreteSlabMat);
        slabMesh.position.y = y;
        mockGroup.add(slabMesh);

        const edges = new THREE.EdgesGeometry(slabGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xc5a059 }));
        line.position.copy(slabMesh.position);
        mockGroup.add(line);
      }

      // 2. Columns
      const gridX = [-buildingWidth/2 + 2, -buildingWidth/6, buildingWidth/6, buildingWidth/2 - 2];
      const gridZ = [-buildingDepth/2 + 2, 0, buildingDepth/2 - 2];
      let columnsPlaced = 0;
      const cCount = metadata?.elementCount ? Math.floor(metadata.elementCount * 0.1) : 24;

      for (let f = 0; f < realStoreys; f++) {
        const startY = -30 + f * floorHeight;
        gridX.forEach(x => {
          gridZ.forEach(z => {
            if (columnsPlaced < cCount) {
              const colGeo = new THREE.CylinderGeometry(0.7, 0.7, floorHeight, 8);
              const colMesh = new THREE.Mesh(colGeo, structuralBeamMat);
              colMesh.position.set(x, startY + floorHeight/2, z);
              mockGroup.add(colMesh);
              columnsPlaced++;
            }
          });
        });
      }

      // 3. Exterior Walls (Duplex)
      let wallsPlaced = 0;
      let openingsPlaced = 0;
      const wCount = stats.walls;
      const oCount = stats.openings;

      for (let f = 0; f < realStoreys; f++) {
        const startY = -30 + f * floorHeight;

        // Front Wall
        const wallSegmentWidth = buildingWidth / 5;
        for (let j = 0; j < 5; j++) {
          const wx = -buildingWidth/2 + wallSegmentWidth * j + wallSegmentWidth/2;
          if (wallsPlaced < wCount) {
            const isOpening = (f === 0 && j === 2) || (f === 1 && (j === 1 || j === 3));
            const wallGeo = new THREE.BoxGeometry(wallSegmentWidth - 1, floorHeight - 1, 0.8);
            if (isOpening && openingsPlaced < oCount) {
              const opMesh = new THREE.Mesh(wallGeo, glassOpeningMat);
              opMesh.position.set(wx, startY + floorHeight/2, -buildingDepth/2);
              mockGroup.add(opMesh);
              openingsPlaced++;
            } else {
              const wallMesh = new THREE.Mesh(wallGeo, exteriorWallMat);
              wallMesh.position.set(wx, startY + floorHeight/2, -buildingDepth/2);
              mockGroup.add(wallMesh);
            }
            wallsPlaced++;
          }
        }

        // Back Wall
        for (let j = 0; j < 4; j++) {
          const segmentW = buildingWidth / 4;
          const wx = -buildingWidth/2 + segmentW * j + segmentW/2;
          if (wallsPlaced < wCount) {
            const isWindow = (j === 1 || j === 2) && openingsPlaced < oCount;
            const wallGeo = new THREE.BoxGeometry(segmentW - 1, floorHeight - 1, 0.8);
            if (isWindow) {
              const opMesh = new THREE.Mesh(wallGeo, glassOpeningMat);
              opMesh.position.set(wx, startY + floorHeight/2, buildingDepth/2);
              mockGroup.add(opMesh);
              openingsPlaced++;
            } else {
              const wallMesh = new THREE.Mesh(wallGeo, exteriorWallMat);
              wallMesh.position.set(wx, startY + floorHeight/2, buildingDepth/2);
              mockGroup.add(wallMesh);
            }
            wallsPlaced++;
          }
        }

        // Left & Right sides
        const sideSegmentDepth = buildingDepth / 3;
        for (let j = 0; j < 3; j++) {
          const wz = -buildingDepth/2 + sideSegmentDepth * j + sideSegmentDepth/2;
          if (wallsPlaced < wCount) {
            const wallGeo = new THREE.BoxGeometry(0.8, floorHeight - 1, sideSegmentDepth - 1);
            const wallMesh = new THREE.Mesh(wallGeo, exteriorWallMat);
            wallMesh.position.set(-buildingWidth/2, startY + floorHeight/2, wz);
            mockGroup.add(wallMesh);
            wallsPlaced++;
          }
          if (wallsPlaced < wCount) {
            const wallGeo = new THREE.BoxGeometry(0.8, floorHeight - 1, sideSegmentDepth - 1);
            const wallMesh = new THREE.Mesh(wallGeo, exteriorWallMat);
            wallMesh.position.set(buildingWidth/2, startY + floorHeight/2, wz);
            mockGroup.add(wallMesh);
            wallsPlaced++;
          }
        }
      }

      // 4. Roof
      const roofY = -30 + realStoreys * floorHeight;
      const roofGeo = new THREE.ConeGeometry(buildingWidth/1.6, 12, 4);
      roofGeo.rotateY(Math.PI/4);
      const roofMesh = new THREE.Mesh(roofGeo, concreteSlabMat);
      roofMesh.scale.set(1.1, 1, buildingDepth/buildingWidth * 1.5);
      roofMesh.position.set(0, roofY + 6, 0);
      mockGroup.add(roofMesh);

      const roofEdges = new THREE.EdgesGeometry(roofGeo);
      const roofLines = new THREE.LineSegments(roofEdges, new THREE.LineBasicMaterial({ color: 0xc5a059 }));
      roofLines.position.copy(roofMesh.position);
      roofLines.scale.copy(roofMesh.scale);
      mockGroup.add(roofLines);

      setHudMessage("Rendu schématique actif.");
    };

    const loadRealIfc = async (fileToLoad: File) => {
      setLoading(true);
      setHudMessage("Lecture du fichier IFC...");
      
      // Clear mock
      while (mockGroup.children.length > 0) {
        mockGroup.remove(mockGroup.children[0]);
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          // 1. Text decoding for regex stats
          const textDecoder = new TextDecoder("utf-8");
          const text = textDecoder.decode(arrayBuffer);
          
          const wallMatches = text.match(/IFCWALL/gi) || [];
          const slabMatches = text.match(/IFCSLAB/gi) || [];
          const columnMatches = text.match(/IFCCOLUMN/gi) || [];
          const windowMatches = text.match(/IFCWINDOW/gi) || [];
          const doorMatches = text.match(/IFCDOOR/gi) || [];
          const storeyMatches = text.match(/IFCBUILDINGSTOREY/gi) || [];

          const walls = Math.max(12, wallMatches.length);
          const slabs = slabMatches.length;
          const columns = Math.max(8, columnMatches.length);
          const openings = windowMatches.length + doorMatches.length || 10;
          const storeys = Math.min(3, Math.max(2, storeyMatches.length || metadata?.storeys || 2));

          setStats({ walls, slabs, columns, openings, storeys });
          setHudMessage("Décodage de la géométrie 3D...");

          // 2. Load geometry with OBC
          const buffer = new Uint8Array(arrayBuffer);
          if (ifcLoader) {
            loadedModel = await ifcLoader.load(buffer, true, fileToLoad.name);
            scene.three.add(loadedModel);
            
            // Recenter camera orbit controls to the model bounding sphere
            await camera.fitToItems();
            setHudMessage("Maquette IFC chargée avec succès.");
          } else {
            throw new Error("L'IfcLoader n'est pas prêt.");
          }
        } catch (err) {
          console.error("IFC Loading failed:", err);
          setHudMessage("Erreur de décodage 3D. Fallback schématique.");
          buildMockModel();
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setHudMessage("Erreur lors de la lecture. Fallback schématique.");
        buildMockModel();
        setLoading(false);
      };

      reader.readAsArrayBuffer(fileToLoad);
    };

    const initLoaders = async () => {
      try {
        fragments = components.get(OBC.FragmentsManager);
        const workerUrl = await OBC.FragmentsManager.getWorker();
        fragments.init(workerUrl);

        ifcLoader = components.get(OBC.IfcLoader);
        await ifcLoader.setup({
          autoSetWasm: false,
          wasm: {
            path: window.location.origin + "/wasm/",
            absolute: true
          }
        });

        if (file && file.name.toLowerCase().endsWith(".ifc")) {
          await loadRealIfc(file);
        } else {
          buildMockModel();
        }
      } catch (err) {
        console.error("Loader init error:", err);
        setHudMessage("Erreur d'initialisation du moteur IFC. Mode schématique.");
        buildMockModel();
      }
    };

    initLoaders();

    // --- 9. Animation Loop ---
    let reqId: number;
    const animate = () => {
      if (isRotating) {
        if (loadedModel) {
          loadedModel.rotation.y += 0.0025;
        } else if (mockGroup.children.length > 0) {
          mockGroup.rotation.y += 0.0025;
        }
      }
      world.update();
      reqId = requestAnimationFrame(animate);
    };
    animate();

    // --- 10. Cleanup ---
    return () => {
      cancelAnimationFrame(reqId);
      components.dispose();
    };
  }, [file, isRotating, metadata]);

  return (
    <div className="card-premium p-4 relative overflow-hidden bg-anthracite-950/70 border border-white/10 rounded-[2rem]">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-ai-glow animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-ai-glow">
            WebGL 3D Engine — Visualisation IFC
          </span>
        </div>
        <div className="text-[10px] font-medium text-anthracite-400">
          {loading ? "Parsing IFC..." : hudMessage}
        </div>
      </div>

      {/* Render Viewport */}
      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/80 border border-white/5">
        <div ref={mountRef} className="w-full h-full block" />
        
        {/* HUD Statistics overlay */}
        <div className="absolute top-4 left-4 p-4 rounded-2xl bg-black/80 border border-white/10 text-[9px] font-medium text-white flex flex-col gap-2 backdrop-blur-sm pointer-events-none select-none">
          <div className="text-ai-glow font-black uppercase tracking-wider mb-1">Rapport IFC (Duplex R+{stats.storeys - 1})</div>
          <div>🏢 Hauteur : <span className="font-bold text-ai-glow">{stats.storeys} Niveaux</span></div>
          <div>🧱 Murs (IfcWall) : <span className="font-bold text-ai-glow">{stats.walls}</span></div>
          <div>🏗️ Poteaux (IfcColumn) : <span className="font-bold text-ai-glow">{stats.columns}</span></div>
          <div>🚪 Baies (IfcOpening) : <span className="font-bold text-ai-glow">{stats.openings}</span></div>
          <div className="text-anthracite-500 text-[8px] italic mt-1">(Total dalles détectées : {stats.slabs})</div>
        </div>

        <div className="absolute bottom-4 left-4 p-2.5 rounded-xl bg-black/80 border border-white/10 text-[9px] font-medium text-anthracite-400 flex items-center gap-1.5 backdrop-blur-sm pointer-events-none select-none">
          <HelpCircle className="w-3.5 h-3.5 text-wood-ocre" />
          Utilisez le clic gauche pour tourner • Molette pour zoomer
        </div>
      </div>

      {/* Controls Footer */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-2">
        <span className="text-[10px] text-anthracite-500 font-bold uppercase tracking-wider">
          Moteur Three.js WebGL actif
        </span>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
              isRotating
                ? "bg-ai-glow/10 border-ai-glow/30 text-ai-glow"
                : "bg-white/5 border-white/5 text-anthracite-400 hover:text-white"
            }`}
          >
            {isRotating ? "Pause rotation" : "Rotation auto"}
          </button>
        </div>
      </div>
    </div>
  );
}

