import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const initialMaterials = [
  { id: 'cement', name: 'OPC/PPC Cement', unit: 'Bags (50kg)', defaultQty: 400, rate: 380, category: 'Structural' },
  { id: 'steel', name: 'TMT Steel Fe500D', unit: 'kg', defaultQty: 3500, rate: 68, category: 'Structural' },
  { id: 'sand', name: 'River Sand / M-Sand', unit: 'Metric Tons', defaultQty: 45, rate: 1400, category: 'Core' },
  { id: 'aggregate', name: '20mm Aggregate', unit: 'Metric Tons', defaultQty: 55, rate: 1100, category: 'Core' },
  { id: 'bricks', name: 'Red Clay Bricks', unit: 'Pieces', defaultQty: 12000, rate: 8.5, category: 'Masonry' },
  { id: 'tiles', name: '600x600 Vitrified Tiles', unit: 'Boxes', defaultQty: 80, rate: 850, category: 'Finishing' },
  { id: 'paint', name: 'Emulsion Paint', unit: 'Liters', defaultQty: 120, rate: 360, category: 'Finishing' }
];

export default function MaterialCostCalculator({ isProjectMode = false, onAddOn }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [taxPercent, setTaxPercent] = useState(18); // GST / VAT
  const [freightPercent, setFreightPercent] = useState(5); // Shipping & logistics
  const [contingencyPercent, setContingencyPercent] = useState(3);
  const [currency, setCurrency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleQtyChange = (id, newQty) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, defaultQty: Math.max(0, parseFloat(newQty) || 0) } : m));
  };

  const handleRateChange = (id, newRate) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, rate: Math.max(0, parseFloat(newRate) || 0) } : m));
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
    camera.position.set(15, 12, 18);
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

  // --- Calculation & 3D Depot Rendering ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [materials, taxPercent, freightPercent, contingencyPercent, visualTheme]);

  const calculateAndRender = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    let subTotal = 0;
    const itemized = materials.map(m => {
      const lineTotal = m.defaultQty * m.rate;
      subTotal += lineTotal;
      return { ...m, lineTotal };
    });

    const taxAmount = subTotal * (taxPercent / 100);
    const freightAmount = subTotal * (freightPercent / 100);
    const contingencyAmount = subTotal * (contingencyPercent / 100);
    const grandTotal = subTotal + taxAmount + freightAmount + contingencyAmount;

    setResults({
      subTotal,
      taxAmount,
      freightAmount,
      contingencyAmount,
      grandTotal,
      itemized
    });

    // 3D Site Depot Construction
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicDepot') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicDepot';

    const isBlueprint = visualTheme === 'blueprint';
    const matColor = isBlueprint ? 0x0ea5e9 : 0xf59e0b;
    const palletMat = new THREE.MeshStandardMaterial({
      color: matColor,
      roughness: 0.8,
      wireframe: isBlueprint
    });

    // Pallets in a grid layout
    itemized.forEach((item, idx) => {
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      const posX = (col - 1.5) * 3;
      const posZ = (row - 0.5) * 3;
      const height = Math.max(0.4, Math.min(2.5, item.lineTotal / 50000));

      const g = new THREE.BoxGeometry(2, height, 2);
      g.translate(posX, height / 2, posZ);
      mainGroup.add(new THREE.Mesh(g, palletMat));
    });

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Material Cost Estimator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Unified procurement master rates, GST/VAT & warehouse depot visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic' : 'Blueprint'}
          </button>

          <button onClick={handlePrint} className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs transition-all" title="Print BOQ Report">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </div>

      {/* Inputs + 3D Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Material Procurement Master</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-dashboard text-slate-500 dark:text-zinc-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Rate ({currency})</th>
                    <th className="py-2.5 px-3 text-right">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {materials.map(m => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-zinc-200">{m.name}</td>
                      <td className="py-2.5 px-3">
                        <input type="number" value={m.defaultQty} onChange={e => handleQtyChange(m.id, e.target.value)} className="w-20 bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{m.unit}</td>
                      <td className="py-2.5 px-3">
                        <input type="number" value={m.rate} onChange={e => handleRateChange(m.id, e.target.value)} className="w-20 bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {currency}{(m.defaultQty * m.rate).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-borderDark">
              <div>
                <label className="text-[11px] font-medium text-slate-500">GST / Tax (%)</label>
                <input type="number" value={taxPercent} onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Freight (%)</label>
                <input type="number" value={freightPercent} onChange={e => setFreightPercent(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Contingency (%)</label>
                <input type="number" value={contingencyPercent} onChange={e => setContingencyPercent(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="h-[280px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-amber-400 font-bold">3D Material Stockpile Depot</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Total Procurement</p>
              <p className="text-lg font-bold text-amber-400">{currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 uppercase">Subtotal Base</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{currency}{results?.subTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 uppercase">Tax + Freight</p>
              <p className="text-base font-bold text-cyan-500 mt-1">{currency}{((results?.taxAmount || 0) + (results?.freightAmount || 0))?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
