import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const qualityTiers = [
  { id: 'economy', name: 'Economy / Budget Finish', baseRatePerSqft: 1450, desc: 'Basic standard bricks, vitrified tiles, basic fittings' },
  { id: 'standard', name: 'Standard / Premium Finish', baseRatePerSqft: 1850, desc: 'Quality RCC frame, branded CP fittings, teakwood doors' },
  { id: 'luxury', name: 'Luxury / High-End Quality', baseRatePerSqft: 2450, desc: 'Italian marble, VRV AC wiring, high-end automated fixtures' }
];

const stagesDistribution = [
  { name: '1. Foundation & Substructure', pct: 15 },
  { name: '2. RCC Structure (Columns, Beams, Slabs)', pct: 25 },
  { name: '3. Brickwork & Masonry Walls', pct: 12 },
  { name: '4. Internal & External Plastering', pct: 8 },
  { name: '5. Flooring & Tiling', pct: 10 },
  { name: '6. Electrical & Plumbing Lines', pct: 10 },
  { name: '7. Doors, Windows & Carpentry', pct: 8 },
  { name: '8. Painting & Final Finishes', pct: 7 },
  { name: '9. Contingency & Admin', pct: 5 }
];

export default function TotalProjectEstimator({ isProjectMode = false, onAddOn }) {
  const [plotAreaSqft, setPlotAreaSqft] = useState(1500);
  const [numFloors, setNumFloors] = useState(2); // G+1
  const [builtUpCoveragePct, setBuiltUpCoveragePct] = useState(70); // 70% coverage per floor
  const [tierId, setTierId] = useState('standard');
  const [currency, setCurrency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handlePrint = () => window.print();

  // --- Three.js Setup ---
  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
    sceneRef.current = scene;

    const container = mountRef.current;
    if (!container) return;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 0.1, 1000);
    camera.position.set(18, 16, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.setSize(initialWidth, initialHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.maxDistance = 300;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const grid = new THREE.GridHelper(40, 40, 0x0ea5e9, 0x334155);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // --- Calculation & 3D Building Generator ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [plotAreaSqft, numFloors, builtUpCoveragePct, tierId, visualTheme]);

  const calculateAndRender = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedTier = qualityTiers.find(t => t.id === tierId) || qualityTiers[1];

    const plotSqft = parseFloat(plotAreaSqft) || 1500;
    const floors = Math.max(1, Math.floor(parseFloat(numFloors) || 1));
    const coverage = Math.min(100, Math.max(20, parseFloat(builtUpCoveragePct) || 70));

    const floorAreaSqft = plotSqft * (coverage / 100);
    const totalBuiltUpSqft = floorAreaSqft * floors;
    const totalBuiltUpSqm = totalBuiltUpSqft / 10.7639;

    const baseProjectCost = totalBuiltUpSqft * selectedTier.baseRatePerSqft;

    const stageBreakdown = stagesDistribution.map(s => ({
      ...s,
      stageAmount: (baseProjectCost * s.pct) / 100
    }));

    setResults({
      floors,
      floorAreaSqft,
      totalBuiltUpSqft,
      totalBuiltUpSqm,
      baseProjectCost,
      stageBreakdown,
      selectedTier
    });

    // 3D Parametric Multi-Story Building
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicBuilding') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicBuilding';

    const isBlueprint = visualTheme === 'blueprint';
    const floorH = 2.4; // 2.4m per floor in 3D scale
    const buildingW = Math.sqrt(floorAreaSqft) * 0.2;
    const buildingL = buildingW * 1.2;

    const slabMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0ea5e9 : 0x64748b,
      wireframe: isBlueprint
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x38bdf8 : 0xe2e8f0,
      wireframe: isBlueprint,
      transparent: true,
      opacity: isBlueprint ? 0.3 : 0.85
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0284c7 : 0x334155
    });

    for (let f = 0; f < floors; f++) {
      const floorBaseY = f * floorH;

      // Slab
      const slabGeom = new THREE.BoxGeometry(buildingL, 0.2, buildingW);
      slabGeom.translate(0, floorBaseY + 0.1, 0);
      mainGroup.add(new THREE.Mesh(slabGeom, slabMat));

      // 4 Corner Columns
      const colGeom = new THREE.BoxGeometry(0.3, floorH, 0.3);
      const addCol = (cx, cz) => {
        const m = new THREE.Mesh(colGeom, columnMat);
        m.position.set(cx, floorBaseY + (floorH / 2), cz);
        mainGroup.add(m);
      };
      addCol(-buildingL/2 + 0.2, -buildingW/2 + 0.2);
      addCol(buildingL/2 - 0.2, -buildingW/2 + 0.2);
      addCol(-buildingL/2 + 0.2, buildingW/2 - 0.2);
      addCol(buildingL/2 - 0.2, buildingW/2 - 0.2);

      // Infill Glass / Walls
      const wallGeom = new THREE.BoxGeometry(buildingL * 0.9, floorH * 0.8, buildingW * 0.9);
      wallGeom.translate(0, floorBaseY + (floorH / 2), 0);
      mainGroup.add(new THREE.Mesh(wallGeom, wallMat));
    }

    // Roof Slab
    const roofGeom = new THREE.BoxGeometry(buildingL + 0.4, 0.2, buildingW + 0.4);
    roofGeom.translate(0, (floors * floorH) + 0.1, 0);
    mainGroup.add(new THREE.Mesh(roofGeom, slabMat));

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Total Project Estimator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Complete 10-stage building budget, multi-story 3D generator & cash flow</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic 3D' : 'Blueprint Wire'}
          </button>

          <button onClick={handlePrint} className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Project Scope & Quality Tier</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Construction Quality Specification</label>
              <select value={tierId} onChange={e => setTierId(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                {qualityTiers.map(q => <option key={q.id} value={q.id}>{q.name} ({currency}{q.baseRatePerSqft}/sq.ft)</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Plot Area (sq.ft)</label>
                <input type="number" value={plotAreaSqft} onChange={e => setPlotAreaSqft(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Floors (G+N)</label>
                <input type="number" value={numFloors} onChange={e => setNumFloors(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Coverage (%)</label>
                <input type="number" value={builtUpCoveragePct} onChange={e => setBuiltUpCoveragePct(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-dashboard rounded-xl border border-slate-200/60 dark:border-borderDark">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Built-Up Area:</span>
                <span className="font-bold text-slate-800 dark:text-white">{results?.totalBuiltUpSqft?.toFixed(0)} sq.ft ({results?.totalBuiltUpSqm?.toFixed(1)} m²)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Benchmark Rate:</span>
                <span className="font-bold text-cyan-500">{currency}{results?.selectedTier?.baseRatePerSqft} / sq.ft</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Parametric Multi-Story Structure</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Total Estimated Budget</p>
              <p className="text-xl font-bold text-cyan-400">{currency}{results?.baseProjectCost?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          {/* 10-Stage Milestone Breakdown */}
          <div className="p-4 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-3">Construction Stages & Cash Flow Schedule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {results?.stageBreakdown?.map((stage, i) => (
                <div key={i} className="p-2.5 bg-slate-50 dark:bg-dashboard rounded-xl border border-slate-200/60 dark:border-borderDark flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800 dark:text-zinc-200 truncate">{stage.name}</p>
                    <p className="text-[10px] text-cyan-500 font-bold">{stage.pct}% Milestone</p>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {currency}{stage.stageAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
