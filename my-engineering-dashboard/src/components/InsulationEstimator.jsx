import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const insulationMaterials = [
  { id: 'fiberglass', name: 'Fiberglass Glass Wool', rValuePerInch: 3.2, packSqft: 100, costPerSqft: 28, color: 0xfef08a },
  { id: 'rockwool', name: 'Rockwool / Stone Wool', rValuePerInch: 4.0, packSqft: 64, costPerSqft: 45, color: 0x78716c },
  { id: 'xps', name: 'XPS Extruded Polystyrene', rValuePerInch: 5.0, packSqft: 32, costPerSqft: 55, color: 0x38bdf8 },
  { id: 'eps', name: 'EPS Thermocol Board', rValuePerInch: 3.8, packSqft: 32, costPerSqft: 22, color: 0xfafafa },
  { id: 'sprayfoam', name: 'Closed-Cell Spray Foam', rValuePerInch: 6.5, packSqft: 1, costPerSqft: 75, color: 0xfde047 }
];

export default function InsulationEstimator() {
  const [inputs, setInputs] = useState({
    materialId: 'rockwool',
    areaSqft: 1500,
    thicknessIn: 3,
    wastage: 5,
    installationRatePerSqft: 8,
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
    let parsed = ['currency', 'materialId'].includes(name) ? value : parseFloat(value) || 0;
    if (typeof parsed === 'number') parsed = Math.max(0, parsed);
    setInputs(prev => ({ ...prev, [name]: parsed }));
  };

  const handlePrint = () => window.print();

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;
    const container = mountRef.current;
    if (!container) return;
    const w = container.clientWidth || 800, h = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(10, 8, 12);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.setSize(w, h);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(10, 15, 10);
    scene.add(dirLight);
    const grid = new THREE.GridHelper(20, 20, 0x0ea5e9, 0x334155);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);
    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();
    const handleResize = () => {
      if (!container) return;
      const cw = container.clientWidth, ch = container.clientHeight;
      if (cw > 0 && ch > 0) { camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch); }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener('resize', handleResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', handleResize); cancelAnimationFrame(animId); if (container && renderer.domElement) container.removeChild(renderer.domElement); renderer.dispose(); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(t);
  }, [inputs, visualTheme]);

  const calculateAndRender = () => {
    const { materialId, areaSqft, thicknessIn, wastage, installationRatePerSqft } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedMat = insulationMaterials.find(m => m.id === materialId) || insulationMaterials[1];
    const netSqft = areaSqft || 1000;
    const totalOrderSqft = netSqft * (1 + (wastage / 100));
    const achievedRValue = (thicknessIn || 2) * selectedMat.rValuePerInch;
    const achievedUValue = achievedRValue > 0 ? (1 / achievedRValue) : 0;
    const totalPacks = Math.ceil(totalOrderSqft / (selectedMat.packSqft || 1));
    const estimatedHvacSavingsPct = Math.min(45, Math.round(achievedRValue * 2.2));
    const materialCost = totalOrderSqft * selectedMat.costPerSqft;
    const installCost = totalOrderSqft * installationRatePerSqft;
    const grandTotal = materialCost + installCost;

    setResults({ netSqft, totalOrderSqft, achievedRValue, achievedUValue, totalPacks, estimatedHvacSavingsPct, materialCost, installCost, grandTotal, selectedMat });

    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicInsulation') toRemove.push(c); });
    toRemove.forEach(c => { scene.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });

    const group = new THREE.Group();
    group.name = 'dynamicInsulation';
    const isBlueprint = visualTheme === 'blueprint';

    // 3 layers: exterior | insulation | interior
    const extMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0x64748b, wireframe: isBlueprint, roughness: 0.7 });
    const extG = new THREE.BoxGeometry(6, 4, 0.2);
    extG.translate(0, 2, -0.35);
    group.add(new THREE.Mesh(extG, extMat));

    const insulMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : selectedMat.color, roughness: 0.95, wireframe: isBlueprint });
    const insulG = new THREE.BoxGeometry(6, 4, 0.4);
    insulG.translate(0, 2, 0);
    group.add(new THREE.Mesh(insulG, insulMat));

    const intMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0284c7 : 0xe2e8f0, wireframe: isBlueprint });
    const intG = new THREE.BoxGeometry(6, 4, 0.2);
    intG.translate(0, 2, 0.35);
    group.add(new THREE.Mesh(intG, intMat));

    scene.add(group);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full xl:w-[380px] shrink-0 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/50 flex flex-col h-auto xl:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-slate-700/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Insulation Estimator</h2>
              <p className="text-[11px] text-slate-400 font-mono">Thermal R-Value & Pack Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Material */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Insulation Material
            </h3>
            <div className="flex flex-col gap-2">
              {insulationMaterials.map(m => (
                <button key={m.id} onClick={() => setInputs(p => ({ ...p, materialId: m.id }))}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-left ${inputs.materialId === m.id ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white hover:border-cyan-500/50'}`}>
                  {m.name} — R-{m.rValuePerInch}/inch
                </button>
              ))}
            </div>
          </div>

          {/* Area & Thickness */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>Area & Thickness
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Area (sq.ft)</label>
                <input type="number" name="areaSqft" value={inputs.areaSqft} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Thickness (in)</label>
                <input type="number" step="0.5" name="thicknessIn" value={inputs.thicknessIn} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
              </div>
            </div>
          </div>

          {/* Performance Preview */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-cyan-500/20">
            <h3 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>Thermal Performance
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span className="text-slate-400">R-Value Achieved:</span><span className="font-bold text-sky-400">R-{results?.achievedRValue?.toFixed(1) || '—'}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">U-Factor:</span><span className="font-bold text-sky-400">{results?.achievedUValue?.toFixed(3) || '—'} BTU/hr·ft²·°F</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">HVAC Savings Est.:</span><span className="font-bold text-emerald-400">~{results?.estimatedHvacSavingsPct || 0}% reduction</span></div>
            </div>
          </div>

          {/* Wastage & Labor */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Wastage & Installation
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 ml-1">Cutting Wastage</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50"><input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-12 bg-transparent p-1 text-right outline-none text-white font-mono" /><span className="text-slate-400 ml-1">%</span></div>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 ml-1">Labor per sq.ft</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50"><span className="text-emerald-500">{inputs.currency}</span><input type="number" name="installationRatePerSqft" value={inputs.installationRatePerSqft} onChange={handleInputChange} className="w-12 bg-transparent p-1 text-right outline-none text-white font-mono" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full xl:w-[calc(100%-404px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
          <div className="flex-1 h-10 flex items-center">
            {results && mode === 'normal' ? (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Packs Required</span>
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-500 leading-none">{results.totalPacks} Packs ({results.totalOrderSqft?.toFixed(0)} sq.ft)</span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Cost</span>
                  <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{mode === 'civil' ? 'Insulation BOQ Report' : 'Thermal Engineering'}</h2>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {(mode === 'civil' || mode === 'math') && (
              <button onClick={handlePrint} className="bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
              </button>
            )}
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/50 flex gap-1 shadow-inner">
              <button onClick={() => setMode('normal')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'normal' ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}>3D Vis</button>
              <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'math' ? 'bg-blue-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Math</button>
              <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'civil' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Report</button>
            </div>
          </div>
        </div>

        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] print:hidden`}>
          <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
          <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1">
            <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
            <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Blueprint</button>
          </div>
        </div>

        {results && mode === 'math' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800">
            <div className="border-b-2 border-slate-200 pb-6 mb-8"><h1 className="text-2xl font-black text-slate-900 uppercase">Thermal Engineering Calculations</h1><p className="text-xs text-slate-500 font-mono mt-1">ASHRAE 90.1 Thermal Performance Standards</p></div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-sky-700 mb-3">Step 1: Thermal Resistance (R-Value)</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Material: {results.selectedMat.name}</p>
                  <p>R-Value Contribution = Thickness × R-per-inch = {inputs.thicknessIn}" × {results.selectedMat.rValuePerInch} = <span className="font-bold text-slate-900">R-{results.achievedRValue.toFixed(1)}</span></p>
                  <p>U-Factor = 1 / R-value = 1 / {results.achievedRValue.toFixed(1)} = <span className="font-bold text-slate-900">{results.achievedUValue.toFixed(4)} BTU/hr·ft²·°F</span></p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-emerald-700 mb-3">Step 2: Pack Takeoff</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Net Area = {results.netSqft} sq.ft</p>
                  <p>Total Order (+{inputs.wastage}% cutting waste) = {results.totalOrderSqft.toFixed(0)} sq.ft</p>
                  <p>Pack Coverage = {results.selectedMat.packSqft} sq.ft / pack</p>
                  <p className="font-bold text-slate-900">Packs Required = ⌈{results.totalOrderSqft.toFixed(0)} ÷ {results.selectedMat.packSqft}⌉ = {results.totalPacks} packs</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black">
            <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
              <div><h1 className="text-2xl font-black text-slate-900 uppercase">Insulation Bill of Quantities</h1><p className="text-xs text-slate-500 font-mono">{results.selectedMat.name} — R-{results.achievedRValue.toFixed(1)} Specification</p></div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">ASHRAE</span>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr><th className="py-3 px-4">Item</th><th className="py-3 px-4">Qty</th><th className="py-3 px-4">Unit</th><th className="py-3 px-4">Rate</th><th className="py-3 px-4 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="py-3 px-4 font-semibold">{results.selectedMat.name} ({inputs.thicknessIn}" thick)</td><td className="py-3 px-4 font-bold">{results.totalOrderSqft.toFixed(0)}</td><td className="py-3 px-4">sq.ft ({results.totalPacks} packs)</td><td className="py-3 px-4">{inputs.currency}{results.selectedMat.costPerSqft}/sq.ft</td><td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.materialCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">Installation Labor</td><td className="py-3 px-4 font-bold">{results.totalOrderSqft.toFixed(0)}</td><td className="py-3 px-4">sq.ft</td><td className="py-3 px-4">{inputs.currency}{inputs.installationRatePerSqft}/sq.ft</td><td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.installCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tbody>
                <tfoot className="border-t-2 border-slate-200 font-bold bg-slate-50">
                  <tr><td colSpan="4" className="py-3 px-4 text-right uppercase">Grand Total</td><td className="py-3 px-4 text-right text-emerald-600 text-sm">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
