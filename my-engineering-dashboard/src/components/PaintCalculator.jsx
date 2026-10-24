import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

const paintTypes = [
  { id: 'interior_emulsion', name: 'Interior Premium Emulsion', coveragePerLiterSqft: 140, primerCoats: 1, puttyCoats: 2, paintCoats: 2, color: '#f8fafc' },
  { id: 'exterior_weather', name: 'Exterior Weatherproof Emulsion', coveragePerLiterSqft: 110, primerCoats: 1, puttyCoats: 1, paintCoats: 2, color: '#fef08a' },
  { id: 'enamel_gloss', name: 'Synthetic Enamel (Doors/Metal)', coveragePerLiterSqft: 120, primerCoats: 1, puttyCoats: 0, paintCoats: 2, color: '#93c5fd' },
  { id: 'distemper', name: 'Acrylic Distemper (Economy)', coveragePerLiterSqft: 160, primerCoats: 1, puttyCoats: 1, paintCoats: 2, color: '#f1f5f9' }
];

export default function PaintCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    paintTypeId: 'interior_emulsion',
    roomLength: 16,
    roomWidth: 12,
    roomHeight: 10,
    includeCeiling: true,
    doorCount: 2,
    doorWidth: 3,
    doorHeight: 7,
    windowCount: 2,
    windowWidth: 4,
    windowHeight: 4,
    // Rates
    paintPricePerLiter: 380,
    primerPricePerLiter: 180,
    puttyPricePerKg: 28,
    laborRatePerSqft: 15,
    currency: '₹'
  });

  const [wallColor, setWallColor] = useState('#38bdf8');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsed = type === 'checkbox' ? checked : (['currency', 'paintTypeId'].includes(name) ? value : parseFloat(value) || 0);
    if (typeof parsed === 'number') parsed = Math.max(0, parsed);
    setInputs(prev => ({ ...prev, [name]: parsed }));
  };

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
    camera.position.set(16, 12, 16);
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
    controls.maxDistance = 250;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 20, 15);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x334155);
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

  // --- Calculation & 3D Room Rendering ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, wallColor, visualTheme]);

  const calculateAndRender = () => {
    const { paintTypeId, roomLength, roomWidth, roomHeight, includeCeiling, doorCount, doorWidth, doorHeight, windowCount, windowWidth, windowHeight, paintPricePerLiter, primerPricePerLiter, puttyPricePerKg, laborRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedPaint = paintTypes.find(p => p.id === paintTypeId) || paintTypes[0];

    const lenFt = roomLength * (unitSystem === 'm' ? 3.28084 : 1);
    const widFt = roomWidth * (unitSystem === 'm' ? 3.28084 : 1);
    const htFt = roomHeight * (unitSystem === 'm' ? 3.28084 : 1);

    const grossWallAreaSqft = 2 * (lenFt + widFt) * htFt;
    const ceilingAreaSqft = includeCeiling ? (lenFt * widFt) : 0;

    const doorsAreaSqft = doorCount * (doorWidth * doorHeight);
    const windowsAreaSqft = windowCount * (windowWidth * windowHeight);
    const totalDeductionsSqft = doorsAreaSqft + windowsAreaSqft;

    const netPaintableAreaSqft = Math.max(10, grossWallAreaSqft + ceilingAreaSqft - totalDeductionsSqft);
    const netPaintableAreaSqm = netPaintableAreaSqft / 10.7639;

    // Paint, Primer, Putty Takeoff
    const paintLiters = (netPaintableAreaSqft * selectedPaint.paintCoats) / selectedPaint.coveragePerLiterSqft;
    const primerLiters = (netPaintableAreaSqft * selectedPaint.primerCoats) / (selectedPaint.coveragePerLiterSqft * 1.2);
    const puttyKg = selectedPaint.puttyCoats > 0 ? (netPaintableAreaSqft * selectedPaint.puttyCoats * 0.15) : 0; // ~0.15kg/sqft per coat

    // Cans Breakdown (20L, 10L, 4L, 1L)
    const can20L = Math.floor(paintLiters / 20);
    const rem20 = paintLiters % 20;
    const can10L = Math.floor(rem20 / 10);
    const rem10 = rem20 % 10;
    const can4L = Math.floor(rem10 / 4);
    const can1L = Math.ceil(rem10 % 4);

    // Costing
    const costPaint = paintLiters * paintPricePerLiter;
    const costPrimer = primerLiters * primerPricePerLiter;
    const costPutty = puttyKg * puttyPricePerKg;
    const costLabor = netPaintableAreaSqft * laborRatePerSqft;
    const grandTotal = costPaint + costPrimer + costPutty + costLabor;

    setResults({
      grossWallAreaSqft,
      ceilingAreaSqft,
      netPaintableAreaSqft,
      netPaintableAreaSqm,
      paintLiters,
      primerLiters,
      puttyKg,
      can20L,
      can10L,
      can4L,
      can1L,
      costPaint,
      costPrimer,
      costPutty,
      costLabor,
      grandTotal,
      selectedPaint
    });

    // 3D Scene Assembly
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicRoom') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicRoom';

    const isBlueprint = visualTheme === 'blueprint';
    const paintedColor = isBlueprint ? 0x0ea5e9 : parseInt(wallColor.replace('#', '0x'));
    const wallMat = new THREE.MeshStandardMaterial({
      color: paintedColor,
      roughness: 0.7,
      wireframe: isBlueprint,
      side: THREE.DoubleSide
    });

    const rL = lenFt * 0.2, rW = widFt * 0.2, rH = htFt * 0.2;

    // 4 Walls
    const makeWall = (wL, posX, posZ, rotY) => {
      const g = new THREE.BoxGeometry(wL, rH, 0.1);
      g.translate(0, rH / 2, 0);
      const m = new THREE.Mesh(g, wallMat);
      m.position.set(posX, 0, posZ);
      m.rotation.y = rotY;
      mainGroup.add(m);
    };

    makeWall(rL, 0, -rW/2, 0);
    makeWall(rW, -rL/2, 0, Math.PI / 2);
    makeWall(rW, rL/2, 0, Math.PI / 2);

    // Floor
    const floorG = new THREE.PlaneGeometry(rL, rW);
    floorG.rotateX(-Math.PI / 2);
    const floorM = new THREE.Mesh(floorG, new THREE.MeshStandardMaterial({ color: 0x64748b, side: THREE.DoubleSide }));
    floorM.position.y = 0.01;
    mainGroup.add(floorM);

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Paint Calculator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Putty, primer, paint can sizes & interactive 3D room painter</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Feet (ft)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Meters (m)</button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-xl">
            <span className="text-[10px] font-semibold text-slate-500">Color:</span>
            <input type="color" value={wallColor} onChange={e => setWallColor(e.target.value)} className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border-0" />
          </div>

          <button onClick={handlePrint} className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Room & Paint System</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Paint System Type</label>
              <select name="paintTypeId" value={inputs.paintTypeId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                {paintTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Length ({unitSystem})</label>
                <input type="number" name="roomLength" value={inputs.roomLength} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Width ({unitSystem})</label>
                <input type="number" name="roomWidth" value={inputs.roomWidth} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Height ({unitSystem})</label>
                <input type="number" name="roomHeight" value={inputs.roomHeight} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="incCeil" name="includeCeiling" checked={inputs.includeCeiling} onChange={handleInputChange} className="rounded accent-cyan-500" />
              <label htmlFor="incCeil" className="text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">Include Ceiling Area in Paint Takeoff</label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Doors (Count)</label>
                <input type="number" name="doorCount" value={inputs.doorCount} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Windows (Count)</label>
                <input type="number" name="windowCount" value={inputs.windowCount} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Room Painting Preview</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Paint Required</p>
              <p className="text-lg font-bold text-pink-400">{results?.paintLiters?.toFixed(1) || 0} Liters ({results?.netPaintableAreaSqft?.toFixed(0)} sq.ft)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Putty (kg)</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{results?.puttyKg?.toFixed(0)} kg</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Primer</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{results?.primerLiters?.toFixed(1)} L</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Can Packages</p>
              <p className="text-xs font-bold text-cyan-500 mt-1">{results?.can20L > 0 ? `${results.can20L}x20L ` : ''}{results?.can10L > 0 ? `${results.can10L}x10L ` : ''}{results?.can4L > 0 ? `${results.can4L}x4L ` : ''}{results?.can1L > 0 ? `${results.can1L}x1L` : ''}</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Total Estimate</p>
              <p className="text-base font-bold text-emerald-500 mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
