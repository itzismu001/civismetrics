import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

const aggregateGrades = [
  { id: '20mm', label: '20mm (3/4") Standard Aggregate', density: 1600, color: '#475569' },
  { id: '10mm', label: '10mm (3/8") Blue Metal', density: 1550, color: '#64748b' },
  { id: '40mm', label: '40mm (1.5") Heavy Ballast', density: 1650, color: '#334155' },
  { id: 'pea_gravel', label: 'Pea Gravel / River Pebbles', density: 1500, color: '#78716c' }
];

export default function AggregateCalculator() {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    length: 30,
    width: 20,
    thickness: 6,
    compactionFactor: 1.20,
    wastage: 5,
    truckCapacityTons: 16,
    pricePerTon: 1100,
    pricePerBrass: 3800,
    currency: '₹'
  });

  const [gradeId, setGradeId] = useState('20mm');
  const [mode, setMode] = useState('normal'); // 'normal' | 'math' | 'civil'
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let parsed = ['currency'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(14, 10, 16);
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
    dirLight.position.set(15, 25, 15);
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

  // --- Calculation & 3D Render ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, gradeId, visualTheme]);

  const calculateAndRender = () => {
    const { length, width, thickness, compactionFactor, wastage, truckCapacityTons, pricePerTon, pricePerBrass } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedGrade = aggregateGrades.find(g => g.id === gradeId) || aggregateGrades[0];

    const lenM = length * unitToMeter[unitSystem];
    const widM = width * unitToMeter[unitSystem];
    const thickM = thickness * unitToMeter[unitSystem === 'ft' ? 'in' : 'cm'];

    const netVolumeM3 = Math.max(0.1, lenM * widM * thickM);
    const compactedVolM3 = netVolumeM3 * (compactionFactor || 1.20);
    const totalOrderVolM3 = compactedVolM3 * (1 + (wastage / 100));

    const totalCuFt = totalOrderVolM3 * 35.3147;
    const totalBrass = totalCuFt / 100;
    const totalWeightKg = totalOrderVolM3 * selectedGrade.density;
    const totalWeightTons = totalWeightKg / 1000;
    const truckloads = Math.ceil(totalWeightTons / (truckCapacityTons || 16));

    const costByWeight = totalWeightTons * pricePerTon;
    const grandTotal = costByWeight;

    setResults({
      lenM, widM, thickM,
      netVolumeM3,
      compactedVolM3,
      totalOrderVolM3,
      totalCuFt,
      totalBrass,
      totalWeightTons,
      totalWeightKg,
      truckloads,
      costByWeight,
      grandTotal,
      selectedGrade
    });

    // 3D Model
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicAgg') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicAgg';

    const isBlueprint = visualTheme === 'blueprint';
    const aggColor = isBlueprint ? 0x0ea5e9 : parseInt(selectedGrade.color.replace('#', '0x'));
    const material = new THREE.MeshStandardMaterial({
      color: aggColor,
      roughness: 0.9,
      wireframe: isBlueprint
    });

    const coneR = Math.max(1.8, Math.min(6, Math.sqrt(totalOrderVolM3 * 3 / Math.PI / 2.2)));
    const coneH = Math.max(1.2, coneR * 0.75);

    const aggGeom = new THREE.ConeGeometry(coneR, coneH, 24);
    aggGeom.translate(0, coneH / 2, 0);
    const aggMesh = new THREE.Mesh(aggGeom, material);
    aggMesh.castShadow = true;
    mainGroup.add(aggMesh);

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full xl:w-[380px] shrink-0 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/50 flex flex-col h-auto xl:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-slate-700/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-600/30 border border-slate-500/40 flex items-center justify-center text-slate-300 font-black">
              ⛰️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Aggregate Calculator</h2>
              <p className="text-[11px] text-slate-400 font-mono">Coarse Ballast & Tonnage Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Sizing Presets */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Aggregate Grade
            </h3>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {aggregateGrades.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGradeId(g.id)}
                  className={`py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-left ${
                    gradeId === g.id
                      ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white hover:border-cyan-500/50'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>Base Dimensions
              </h3>
              <select value={unitSystem} onChange={e => setUnitSystem(e.target.value)} className="bg-slate-900/80 border border-slate-600/50 text-[10px] rounded-md px-1.5 py-1 outline-none text-white cursor-pointer focus:ring-1 focus:ring-cyan-500">
                <option value="ft">Imperial (ft/in)</option>
                <option value="m">Metric (m/cm)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Length ({unitSystem})</label>
                <input type="number" step="0.5" name="length" value={inputs.length} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Width ({unitSystem})</label>
                <input type="number" step="0.5" name="width" value={inputs.width} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
              </div>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 mb-1 uppercase">Thickness ({unitSystem === 'ft' ? 'in' : 'cm'})</label>
              <input type="number" step="0.5" name="thickness" value={inputs.thickness} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
            </div>
          </div>

          {/* Compaction & Loss */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-amber-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>Compaction & Loss
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Base Compaction</label>
                <input type="number" step="0.05" name="compactionFactor" value={inputs.compactionFactor} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none text-white" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Wastage (%)</label>
                <input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none text-white" />
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Rates & Logistics
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 font-medium ml-1">Price per Ton</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                  <span className="text-emerald-500">{inputs.currency}</span>
                  <input type="number" name="pricePerTon" value={inputs.pricePerTon} onChange={handleInputChange} className="w-16 bg-transparent p-1 text-right outline-none text-white font-mono" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 font-medium ml-1">Dumper Cap. (Tons)</span>
                <input type="number" name="truckCapacityTons" value={inputs.truckCapacityTons} onChange={handleInputChange} className="w-14 bg-slate-800 p-1 text-right outline-none text-white font-mono rounded text-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Display Panel */}
      <div className="w-full xl:w-[calc(100%-404px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        {/* Top Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
          <div className="flex-1 h-10 flex items-center">
            {results && mode === 'normal' ? (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Tonnage</span>
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-100 leading-none">
                    {results.totalWeightTons?.toFixed(2)} MT ({results.totalOrderVolM3?.toFixed(2)} m³)
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Estimated Total</span>
                  <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{mode === 'civil' ? 'Financial BOQ Report' : 'Engineering Calculations'}</h2>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(mode === 'civil' || mode === 'math') && (
              <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print
              </button>
            )}

            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
              <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'normal' ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
              <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'math' ? 'bg-blue-500 text-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-slate-400 hover:text-white'}`}>Math</button>
              <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'civil' ? 'bg-emerald-500 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}>Report</button>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] print:hidden`}>
          <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
          <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-xl">
            <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
            <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Blueprint</button>
          </div>
        </div>

        {/* Engineering Math */}
        {results && mode === 'math' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black">
            <div className="border-b-2 border-slate-200 pb-6 mb-8">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Aggregate Engineering Proof</h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">Compaction Factor & Material Density</p>
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-3">Step 1: Loose vs Compacted Volume</h3>
                <div className="font-mono text-xs space-y-2 text-slate-700 bg-slate-50 p-4 rounded-lg">
                  <p>Net Geometry = {results.lenM.toFixed(2)}m × {results.widM.toFixed(2)}m × {results.thickM.toFixed(3)}m = <span className="font-bold">{results.netVolumeM3.toFixed(3)} m³</span></p>
                  <p>Compaction Adjustment (×{inputs.compactionFactor}) = <span className="font-bold text-slate-900">{results.compactedVolM3.toFixed(3)} m³</span></p>
                  <p>Total Order Volume (+{inputs.wastage}% Waste) = <span className="font-bold text-slate-900">{results.totalOrderVolM3.toFixed(3)} m³</span></p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-3">Step 2: Total Tonnage & Fleet Trips</h3>
                <div className="font-mono text-xs space-y-2 text-slate-700 bg-slate-50 p-4 rounded-lg">
                  <p>Aggregate Density ({results.selectedGrade.label}) = {results.selectedGrade.density} kg/m³</p>
                  <p>Total Weight = {results.totalOrderVolM3.toFixed(3)} m³ × {results.selectedGrade.density} = <span className="font-bold">{results.totalWeightKg.toFixed(1)} kg</span></p>
                  <p className="text-slate-900 font-bold text-sm">Total Tonnage = {results.totalWeightTons.toFixed(2)} MT ({results.truckloads} Dumper Trips)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Civil Report / BOQ */}
        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black">
            <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Bill of Quantities (BOQ)</h1>
                <p className="text-xs text-slate-500 font-mono">Coarse Aggregate Schedule</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Verified</span>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Quantity</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Unit Rate</th>
                    <th className="py-3 px-4 text-right">Total ({inputs.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 font-semibold">{results.selectedGrade.label}</td>
                    <td className="py-3 px-4 font-bold">{results.totalWeightTons.toFixed(2)}</td>
                    <td className="py-3 px-4">Metric Tonnes (MT)</td>
                    <td className="py-3 px-4">{inputs.currency}{inputs.pricePerTon} / ton</td>
                    <td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.costByWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Base Compaction Settlement</td>
                    <td className="py-3 px-4">+{((inputs.compactionFactor - 1)*100).toFixed(0)}%</td>
                    <td className="py-3 px-4">Sub-base Compaction</td>
                    <td className="py-3 px-4">Included</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">Compensated</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Dumper Logistics</td>
                    <td className="py-3 px-4">{results.truckloads}</td>
                    <td className="py-3 px-4">Trips ({inputs.truckCapacityTons}T Dumper)</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 text-right text-slate-500">Ex-Quarry Delivery</td>
                  </tr>
                </tbody>
                <tfoot className="border-t-2 border-slate-200 font-bold bg-slate-50">
                  <tr>
                    <td colSpan="4" className="py-3 px-4 uppercase text-right">Grand Total</td>
                    <td className="py-3 px-4 text-right text-sm text-emerald-600">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
