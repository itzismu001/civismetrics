import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const plasterTypes = [
  { id: 'internal_12', name: 'Internal Wall Plaster (12mm, 1:4 Mix)', thickMm: 12, ratio: [1, 4], dryFactor: 1.33 },
  { id: 'internal_15', name: 'Internal Rough / Brick Wall (15mm, 1:5 Mix)', thickMm: 15, ratio: [1, 5], dryFactor: 1.33 },
  { id: 'external_20', name: 'External Weatherproof Double Coat (20mm, 1:4 Mix)', thickMm: 20, ratio: [1, 4], dryFactor: 1.35 },
  { id: 'ceiling_6', name: 'Ceiling / RCC Soffit Plaster (6mm, 1:3 Rich Mix)', thickMm: 6, ratio: [1, 3], dryFactor: 1.30 },
  { id: 'neat_cement', name: 'Neat Cement Punning / Skim Coat', thickMm: 3, ratio: [1, 1], dryFactor: 1.25 }
];

export default function PlasterCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    plasterTypeId: 'internal_12',
    areaSqft: 1200,
    directArea: 0,
    wallLength: 30,
    wallHeight: 10,
    bothSides: false,
    addWaterproofingLiquid: true,
    wastage: 10,
    cementBagPrice: 380,
    sandPricePerTon: 1400,
    laborRatePerSqft: 18,
    currency: '₹'
  });

  const [mode, setMode] = useState('normal');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let parsed = type === 'checkbox' ? checked : (['currency', 'plasterTypeId'].includes(name) ? value : parseFloat(value) || 0);
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
    camera.position.set(10, 8, 12);
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
    controls.maxDistance = 200;
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

  // --- Calculation & 3D Rendering ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  const calculateAndRender = () => {
    const { plasterTypeId, areaSqft, wallLength, wallHeight, bothSides, addWaterproofingLiquid, wastage, cementBagPrice, sandPricePerTon, laborRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedPlaster = plasterTypes.find(p => p.id === plasterTypeId) || plasterTypes[0];

    const lenFt = wallLength * (unitSystem === 'm' ? 3.28084 : 1);
    const htFt = wallHeight * (unitSystem === 'm' ? 3.28084 : 1);
    let totalAreaSqft = (lenFt * htFt) * (bothSides ? 2 : 1);
    if (totalAreaSqft <= 0) totalAreaSqft = areaSqft || 500;

    const totalAreaSqm = totalAreaSqft / 10.7639;
    const thickM = selectedPlaster.thickMm * 0.001;

    const wetVolM3 = totalAreaSqm * thickM;
    const dryVolM3 = wetVolM3 * selectedPlaster.dryFactor * (1 + (wastage / 100));

    const [cRatio, sRatio] = selectedPlaster.ratio;
    const totalParts = cRatio + sRatio;

    const cementVolM3 = (cRatio / totalParts) * dryVolM3;
    const cementKg = cementVolM3 * 1440;
    const cementBags = Math.ceil(cementKg / 50);

    const sandVolM3 = (sRatio / totalParts) * dryVolM3;
    const sandTons = (sandVolM3 * 1600) / 1000;
    const sandCuFt = sandVolM3 * 35.3147;

    const waterproofingLiters = addWaterproofingLiquid ? (cementBags * 0.2) : 0; // 200ml per bag

    const costCement = cementBags * cementBagPrice;
    const costSand = sandTons * sandPricePerTon;
    const costLabor = totalAreaSqft * laborRatePerSqft;
    const grandTotal = costCement + costSand + costLabor;

    setResults({
      totalAreaSqft,
      totalAreaSqm,
      dryVolM3,
      cementBags,
      sandTons,
      sandCuFt,
      waterproofingLiters,
      costCement,
      costSand,
      costLabor,
      grandTotal,
      selectedPlaster
    });

    // 3D Scene Layered Wall Substrate
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicPlaster') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicPlaster';

    const isBlueprint = visualTheme === 'blueprint';

    // 1. Red Brick Base Substrate
    const brickMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xb91c1c, wireframe: isBlueprint });
    const brickGeom = new THREE.BoxGeometry(6, 3, 0.4);
    brickGeom.translate(0, 1.5, 0);
    mainGroup.add(new THREE.Mesh(brickGeom, brickMat));

    // 2. Plaster Coat Layer Overlay
    const plasterMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x38bdf8 : 0xd1d5db,
      roughness: 0.9,
      wireframe: isBlueprint
    });
    const plasterGeom = new THREE.BoxGeometry(6, 3, 0.08);
    plasterGeom.translate(0, 1.5, 0.24);
    mainGroup.add(new THREE.Mesh(plasterGeom, plasterMat));

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Plaster Calculator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Internal/external wall & ceiling plastering mortar dry volume & sand takeoff</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Feet (ft)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Meters (m)</button>
          </div>

          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic' : 'Blueprint'}
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Plaster Specifications</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Plaster Application & Mix</label>
              <select name="plasterTypeId" value={inputs.plasterTypeId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                {plasterTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Wall Length ({unitSystem})</label>
                <input type="number" name="wallLength" value={inputs.wallLength} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Wall Height ({unitSystem})</label>
                <input type="number" name="wallHeight" value={inputs.wallHeight} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="bothSides" name="bothSides" checked={inputs.bothSides} onChange={handleInputChange} className="rounded accent-cyan-500" />
              <label htmlFor="bothSides" className="text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">Both Sides Plastering (2x Area)</label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Cement Bag ({inputs.currency})</label>
                <input type="number" name="cementBagPrice" value={inputs.cementBagPrice} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Sand / Ton ({inputs.currency})</label>
                <input type="number" name="sandPricePerTon" value={inputs.sandPricePerTon} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Layered Plaster Substrate</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Cement Quantity</p>
              <p className="text-lg font-bold text-cyan-400">{results?.cementBags || 0} Bags (50kg)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Plaster Area</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{results?.totalAreaSqft?.toFixed(0)} sq.ft</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Sand Required</p>
              <p className="text-base font-bold text-amber-500 mt-1">{results?.sandTons?.toFixed(2)} MT</p>
              <p className="text-[10px] text-slate-500">{results?.sandCuFt?.toFixed(0)} cu.ft</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Waterproof Liq.</p>
              <p className="text-base font-bold text-cyan-500 mt-1">{results?.waterproofingLiters?.toFixed(1)} L</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Estimated Cost</p>
              <p className="text-base font-bold text-emerald-500 mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
