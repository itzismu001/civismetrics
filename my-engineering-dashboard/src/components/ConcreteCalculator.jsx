import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const concreteGrades = [
  { id: 'M10', name: 'M10 (1:3:6)', ratio: [1, 3, 6], use: 'PCC Foundation & Leveling Base', psi: 1450 },
  { id: 'M15', name: 'M15 (1:2:4)', ratio: [1, 2, 4], use: 'Plain Concrete, Paths & Footing Beds', psi: 2175 },
  { id: 'M20', name: 'M20 (1:1.5:3)', ratio: [1, 1.5, 3], use: 'Standard RCC Slabs, Beams, Columns', psi: 2900 },
  { id: 'M25', name: 'M25 (1:1:2)', ratio: [1, 1, 2], use: 'Heavy RCC Structural Elements & Raft', psi: 3625 },
  { id: 'M30', name: 'M30 (Design Mix)', ratio: [1, 0.8, 1.8], use: 'Commercial High-Strength Concrete', psi: 4350 }
];

const shapes = [
  { id: 'slab', name: 'Rectangular Slab / Pad' },
  { id: 'cylinder', name: 'Circular Column / Caisson' },
  { id: 'wall', name: 'Retaining Wall' },
  { id: 'curb', name: 'Curb & Gutter' }
];

export default function ConcreteCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    shapeId: 'slab',
    gradeId: 'M20',
    // Dimensions
    length: 20,
    width: 15,
    thickness: 6, // in or cm
    diameter: 3, // ft or m
    height: 10,  // ft or m
    wallTopThick: 8, // in or cm
    wallBaseThick: 14,
    // Engineering Specs
    wastage: 5,
    bagWeightKg: 50,
    truckCapacityM3: 6, // Standard RMC Transit Mixer
    // Rates
    readyMixPricePerM3: 4200,
    cementBagPrice: 380,
    sandPricePerTon: 1400,
    aggregatePricePerTon: 1200,
    currency: '₹'
  });

  const [mode, setMode] = useState('normal'); // normal | advanced | boq
  const [visualTheme, setVisualTheme] = useState('realistic'); // realistic | blueprint
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsed = ['currency', 'shapeId', 'gradeId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(12, 10, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(initialWidth, initialHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.maxDistance = 250;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    rimLight.position.set(-15, -5, -15);
    scene.add(rimLight);

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

  // --- Calculation & 3D Model Generation ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 200);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  const calculateAndRender = () => {
    const { shapeId, gradeId, length, width, thickness, diameter, height, wallTopThick, wallBaseThick, wastage, bagWeightKg, truckCapacityM3, readyMixPricePerM3, cementBagPrice, sandPricePerTon, aggregatePricePerTon } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedGrade = concreteGrades.find(g => g.id === gradeId) || concreteGrades[2];

    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const diamM = diameter * unitToMeter[unitSystem];
    const htM = height * unitToMeter[unitSystem];
    const wallTopM = wallTopThick * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const wallBaseM = wallBaseThick * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    let netWetM3 = 0;
    if (shapeId === 'slab') {
      netWetM3 = lenM * widM * thickM;
    } else if (shapeId === 'cylinder') {
      const radiusM = diamM / 2;
      netWetM3 = Math.PI * Math.pow(radiusM, 2) * htM;
    } else if (shapeId === 'wall') {
      const avgThickM = (wallTopM + wallBaseM) / 2;
      netWetM3 = lenM * htM * avgThickM;
    } else if (shapeId === 'curb') {
      netWetM3 = lenM * 0.4 * 0.25; // Standard curb profile cross section
    }

    if (netWetM3 <= 0) netWetM3 = 2;

    const orderWetM3 = netWetM3 * (1 + (wastage / 100));
    const orderCuYds = orderWetM3 * 1.30795;
    const orderCuFt = orderWetM3 * 35.3147;

    // Dry Volume Conversion Factor: 1.54
    const dryM3 = orderWetM3 * 1.54;
    const [cRatio, sRatio, aRatio] = selectedGrade.ratio;
    const totalParts = cRatio + sRatio + aRatio;

    // Component Takeoff
    const cementVolM3 = (cRatio / totalParts) * dryM3;
    const cementKg = cementVolM3 * 1440; // Cement density = 1440 kg/m3
    const cementBags = Math.ceil(cementKg / (bagWeightKg || 50));

    const sandVolM3 = (sRatio / totalParts) * dryM3;
    const sandTons = (sandVolM3 * 1600) / 1000;

    const aggVolM3 = (aRatio / totalParts) * dryM3;
    const aggTons = (aggVolM3 * 1600) / 1000;

    const waterLiters = cementKg * 0.45; // W/C ratio 0.45
    const rmcTrucks = Math.ceil(orderWetM3 / (truckCapacityM3 || 6));

    // Costing
    const costRMC = orderWetM3 * readyMixPricePerM3;
    const costSiteMix = (cementBags * cementBagPrice) + (sandTons * sandPricePerTon) + (aggTons * aggregatePricePerTon);

    setResults({
      netWetM3,
      orderWetM3,
      orderCuYds,
      orderCuFt,
      dryM3,
      cementBags,
      cementKg,
      sandTons,
      sandVolM3,
      aggTons,
      aggVolM3,
      waterLiters,
      rmcTrucks,
      costRMC,
      costSiteMix,
      selectedGrade
    });

    // --- 3D Scene Assembly ---
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicConcrete') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicConcrete';

    const isBlueprint = visualTheme === 'blueprint';
    const concreteColor = isBlueprint ? 0x0ea5e9 : 0x94a3b8;
    const material = new THREE.MeshStandardMaterial({
      color: concreteColor,
      roughness: 0.9,
      metalness: 0.05,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.5 : 1
    });

    if (shapeId === 'slab') {
      const sL = Math.max(0.5, lenM);
      const sW = Math.max(0.5, widM);
      const sT = Math.max(0.1, thickM);
      const geom = new THREE.BoxGeometry(sL, sT, sW);
      geom.translate(0, sT / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else if (shapeId === 'cylinder') {
      const sR = Math.max(0.2, diamM / 2);
      const sH = Math.max(0.5, htM);
      const geom = new THREE.CylinderGeometry(sR, sR, sH, 32);
      geom.translate(0, sH / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else if (shapeId === 'wall') {
      const sL = Math.max(0.5, lenM);
      const sH = Math.max(0.5, htM);
      const sT = Math.max(0.1, (wallTopM + wallBaseM) / 2);
      const geom = new THREE.BoxGeometry(sL, sH, sT);
      geom.translate(0, sH / 2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else {
      const sL = Math.max(0.5, lenM);
      const geom = new THREE.BoxGeometry(sL, 0.4, 0.25);
      geom.translate(0, 0.2, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    }

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Concrete Calculator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Parametric 3D shapes, M7.5-M30 mix breakdown & RMC transit estimator</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Imperial (ft/in)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Metric (m/cm)</button>
          </div>

          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            {['normal', 'advanced', 'boq'].map(t => (
              <button key={t} onClick={() => setMode(t)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${mode === t ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>{t}</button>
            ))}
          </div>

          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic 3D' : 'Blueprint Wire'}
          </button>

          <button onClick={handlePrint} className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Structure & Concrete Grade</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Geometry Shape</label>
                <select name="shapeId" value={inputs.shapeId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                  {shapes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Mix Design Grade</label>
                <select name="gradeId" value={inputs.gradeId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                  {concreteGrades.map(g => <option key={g.id} value={g.id}>{g.name} ({g.psi} PSI)</option>)}
                </select>
              </div>
            </div>

            {inputs.shapeId === 'slab' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Length ({unitSystem})</label>
                  <input type="number" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Width ({unitSystem})</label>
                  <input type="number" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Thick ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                  <input type="number" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
            )}

            {inputs.shapeId === 'cylinder' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Diameter ({unitSystem})</label>
                  <input type="number" name="diameter" value={inputs.diameter} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Height / Depth ({unitSystem})</label>
                  <input type="number" name="height" value={inputs.height} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
            )}

            {inputs.shapeId === 'wall' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Length ({unitSystem})</label>
                  <input type="number" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Height ({unitSystem})</label>
                  <input type="number" name="height" value={inputs.height} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Thick ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                  <input type="number" name="wallBaseThick" value={inputs.wallBaseThick} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">RMC Rate / m³ ({inputs.currency})</label>
                <input type="number" name="readyMixPricePerM3" value={inputs.readyMixPricePerM3} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Cement Bag ({inputs.currency})</label>
                <input type="number" name="cementBagPrice" value={inputs.cementBagPrice} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Parametric Concrete Shape</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Wet Concrete Vol.</p>
              <p className="text-lg font-bold text-cyan-400">{results?.orderWetM3?.toFixed(2) || '0.00'} m³</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Cement Bags</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{results?.cementBags} Bags</p>
              <p className="text-[10px] text-slate-500">{results?.cementKg?.toFixed(0)} kg total</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Sand (Tons)</p>
              <p className="text-lg font-bold text-amber-500 mt-1">{results?.sandTons?.toFixed(2)} MT</p>
              <p className="text-[10px] text-slate-500">{results?.sandVolM3?.toFixed(2)} m³</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Aggregate</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">{results?.aggTons?.toFixed(2)} MT</p>
              <p className="text-[10px] text-slate-500">{results?.aggVolM3?.toFixed(2)} m³</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">RMC Mixer Trips</p>
              <p className="text-lg font-bold text-cyan-500 mt-1">{results?.rmcTrucks} Trucks</p>
              <p className="text-[10px] text-slate-500">@{inputs.truckCapacityM3}m³ mixer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
