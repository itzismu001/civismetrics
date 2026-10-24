import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254 };

const barShapes = [
  { id: 'straight', name: 'Straight Bar' },
  { id: 'lbend', name: 'L-Bend / 90° Hook' },
  { id: 'ubar', name: 'U-Shape Anchor Bar' },
  { id: 'cranked', name: 'Cranked / 45° Bend-Up' },
  { id: 'stirrup', name: 'Rectangular Stirrup' },
  { id: 'spiral', name: 'Circular Column Ring' }
];

const rebarDiameters = [
  { dia: 8, wtPerM: 0.395 },
  { dia: 10, wtPerM: 0.617 },
  { dia: 12, wtPerM: 0.888 },
  { dia: 16, wtPerM: 1.578 },
  { dia: 20, wtPerM: 2.466 },
  { dia: 25, wtPerM: 3.853 },
  { dia: 32, wtPerM: 6.313 }
];

export default function RebarWeightCalculator() {
  const [inputs, setInputs] = useState({
    shapeId: 'lbend',
    diaMm: 16,
    lengthM: 6,
    bendLengthM: 0.5,
    crankDepthM: 0.15,
    stirrupWidthM: 0.23,
    stirrupDepthM: 0.45,
    numBars: 24,
    scrapPercent: 3,
    ratePerKg: 70,
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
    let parsed = ['currency', 'shapeId'].includes(name) ? value : parseFloat(value) || 0;
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
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(8, 5, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.setSize(w, h);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
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
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const cw = container.clientWidth, ch = container.clientHeight;
      if (cw > 0 && ch > 0) {
        cameraRef.current.aspect = cw / ch;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(cw, ch);
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

  useEffect(() => {
    const t = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(t);
  }, [inputs, visualTheme]);

  const calculateAndRender = () => {
    const { shapeId, diaMm, lengthM, bendLengthM, crankDepthM, stirrupWidthM, stirrupDepthM, numBars, scrapPercent, ratePerKg } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    const unitWtKgPerM = (diaMm * diaMm) / 162;
    let cuttingLengthM = lengthM;

    if (shapeId === 'lbend') cuttingLengthM = lengthM + bendLengthM;
    else if (shapeId === 'ubar') cuttingLengthM = lengthM + (2 * bendLengthM);
    else if (shapeId === 'cranked') cuttingLengthM = lengthM + (0.42 * crankDepthM);
    else if (shapeId === 'stirrup') cuttingLengthM = (2 * (stirrupWidthM + stirrupDepthM)) + (24 * (diaMm / 1000));
    else if (shapeId === 'spiral') cuttingLengthM = Math.PI * stirrupWidthM * 1.05;

    const totalCuttingLenM = cuttingLengthM * numBars;
    const netWeightKg = totalCuttingLenM * unitWtKgPerM;
    const grossWeightKg = netWeightKg * (1 + (scrapPercent / 100));
    const grossWeightMT = grossWeightKg / 1000;
    const standard12mRods = Math.ceil(totalCuttingLenM / 12);
    const grandTotal = grossWeightKg * ratePerKg;

    setResults({ unitWtKgPerM, cuttingLengthM, totalCuttingLenM, netWeightKg, grossWeightKg, grossWeightMT, standard12mRods, grandTotal });

    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicBBS') toRemove.push(c); });
    toRemove.forEach(c => { scene.remove(c); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });

    const group = new THREE.Group();
    group.name = 'dynamicBBS';
    const isBlueprint = visualTheme === 'blueprint';
    const barColor = isBlueprint ? 0x0ea5e9 : 0xef4444;
    const mat = new THREE.MeshStandardMaterial({ color: barColor, metalness: 0.7, roughness: 0.3, wireframe: isBlueprint });
    const r = Math.max(0.04, (diaMm / 1000) * 4);
    const sL = Math.max(1.5, lengthM * 0.8);

    if (shapeId === 'straight') {
      const g = new THREE.CylinderGeometry(r, r, sL, 16);
      g.rotateZ(Math.PI / 2);
      group.add(new THREE.Mesh(g, mat));
    } else if (shapeId === 'lbend') {
      const bL = Math.max(0.3, bendLengthM * 2);
      const g1 = new THREE.CylinderGeometry(r, r, sL, 16);
      g1.rotateZ(Math.PI / 2);
      g1.translate(0, 0, 0);
      group.add(new THREE.Mesh(g1, mat));
      const g2 = new THREE.CylinderGeometry(r, r, bL, 16);
      g2.translate(sL / 2, bL / 2, 0);
      group.add(new THREE.Mesh(g2, mat));
    } else if (shapeId === 'ubar') {
      const bL = Math.max(0.4, bendLengthM * 2);
      const g1 = new THREE.CylinderGeometry(r, r, sL, 16);
      g1.rotateZ(Math.PI / 2);
      group.add(new THREE.Mesh(g1, mat));
      [-sL/2, sL/2].forEach(x => {
        const g = new THREE.CylinderGeometry(r, r, bL, 16);
        g.translate(x, bL / 2, 0);
        group.add(new THREE.Mesh(g, mat));
      });
    } else if (shapeId === 'stirrup') {
      const sw = Math.max(1, stirrupWidthM * 5);
      const sd = Math.max(1.5, stirrupDepthM * 5);
      [[sw, 0, 0, true], [-sw, 0, 0, true], [0, sd, 0, false], [0, -sd, 0, false]].forEach(([x, y, z, isH]) => {
        const len = isH ? sd * 2 : sw * 2;
        const g = new THREE.CylinderGeometry(r, r, len, 12);
        if (!isH) g.rotateZ(Math.PI / 2);
        g.translate(x, y, z);
        group.add(new THREE.Mesh(g, mat));
      });
    } else {
      const torusR = Math.max(1, stirrupWidthM * 3);
      const g = new THREE.TorusGeometry(torusR, r, 16, 32);
      group.add(new THREE.Mesh(g, mat));
    }

    scene.add(group);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full pb-8">
      {/* Left Control Panel */}
      <div className="w-full xl:w-[380px] shrink-0 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/50 flex flex-col h-auto xl:h-[calc(100vh-140px)] z-10">
        <div className="border-b border-slate-700/50 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Rebar Weight & BBS</h2>
              <p className="text-[11px] text-slate-400 font-mono">Bar Bending Schedule Takeoff</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scroll pr-1 space-y-4 flex-1 pb-4">
          {/* Shape */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 group-hover:text-cyan-400 transition-colors mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>BBS Shape Code
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {barShapes.map(s => (
                <button key={s.id} onClick={() => setInputs(p => ({ ...p, shapeId: s.id }))}
                  className={`py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all text-left ${inputs.shapeId === s.id ? 'bg-cyan-500 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white hover:border-cyan-500/50'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Diameter */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>Bar Specification
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Diameter (mm)</label>
                <select name="diaMm" value={inputs.diaMm} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white">
                  {rebarDiameters.map(d => <option key={d.dia} value={d.dia}>{d.dia}mm — {d.wtPerM} kg/m</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">No. of Bars</label>
                <input type="number" name="numBars" value={inputs.numBars} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none text-white" />
              </div>
            </div>
          </div>

          {/* Lengths */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>Cutting Lengths (m)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Main Length (m)</label>
                <input type="number" step="0.1" name="lengthM" value={inputs.lengthM} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white" />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 uppercase">Bend / Hook (m)</label>
                <input type="number" step="0.05" name="bendLengthM" value={inputs.bendLengthM} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none text-white" />
              </div>
              {inputs.shapeId === 'stirrup' && (
                <>
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 uppercase">Stirrup Width (m)</label>
                    <input type="number" step="0.01" name="stirrupWidthM" value={inputs.stirrupWidthM} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-1 uppercase">Stirrup Depth (m)</label>
                    <input type="number" step="0.01" name="stirrupDepthM" value={inputs.stirrupDepthM} onChange={handleInputChange} className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg p-2 text-xs outline-none text-white" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Rates */}
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors group">
            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2 group-hover:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>Wastage & Rates
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 ml-1">Rate per kg</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                  <span className="text-emerald-500">{inputs.currency}</span>
                  <input type="number" name="ratePerKg" value={inputs.ratePerKg} onChange={handleInputChange} className="w-14 bg-transparent p-1 text-right outline-none text-white font-mono" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 ml-1">Scrap Wastage</span>
                <div className="flex items-center bg-slate-800 rounded text-xs px-2 border border-slate-600/50">
                  <input type="number" name="scrapPercent" value={inputs.scrapPercent} onChange={handleInputChange} className="w-12 bg-transparent p-1 text-right outline-none text-white font-mono" />
                  <span className="text-slate-400 ml-1">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full xl:w-[calc(100%-404px)] bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden relative z-10 xl:h-[calc(100vh-140px)] print:w-full print:h-auto print:border-none print:shadow-none print:bg-transparent print:overflow-visible print:block">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md z-30 shrink-0 print:hidden">
          <div className="flex-1 h-10 flex items-center">
            {results && mode === 'normal' ? (
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Weight (incl. scrap)</span>
                  <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500 leading-none">
                    {results.grossWeightKg?.toFixed(1)} kg ({results.grossWeightMT?.toFixed(3)} MT)
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Estimated Cost</span>
                  <span className="text-lg font-black text-emerald-400 leading-none">{inputs.currency}{results.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ) : (
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{mode === 'civil' ? 'BBS Financial Report' : 'BBS Engineering Math'}</h2>
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
              <button onClick={() => setMode('math')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'math' ? 'bg-blue-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Math</button>
              <button onClick={() => setMode('civil')} className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === 'civil' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400 hover:text-white'}`}>Report</button>
            </div>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className={`${mode === 'normal' ? 'flex' : 'hidden'} flex-1 relative min-h-[500px] w-full overflow-hidden bg-gradient-to-b from-slate-900/50 to-[#020617] print:hidden`}>
          <div ref={mountRef} className="absolute inset-0 cursor-move"></div>
          <div className="absolute bottom-6 right-6 z-30 bg-slate-800/80 backdrop-blur-md p-1 rounded-xl border border-slate-700/50 flex gap-1">
            <button onClick={() => setVisualTheme('realistic')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'realistic' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Realistic</button>
            <button onClick={() => setVisualTheme('blueprint')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${visualTheme === 'blueprint' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-500 hover:text-slate-300'}`}>Blueprint</button>
          </div>
        </div>

        {/* Math View */}
        {results && mode === 'math' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800">
            <div className="border-b-2 border-slate-200 pb-6 mb-8"><h1 className="text-2xl font-black text-slate-900 uppercase">BBS Engineering Calculations</h1><p className="text-xs text-slate-500 font-mono mt-1">IS:2502 Bar Bending Schedule Standard</p></div>
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-red-700 mb-3">Step 1: Unit Weight by D²/162 Formula</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Unit Weight = D² ÷ 162 = {inputs.diaMm}² ÷ 162 = <span className="font-bold text-slate-900">{results.unitWtKgPerM.toFixed(3)} kg/m</span></p>
                  <p className="text-xs text-slate-400 italic">// Standard IS formula (D in mm, result in kg/m)</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-amber-700 mb-3">Step 2: Cutting Length & Total Weight</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Cutting Length per Bar = <span className="font-bold">{results.cuttingLengthM.toFixed(3)} m</span></p>
                  <p>Total Cutting Length = {results.cuttingLengthM.toFixed(3)} × {inputs.numBars} bars = <span className="font-bold">{results.totalCuttingLenM.toFixed(2)} m</span></p>
                  <p>Net Weight = {results.totalCuttingLenM.toFixed(2)} × {results.unitWtKgPerM.toFixed(3)} = <span className="font-bold">{results.netWeightKg.toFixed(2)} kg</span></p>
                  <p className="text-slate-900 font-bold mt-2">Gross Weight (+{inputs.scrapPercent}% Scrap) = {results.grossWeightKg.toFixed(2)} kg = {results.grossWeightMT.toFixed(3)} MT</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-cyan-700 mb-3">Step 3: Commercial Rod Takeoff</h3>
                <div className="font-mono text-xs space-y-2 bg-slate-50 p-4 rounded-lg">
                  <p>Standard Commercial Length = 12 m per Rod</p>
                  <p>Total Rods = ⌈{results.totalCuttingLenM.toFixed(2)} ÷ 12⌉ = <span className="font-bold text-slate-900">{results.standard12mRods} Rods</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report View */}
        {results && mode === 'civil' && (
          <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-10 bg-slate-50 text-slate-800 print:bg-white print:text-black">
            <div className="border-b-2 border-slate-200 pb-6 mb-8 flex justify-between items-end">
              <div><h1 className="text-2xl font-black text-slate-900 uppercase">Bar Bending Schedule (BBS)</h1><p className="text-xs text-slate-500 font-mono">Steel Procurement & Cutting Schedule</p></div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">IS 2502</span>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                  <tr><th className="py-3 px-4">Description</th><th className="py-3 px-4">Value</th><th className="py-3 px-4">Unit</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Bar Shape', barShapes.find(s => s.id === inputs.shapeId)?.name, ''],
                    ['Diameter', inputs.diaMm, 'mm'],
                    ['No. of Bars', inputs.numBars, 'nos'],
                    ['Cutting Length / Bar', results.cuttingLengthM.toFixed(3), 'm'],
                    ['Total Cutting Length', results.totalCuttingLenM.toFixed(2), 'm'],
                    ['Unit Weight (D²/162)', results.unitWtKgPerM.toFixed(3), 'kg/m'],
                    ['Net Weight', results.netWeightKg.toFixed(2), 'kg'],
                    [`Gross Weight (+${inputs.scrapPercent}% Scrap)`, results.grossWeightKg.toFixed(2), 'kg'],
                    ['Gross Weight', results.grossWeightMT.toFixed(3), 'MT'],
                    ['12m Commercial Rods', results.standard12mRods, 'nos'],
                  ].map(([d, v, u]) => (
                    <tr key={d}><td className="py-3 px-4 font-medium text-slate-600">{d}</td><td className="py-3 px-4 font-bold text-slate-900">{v}</td><td className="py-3 px-4 text-slate-400">{u}</td></tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 font-bold bg-slate-50">
                  <tr>
                    <td colSpan="2" className="py-3 px-4 text-right uppercase">Total Steel Cost</td>
                    <td className="py-3 px-4 text-emerald-600 text-sm">{inputs.currency}{results.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
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
