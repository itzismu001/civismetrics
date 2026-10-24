import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const stairTypes = [
  { id: 'straight', name: 'Straight Flight Staircase', desc: 'Single direct flight between floors' },
  { id: 'doglegged', name: 'Dog-Legged (2 Flights + Landing)', desc: 'Reverses direction 180° with intermediate landing' },
  { id: 'openwell', name: 'Open-Well / Quarter Turn', desc: 'Spaced well with 90° or 180° turns' }
];

export default function StaircaseCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    stairTypeId: 'straight',
    totalHeight: 10,   // Floor-to-floor height (ft or m)
    flightWidth: 3.5,  // Width of staircase (ft or m)
    riserHeight: 6,    // in or cm
    treadWidth: 10,    // in or cm
    waistSlabThick: 6, // in or cm
    landingLength: 3.5,// ft or m
    // Rates
    concreteRatePerM3: 4700,
    rebarRatePerKg: 70,
    tileMarbleRatePerSqm: 850,
    laborRate: 300,
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
    const { name, value } = e.target;
    let parsed = ['currency', 'stairTypeId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(12, 10, 16);
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

  // --- Calculation & 3D Model Generation ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 200);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  const calculateAndRender = () => {
    const { totalHeight, flightWidth, riserHeight, treadWidth, waistSlabThick, landingLength, concreteRatePerM3, rebarRatePerKg, tileMarbleRatePerSqm, laborRate } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const totalHtM = totalHeight * unitToMeter[unitSystem];
    const widthM = flightWidth * unitToMeter[unitSystem];
    const riserM = riserHeight * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const treadM = treadWidth * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const waistM = waistSlabThick * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];
    const landingM = landingLength * unitToMeter[unitSystem];

    // Total Steps Count
    const totalSteps = Math.max(2, Math.round(totalHtM / Math.max(0.1, riserM)));
    const actualRiserM = totalHtM / totalSteps;

    // Steps Triangle Volume
    const singleStepVolM3 = 0.5 * actualRiserM * treadM * widthM;
    const allStepsVolM3 = singleStepVolM3 * totalSteps;

    // Waist Slab Volume (hypotenuse slope length)
    const slopeLenM = Math.sqrt(Math.pow(totalHtM, 2) + Math.pow(totalSteps * treadM, 2));
    const waistSlabVolM3 = slopeLenM * widthM * waistM;

    // Landing Slab Volume
    const landingVolM3 = landingM * widthM * waistM;

    const totalConcreteM3 = (allStepsVolM3 + waistSlabVolM3 + landingVolM3) * 1.05; // 5% waste
    const totalRebarKg = totalConcreteM3 * 0.009 * 7850; // ~0.9% steel ratio

    // Finishing Area (Treads + Risers)
    const treadAreaSqm = totalSteps * (treadM * widthM);
    const riserAreaSqm = totalSteps * (actualRiserM * widthM);
    const totalFinishingAreaSqm = (treadAreaSqm + riserAreaSqm) + (landingM * widthM);

    // Costs
    const costConcrete = totalConcreteM3 * concreteRatePerM3;
    const costRebar = totalRebarKg * rebarRatePerKg;
    const costFinish = totalFinishingAreaSqm * tileMarbleRatePerSqm;
    const costLabor = totalConcreteM3 * laborRate;
    const grandTotal = costConcrete + costRebar + costFinish + costLabor;

    setResults({
      totalSteps,
      actualRiserMm: (actualRiserM * 1000).toFixed(0),
      totalConcreteM3,
      totalRebarKg,
      totalFinishingAreaSqm,
      costConcrete,
      costRebar,
      costFinish,
      costLabor,
      grandTotal
    });

    // 3D Scene Assembly
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicStairs') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicStairs';

    const isBlueprint = visualTheme === 'blueprint';
    const concreteColor = isBlueprint ? 0x0ea5e9 : 0x94a3b8;
    const stepMat = new THREE.MeshStandardMaterial({
      color: concreteColor,
      roughness: 0.85,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.4 : 1
    });

    const numVisualSteps = Math.min(20, totalSteps);
    const stepW = Math.max(0.5, widthM);
    const stepT = Math.max(0.2, treadM);
    const stepR = Math.max(0.1, actualRiserM);

    for (let i = 0; i < numVisualSteps; i++) {
      const stepGeom = new THREE.BoxGeometry(stepW, stepR * (i + 1), stepT);
      stepGeom.translate(0, (stepR * (i + 1)) / 2, i * stepT);
      const stepMesh = new THREE.Mesh(stepGeom, stepMat);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      mainGroup.add(stepMesh);
    }

    // Landing on Top
    const landGeom = new THREE.BoxGeometry(stepW, stepR * numVisualSteps, Math.max(0.8, landingM));
    landGeom.translate(0, (stepR * numVisualSteps) / 2, (numVisualSteps - 1) * stepT + Math.max(0.8, landingM) / 2 + stepT / 2);
    const landMesh = new THREE.Mesh(landGeom, stepMat);
    landMesh.castShadow = true;
    mainGroup.add(landMesh);

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Staircase Calculator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Step riser-tread optimization, waist slab concrete & marble takeoff</p>
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

      {/* Grid Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Flight & Step Dimensions</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Flight Configuration</label>
              <select name="stairTypeId" value={inputs.stairTypeId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                {stairTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Total Rise ({unitSystem})</label>
                <input type="number" name="totalHeight" value={inputs.totalHeight} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Flight Width ({unitSystem})</label>
                <input type="number" name="flightWidth" value={inputs.flightWidth} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Riser ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input type="number" name="riserHeight" value={inputs.riserHeight} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Tread ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input type="number" name="treadWidth" value={inputs.treadWidth} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Waist ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
                <input type="number" name="waistSlabThick" value={inputs.waistSlabThick} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Concrete / m³ ({inputs.currency})</label>
                <input type="number" name="concreteRatePerM3" value={inputs.concreteRatePerM3} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Marble/Tile / m² ({inputs.currency})</label>
                <input type="number" name="tileMarbleRatePerSqm" value={inputs.tileMarbleRatePerSqm} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D RCC Stepped Staircase</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Total Steps</p>
              <p className="text-lg font-bold text-cyan-400">{results?.totalSteps || 0} Risers ({results?.actualRiserMm}mm each)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Concrete Vol</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{results?.totalConcreteM3?.toFixed(2)} m³</p>
              <p className="text-[10px] text-slate-500">Waist + steps</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Rebar Total</p>
              <p className="text-lg font-bold text-amber-500 mt-1">{results?.totalRebarKg?.toFixed(0)} kg</p>
              <p className="text-[10px] text-slate-500">TMT reinforcement</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Finishing Area</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1">{results?.totalFinishingAreaSqm?.toFixed(1)} m²</p>
              <p className="text-[10px] text-slate-500">Granite / tile</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Estimated Cost</p>
              <p className="text-lg font-bold text-emerald-500 mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-slate-500">Civil + stone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
