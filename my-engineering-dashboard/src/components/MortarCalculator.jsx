import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const mortarMixes = [
  { id: '1:3', name: '1:3 Rich Structural / Pointing', ratio: [1, 3], dryFactor: 1.30 },
  { id: '1:4', name: '1:4 Heavy Plaster / Masonry', ratio: [1, 4], dryFactor: 1.33 },
  { id: '1:5', name: '1:5 General Brickwork', ratio: [1, 5], dryFactor: 1.33 },
  { id: '1:6', name: '1:6 Lean Masonry Mortar', ratio: [1, 6], dryFactor: 1.33 },
  { id: 'screed', name: '1:2 Floor Screed / Topping', ratio: [1, 2], dryFactor: 1.25 }
];

export default function MortarCalculator() {
  const [inputs, setInputs] = useState({
    mixId: '1:5',
    volumeCuFt: 100,
    sandBulking: 12,
    wastage: 5,
    cementBagPrice: 380,
    sandPricePerTon: 1400,
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
    let parsed = ['currency', 'mixId'].includes(name) ? value : parseFloat(value) || 0;
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
    camera.position.set(8, 6, 10);
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
    const { mixId, volumeCuFt, sandBulking, wastage, cementBagPrice, sandPricePerTon } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const selectedMix = mortarMixes.find(m => m.id === mixId) || mortarMixes[2];
    const wetVolM3 = (volumeCuFt || 100) * 0.0283168;
    const dryVolM3 = wetVolM3 * selectedMix.dryFactor * (1 + (wastage / 100));
    const [cRatio, sRatio] = selectedMix.ratio;
    const totalParts = cRatio + sRatio;
    const cementVolM3 = (cRatio / totalParts) * dryVolM3;
    const cementKg = cementVolM3 * 1440;
    const cementBags = Math.ceil(cementKg / 50);
    const sandVolM3 = (sRatio / totalParts) * dryVolM3 * (1 + (sandBulking / 100));
    const sandTons = (sandVolM3 * 1600) / 1000;
    const waterLiters = cementKg * 0.55;
    const costCement = cementBags * cementBagPrice;
    const costSand = sandTons * sandPricePerTon;
    const grandTotal = costCement + costSand;

    setResults({ wetVolM3, dryVolM3, cementBags, cementKg, sandTons, sandVolM3, waterLiters, costCement, costSand, grandTotal, selectedMix });

    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicMortar') toRemove.push(c); });
    toRemove.forEach(c => { scene.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });

    const group = new THREE.Group();
    group.name = 'dynamicMortar';
    const isBlueprint = visualTheme === 'blueprint';
    const brickMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xb91c1c, wireframe: isBlueprint, roughness: 0.8 });
    const mortarMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x9ca3af, roughness: 0.95 });

    // 4 rows of bricks with mortar bed joints
    for (let row = 0; row < 4; row++) {
      const y = row * 0.85;
      const mJoint = new THREE.BoxGeometry(5, 0.1, 1.5);
      mJoint.translate(0, y + 0.05, 0);
      group.add(new THREE.Mesh(mJoint, mortarMat));
      const offset = (row % 2 === 0) ? 0 : 0.8;
      for (let b = -2; b <= 2; b += 1.6) {
        const bGeom = new THREE.BoxGeometry(1.4, 0.65, 1.4);
        bGeom.translate(b + offset, y + 0.42, 0);
        group.add(new THREE.Mesh(bGeom, brickMat));
      }
    }
    scene.add(group);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full xl:w-[380px] shrink-0 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/50 flex flex-col h-auto xl:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-slate-700/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Mortar Calculator</h2>
              <p className="text-[11px] text-slate-400 font-mono">Cement / Sand Mix Ratio Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Mix Selection */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Mix Ratio Application
            </h3>
            <div className="flex flex-col gap-2">
              {mortarMixes.map(m => (
                <button key={m.id} onClick={() => setInputs(p => ({ ...p, mixId: m.id }))}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-left ${inputs.mixId === m.id ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white hover:border-cyan-500/50'}`}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>Wet Mortar Volume
            </h3>
            <div>
              <label className="block text-[9px] text-slate-400 mb-1 uppercase">Volume (Cubic Feet)</label>
              <input type="number" name="volumeCuFt" value={inputs.volumeCuFt} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
            </div>
          </div>

          {/* Bulking & Wastage */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>Bulking & Wastage
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Sand Bulking (%)</label>
                <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2"><input type="number" name="sandBulking" value={inputs.sandBulking} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white" /><span className="text-slate-500 text-xs">%</span></div>
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Wastage (%)</label>
                <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg pr-2"><input type="number" name="wastage" value={inputs.wastage} onChange={handleInputChange} className="w-full bg-transparent p-2 text-xs outline-none text-white" /><span className="text-slate-500 text-xs">%</span></div>
              </div>
            </div>
          </div>

          {/* Rates */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Material Rates
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 ml-1">Cement Bag (50kg)</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50"><span className="text-emerald-500">{inputs.currency}</span><input type="number" name="cementBagPrice" value={inputs.cementBagPrice} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" /></div>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 ml-1">Sand per Ton</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50"><span className="text-emerald-500">{inputs.currency}</span><input type="number" name="sandPricePerTon" value={inputs.sandPricePerTon} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" /></div>
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
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Cement Required</span>
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 leading-none">{results.cementBags} Bags ({results.cementKg?.toFixed(0)} kg)</span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Cost</span>
                  <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{mode === 'civil' ? 'Mortar BOQ Report' : 'Mortar Engineering Calculations'}</h2>
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
            <div className="border-b-2 border-slate-200 pb-6 mb-8"><h1 className="text-2xl font-black text-slate-900 uppercase">Mortar Engineering Calculations</h1><p className="text-xs text-slate-500 font-mono mt-1">IS:2250 Code of Practice for Mortar Mixes</p></div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-amber-700 mb-3">Step 1: Dry Volume from Wet Mortar</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Wet Vol = {inputs.volumeCuFt} cu.ft = {results.wetVolM3.toFixed(3)} m³</p>
                  <p>Dry Vol = Wet Vol × {results.selectedMix.dryFactor} (dry factor for {inputs.mixId}) × (1+{inputs.wastage}% waste)</p>
                  <p className="font-bold text-slate-900">Dry Volume = {results.dryVolM3.toFixed(3)} m³</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-cyan-700 mb-3">Step 2: Proportional Split ({inputs.mixId} ratio)</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Cement = {results.selectedMix.ratio[0]}/{(results.selectedMix.ratio[0]+results.selectedMix.ratio[1])} × {results.dryVolM3.toFixed(3)} = {(results.selectedMix.ratio[0]/(results.selectedMix.ratio[0]+results.selectedMix.ratio[1])*results.dryVolM3).toFixed(3)} m³ = {results.cementKg.toFixed(1)} kg</p>
                  <p className="font-bold text-slate-900">Cement Bags (50kg) = {results.cementBags} bags</p>
                  <p>Sand = {results.selectedMix.ratio[1]}/{(results.selectedMix.ratio[0]+results.selectedMix.ratio[1])} × {results.dryVolM3.toFixed(3)} × (1+{inputs.sandBulking}% bulking) = {results.sandVolM3.toFixed(3)} m³</p>
                  <p className="font-bold text-slate-900">Sand = {results.sandTons.toFixed(2)} MT</p>
                  <p>Water (w/c ratio ≈ 0.55) = {results.waterLiters.toFixed(0)} Liters</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black">
            <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
              <div><h1 className="text-2xl font-black text-slate-900 uppercase">Mortar Bill of Quantities</h1><p className="text-xs text-slate-500 font-mono">Mix Ratio: {inputs.mixId} — {results.selectedMix.name}</p></div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Verified</span>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr><th className="py-3 px-4">Material</th><th className="py-3 px-4">Quantity</th><th className="py-3 px-4">Unit</th><th className="py-3 px-4">Rate</th><th className="py-3 px-4 text-right">Cost ({inputs.currency})</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="py-3 px-4 font-semibold">Portland Cement (OPC 53)</td><td className="py-3 px-4 font-bold">{results.cementBags}</td><td className="py-3 px-4">Bags (50kg)</td><td className="py-3 px-4">{inputs.currency}{inputs.cementBagPrice}/bag</td><td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.costCement.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">Fine Sand</td><td className="py-3 px-4 font-bold">{results.sandTons.toFixed(2)}</td><td className="py-3 px-4">Metric Tonnes</td><td className="py-3 px-4">{inputs.currency}{inputs.sandPricePerTon}/ton</td><td className="py-3 px-4 text-right font-bold">{inputs.currency}{results.costSand.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4">Water</td><td className="py-3 px-4">{results.waterLiters.toFixed(0)}</td><td className="py-3 px-4">Litres</td><td className="py-3 px-4">—</td><td className="py-3 px-4 text-right text-slate-400">Included</td></tr>
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
