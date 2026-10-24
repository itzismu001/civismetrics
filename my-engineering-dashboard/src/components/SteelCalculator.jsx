import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'mm': 0.001 };

const steelProfiles = [
  { id: 'rebar', name: 'TMT Deformed Rebar', formula: 'd2/162', defSize: '16mm' },
  { id: 'ibeam', name: 'I-Beam (ISMB / Universal)', formula: 'section', defSize: 'ISMB 200' },
  { id: 'channel', name: 'C-Channel (ISMC)', formula: 'section', defSize: 'ISMC 150' },
  { id: 'angle', name: 'Equal / Unequal Angle (ISA)', formula: 'section', defSize: 'ISA 75x75x6' },
  { id: 'shs', name: 'Square Hollow Section (SHS)', formula: 'tube', defSize: '80x80x4' },
  { id: 'pipe', name: 'Circular Hollow Pipe (CHS)', formula: 'pipe', defSize: '2.5" OD' },
  { id: 'plate', name: 'MS Flat Plate / Sheet', formula: 'plate', defSize: '10mm Plate' }
];

const rebarSizes = [
  { dia: 8, wtPerM: 0.395, defBarsPerBundle: 12 },
  { dia: 10, wtPerM: 0.617, defBarsPerBundle: 8 },
  { dia: 12, wtPerM: 0.888, defBarsPerBundle: 6 },
  { dia: 16, wtPerM: 1.578, defBarsPerBundle: 4 },
  { dia: 20, wtPerM: 2.466, defBarsPerBundle: 2 },
  { dia: 25, wtPerM: 3.853, defBarsPerBundle: 1 },
  { dia: 32, wtPerM: 6.313, defBarsPerBundle: 1 }
];

export default function SteelCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('m');
  const [inputs, setInputs] = useState({
    profileId: 'rebar',
    rebarDia: 16,
    lengthPerPiece: 12, // Standard 12m length
    quantity: 50,
    steelGrade: 'Fe500D',
    wastage: 3,
    ratePerKg: 68,
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
    let parsed = ['currency', 'profileId', 'steelGrade'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(8, 6, 12);
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
    controls.maxDistance = 200;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.6);
    dirLight.position.set(15, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.7);
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
    const { profileId, rebarDia, lengthPerPiece, quantity, wastage, ratePerKg } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    let unitWeightKgPerM = 0;
    if (profileId === 'rebar') {
      unitWeightKgPerM = (rebarDia * rebarDia) / 162;
    } else if (profileId === 'ibeam') {
      unitWeightKgPerM = 25.4; // ISMB 200 approx wt
    } else if (profileId === 'channel') {
      unitWeightKgPerM = 16.4; // ISMC 150 approx wt
    } else if (profileId === 'angle') {
      unitWeightKgPerM = 6.8; // ISA 75x75x6
    } else if (profileId === 'shs') {
      unitWeightKgPerM = 9.2;
    } else if (profileId === 'pipe') {
      unitWeightKgPerM = 5.1;
    } else {
      unitWeightKgPerM = 78.5; // 10mm plate per sqm
    }

    const totalLenM = lengthPerPiece * quantity;
    const netWeightKg = totalLenM * unitWeightKgPerM;
    const grossWeightKg = netWeightKg * (1 + (wastage / 100));
    const grossWeightTons = grossWeightKg / 1000;

    const matchedSize = rebarSizes.find(r => r.dia === rebarDia) || rebarSizes[3];
    const totalBundles = profileId === 'rebar' ? Math.ceil(quantity / matchedSize.defBarsPerBundle) : 0;

    const grandTotal = grossWeightKg * ratePerKg;

    setResults({
      unitWeightKgPerM,
      totalLenM,
      netWeightKg,
      grossWeightKg,
      grossWeightTons,
      totalBundles,
      grandTotal
    });

    // 3D Model Construction
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicSteel') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicSteel';

    const isBlueprint = visualTheme === 'blueprint';
    const steelColor = isBlueprint ? 0x0ea5e9 : 0x475569;
    const material = new THREE.MeshStandardMaterial({
      color: steelColor,
      metalness: isBlueprint ? 0.2 : 0.85,
      roughness: isBlueprint ? 0.5 : 0.35,
      wireframe: isBlueprint,
      transparent: isBlueprint,
      opacity: isBlueprint ? 0.5 : 1
    });

    if (profileId === 'rebar') {
      const radius = (rebarDia / 1000) * 8;
      const geom = new THREE.CylinderGeometry(radius, radius, 8, 16);
      geom.rotateZ(Math.PI / 2);
      geom.translate(0, radius, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mainGroup.add(mesh);
    } else if (profileId === 'ibeam') {
      const shape = new THREE.Shape();
      // I-beam cross section
      shape.moveTo(-0.6, -1.0);
      shape.lineTo(0.6, -1.0);
      shape.lineTo(0.6, -0.8);
      shape.lineTo(0.1, -0.8);
      shape.lineTo(0.1, 0.8);
      shape.lineTo(0.6, 0.8);
      shape.lineTo(0.6, 1.0);
      shape.lineTo(-0.6, 1.0);
      shape.lineTo(-0.6, 0.8);
      shape.lineTo(-0.1, 0.8);
      shape.lineTo(-0.1, -0.8);
      shape.lineTo(-0.6, -0.8);
      shape.closePath();

      const extrudeSettings = { depth: 7, bevelEnabled: false };
      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.translate(0, 1.0, -3.5);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mainGroup.add(mesh);
    } else {
      const geom = new THREE.BoxGeometry(0.8, 0.8, 7);
      geom.translate(0, 0.4, 0);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mainGroup.add(mesh);
    }

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-700 to-cyan-700 flex items-center justify-center text-white shadow-lg shadow-cyan-600/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Steel Calculator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">TMT rebar, structural I-beams, channels, pipes & tonnage takeoff</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Steel Section Details</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Profile Type</label>
              <select name="profileId" value={inputs.profileId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                {steelProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {inputs.profileId === 'rebar' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Rebar Diameter</label>
                  <select name="rebarDia" value={inputs.rebarDia} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                    {rebarSizes.map(r => <option key={r.dia} value={r.dia}>{r.dia} mm ({r.wtPerM} kg/m)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Steel Grade</label>
                  <select name="steelGrade" value={inputs.steelGrade} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                    <option value="Fe500D">Fe 500D (Ductile TMT)</option>
                    <option value="Fe550D">Fe 550D (High-Strength)</option>
                    <option value="Fe415">Fe 415 (Standard)</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Length / Piece (m)</label>
                <input type="number" name="lengthPerPiece" value={inputs.lengthPerPiece} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Quantity (Pcs)</label>
                <input type="number" name="quantity" value={inputs.quantity} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Rate / kg ({inputs.currency})</label>
                <input type="number" name="ratePerKg" value={inputs.ratePerKg} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Cut Wastage (%)</label>
                <input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[360px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Steel Profile Inspection</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Total Weight</p>
              <p className="text-lg font-bold text-cyan-400">{results?.grossWeightKg?.toFixed(2) || '0.00'} kg ({results?.grossWeightTons?.toFixed(3)} MT)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Unit Wt (kg/m)</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{results?.unitWeightKgPerM?.toFixed(3)}</p>
              <p className="text-[10px] text-slate-500">IS standard</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Total Length</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{results?.totalLenM} m</p>
              <p className="text-[10px] text-slate-500">{inputs.quantity} bars</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Bundles</p>
              <p className="text-lg font-bold text-amber-500 mt-1">{results?.totalBundles} Bundles</p>
              <p className="text-[10px] text-slate-500">Factory packed</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-400 uppercase tracking-wider">Estimated Cost</p>
              <p className="text-lg font-bold text-emerald-500 mt-1">{inputs.currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-slate-500">@{inputs.currency}{inputs.ratePerKg}/kg</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
