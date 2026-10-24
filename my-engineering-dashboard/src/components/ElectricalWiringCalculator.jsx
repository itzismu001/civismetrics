import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const defaultAppliances = [
  { id: 'light', name: 'LED Light Points (18W)', watts: 18, count: 24, wireGauge: '1.0 sq mm' },
  { id: 'fan', name: 'Ceiling Fans (75W)', watts: 75, count: 6, wireGauge: '1.5 sq mm' },
  { id: 'plug6a', name: '6A Convenience Sockets', watts: 100, count: 18, wireGauge: '1.5 sq mm' },
  { id: 'plug16a', name: '16A Power Plugs (Heater/AC)', watts: 1500, count: 6, wireGauge: '4.0 sq mm' },
  { id: 'ac', name: 'Split AC (1.5 Ton)', watts: 2000, count: 3, wireGauge: '4.0 sq mm' },
  { id: 'geyser', name: 'Water Geyser (2kW)', watts: 2000, count: 2, wireGauge: '4.0 sq mm' },
  { id: 'pump', name: 'Water Pump (1 HP)', watts: 750, count: 1, wireGauge: '2.5 sq mm' }
];

export default function ElectricalWiringCalculator() {
  const [appliances, setAppliances] = useState(defaultAppliances);
  const [conduitPricePerMeter, setConduitPricePerMeter] = useState(25);
  const [avgWireRollPrice, setAvgWireRollPrice] = useState(1850);
  const [mcbPrice, setMcbPrice] = useState(220);
  const [laborPerPoint, setLaborPerPoint] = useState(150);
  const [currency, setCurrency] = useState('₹');

  const [mode, setMode] = useState('normal');
  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleCountChange = (id, val) => {
    setAppliances(prev => prev.map(a => a.id === id ? { ...a, count: Math.max(0, parseInt(val) || 0) } : a));
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
    camera.position.set(12, 10, 14);
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
    const dl = new THREE.DirectionalLight(0xffedd5, 1.5);
    dl.position.set(15, 20, 15);
    scene.add(dl);
    const grid = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x334155);
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
  }, [appliances, conduitPricePerMeter, avgWireRollPrice, mcbPrice, laborPerPoint, visualTheme]);

  const calculateAndRender = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    let totalWatts = 0, totalPoints = 0;
    appliances.forEach(a => { totalWatts += a.watts * a.count; totalPoints += a.count; });

    const totalLoadKw = totalWatts / 1000;
    const totalLoadKva = totalLoadKw / 0.85;
    const totalWireMeters = totalPoints * 14;
    const totalWireRolls = Math.ceil(totalWireMeters / 90);
    const totalConduitMeters = totalPoints * 4.5;
    const conduitPipes10ft = Math.ceil(totalConduitMeters / 3);
    const mcbWays = Math.ceil(totalPoints / 6) + 2;
    const costWire = totalWireRolls * avgWireRollPrice;
    const costConduit = totalConduitMeters * conduitPricePerMeter;
    const costMcbs = mcbWays * mcbPrice;
    const costLabor = totalPoints * laborPerPoint;
    const grandTotal = costWire + costConduit + costMcbs + costLabor;

    setResults({ totalPoints, totalLoadKw, totalLoadKva, totalWireMeters, totalWireRolls, totalConduitMeters, conduitPipes10ft, mcbWays, costWire, costConduit, costMcbs, costLabor, grandTotal });

    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicElectric') toRemove.push(c); });
    toRemove.forEach(c => { scene.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });

    const group = new THREE.Group();
    group.name = 'dynamicElectric';
    const isBlueprint = visualTheme === 'blueprint';
    const conduitMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xf59e0b, roughness: 0.4, wireframe: isBlueprint });
    const dbMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x334155, metalness: 0.6 });
    const switchMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0284c7 : 0xffffff });

    // DB box
    const dbG = new THREE.BoxGeometry(0.8, 1.2, 0.3);
    dbG.translate(0, 1.5, -4.2);
    group.add(new THREE.Mesh(dbG, dbMat));

    // Conduit pipes
    const addPipe = (len, pos, rotZ = 0) => {
      const g = new THREE.CylinderGeometry(0.04, 0.04, len, 12);
      const m = new THREE.Mesh(g, conduitMat);
      m.position.set(...pos);
      m.rotation.z = rotZ;
      group.add(m);
    };
    addPipe(4, [0, 1.5, -4.2], Math.PI / 2);
    addPipe(3.5, [-3.5, 1.5, -4.2]);
    addPipe(3.5, [3.5, 1.5, -4.2]);

    // Switchboards
    [-3.5, 3.5].forEach(x => {
      const g = new THREE.BoxGeometry(0.3, 0.3, 0.1);
      const m = new THREE.Mesh(g, switchMat);
      m.position.set(x, 1.2, -4.15);
      group.add(m);
    });

    scene.add(group);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full xl:w-[380px] shrink-0 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/50 flex flex-col h-auto xl:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-slate-700/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Electrical Wiring</h2>
              <p className="text-[11px] text-slate-400 font-mono">Load kW · Wire Coils · MCB Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Point Schedule */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>Electrical Point Schedule
            </h3>
            <div className="space-y-2">
              {appliances.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/40">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[10px] font-semibold text-slate-300 truncate">{a.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono">{a.watts}W · {a.wireGauge}</p>
                  </div>
                  <input
                    type="number"
                    value={a.count}
                    onChange={e => handleCountChange(a.id, e.target.value)}
                    className="w-14 bg-slate-800 border border-slate-600 rounded-lg p-1.5 text-xs font-bold text-white text-right outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rates */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Material Rates
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Wire Coil (90m)', val: avgWireRollPrice, setter: setAvgWireRollPrice },
                { label: 'Conduit / m', val: conduitPricePerMeter, setter: setConduitPricePerMeter },
                { label: 'MCB / CB', val: mcbPrice, setter: setMcbPrice },
                { label: 'Labour / Point', val: laborPerPoint, setter: setLaborPerPoint },
              ].map(({ label, val, setter }) => (
                <div key={label} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-[11px] text-slate-400 ml-1">{label}</span>
                  <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                    <span className="text-emerald-500">{currency}</span>
                    <input type="number" value={val} onChange={e => setter(parseFloat(e.target.value) || 0)} className="w-16 bg-transparent p-1 text-right outline-none text-white font-mono" />
                  </div>
                </div>
              ))}
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
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Load</span>
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 leading-none">{results.totalLoadKw?.toFixed(2)} kW ({results.totalLoadKva?.toFixed(2)} kVA)</span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Cost</span>
                  <span className="text-lg font-black text-emerald-400 leading-none">{currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{mode === 'civil' ? 'Electrical BOQ' : 'Load Calculations'}</h2>
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
            <div className="border-b-2 border-slate-200 pb-6 mb-8"><h1 className="text-2xl font-black text-slate-900 uppercase">Electrical Load Calculations</h1><p className="text-xs text-slate-500 font-mono mt-1">IS:732 Code for Wiring & IS:8884 DB Installation</p></div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-amber-700 mb-3">Step 1: Connected Load</h3>
                <div className="font-mono text-xs space-y-1 bg-slate-50 p-4 rounded-lg">
                  {appliances.filter(a => a.count > 0).map(a => <p key={a.id}>{a.name}: {a.count} × {a.watts}W = <span className="font-bold">{(a.count * a.watts)} W</span></p>)}
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <p className="font-bold text-slate-900">Total = {results.totalLoadKw.toFixed(2)} kW = {results.totalLoadKva.toFixed(2)} kVA (PF: 0.85)</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-cyan-700 mb-3">Step 2: Wire & Conduit Takeoff</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Total Points = {results.totalPoints} nos</p>
                  <p>Wire Length = {results.totalPoints} pts × 14m avg run = {results.totalWireMeters} m</p>
                  <p>Wire Coils (90m/coil) = ⌈{results.totalWireMeters} ÷ 90⌉ = <span className="font-bold text-slate-900">{results.totalWireRolls} coils</span></p>
                  <p>Conduit = {results.totalPoints} pts × 4.5m = {results.totalConduitMeters.toFixed(0)} m ({results.conduitPipes10ft} pipes)</p>
                  <p>MCB Ways = {results.mcbWays} (≈ 6 pts/circuit + main + spare)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black">
            <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
              <div><h1 className="text-2xl font-black text-slate-900 uppercase">Electrical Bill of Quantities</h1><p className="text-xs text-slate-500 font-mono">Wiring, Conduit & Distribution Board Schedule</p></div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">IS 732</span>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr><th className="py-3 px-4">Item</th><th className="py-3 px-4">Qty</th><th className="py-3 px-4">Unit</th><th className="py-3 px-4">Rate</th><th className="py-3 px-4 text-right">Total ({currency})</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="py-3 px-4 font-semibold">Electrical Wire (90m coils)</td><td className="py-3 px-4 font-bold">{results.totalWireRolls}</td><td className="py-3 px-4">Coils</td><td className="py-3 px-4">{currency}{avgWireRollPrice}/coil</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costWire.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">PVC Conduit Pipes</td><td className="py-3 px-4 font-bold">{results.totalConduitMeters.toFixed(0)}</td><td className="py-3 px-4">Meters</td><td className="py-3 px-4">{currency}{conduitPricePerMeter}/m</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costConduit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">MCBs & Distribution Board</td><td className="py-3 px-4 font-bold">{results.mcbWays}</td><td className="py-3 px-4">Ways / Breakers</td><td className="py-3 px-4">{currency}{mcbPrice}/MCB</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costMcbs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                  <tr><td className="py-3 px-4 font-semibold">Installation Labour</td><td className="py-3 px-4 font-bold">{results.totalPoints}</td><td className="py-3 px-4">Points</td><td className="py-3 px-4">{currency}{laborPerPoint}/point</td><td className="py-3 px-4 text-right font-bold">{currency}{results.costLabor.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tbody>
                <tfoot className="border-t-2 border-slate-200 font-bold bg-slate-50">
                  <tr><td colSpan="4" className="py-3 px-4 text-right uppercase">Grand Total</td><td className="py-3 px-4 text-right text-emerald-600 text-sm">{currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
