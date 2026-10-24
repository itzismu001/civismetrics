import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const initialTrades = [
  { id: 'mason', name: 'Head Mason / Bricklayer', dailyWage: 1100, menCount: 3, days: 25 },
  { id: 'barbender', name: 'Steel Barbender', dailyWage: 950, menCount: 2, days: 15 },
  { id: 'carpenter', name: 'Shuttering Carpenter', dailyWage: 950, menCount: 2, days: 18 },
  { id: 'plasterer', name: 'Plasterer (Finishing)', dailyWage: 1000, menCount: 2, days: 14 },
  { id: 'painter', name: 'Painter', dailyWage: 850, menCount: 2, days: 12 },
  { id: 'electrician', name: 'Electrician / Wireman', dailyWage: 900, menCount: 1, days: 10 },
  { id: 'helper', name: 'Unskilled Helpers / Beldar', dailyWage: 650, menCount: 6, days: 30 }
];

export default function LabourCostCalculator({ isProjectMode = false, onAddOn }) {
  const [trades, setTrades] = useState(initialTrades);
  const [contractorMargin, setContractorMargin] = useState(10); // 10% supervisor/contractor fee
  const [overtimeAllowance, setOvertimeAllowance] = useState(5);
  const [currency, setCurrency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [results, setResults] = useState(null);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

  const handleFieldChange = (id, field, value) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, [field]: Math.max(0, parseFloat(value) || 0) } : t));
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

  // --- Calculation & 3D Workforce Rendering ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [trades, contractorMargin, overtimeAllowance, visualTheme]);

  const calculateAndRender = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    let totalManDays = 0;
    let baseWages = 0;
    let totalHeadcount = 0;

    const tradeBreakdown = trades.map(t => {
      const manDays = t.menCount * t.days;
      const totalWage = manDays * t.dailyWage;
      totalManDays += manDays;
      baseWages += totalWage;
      totalHeadcount += t.menCount;
      return { ...t, manDays, totalWage };
    });

    const marginAmount = baseWages * (contractorMargin / 100);
    const overtimeAmount = baseWages * (overtimeAllowance / 100);
    const grandTotal = baseWages + marginAmount + overtimeAmount;

    setResults({
      totalHeadcount,
      totalManDays,
      baseWages,
      marginAmount,
      overtimeAmount,
      grandTotal,
      tradeBreakdown
    });

    // 3D Site Workforce Representation
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicLabor') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicLabor';

    const isBlueprint = visualTheme === 'blueprint';
    const helmetMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x0ea5e9 : 0xf59e0b, roughness: 0.3 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x0284c7, roughness: 0.8 });

    // Render 3D Workforce Avatars
    let avatarIndex = 0;
    trades.forEach(t => {
      for (let i = 0; i < Math.min(4, t.menCount); i++) {
        const angle = (avatarIndex / 16) * Math.PI * 2;
        const radius = 3.5 + (avatarIndex % 2) * 1.5;
        const posX = Math.cos(angle) * radius;
        const posZ = Math.sin(angle) * radius;

        // Body
        const bodyGeom = new THREE.CylinderGeometry(0.2, 0.25, 1.2, 12);
        bodyGeom.translate(posX, 0.6, posZ);
        mainGroup.add(new THREE.Mesh(bodyGeom, bodyMat));

        // Helmet/Head
        const headGeom = new THREE.SphereGeometry(0.2, 12, 12);
        headGeom.translate(posX, 1.3, posZ);
        mainGroup.add(new THREE.Mesh(headGeom, helmetMat));

        avatarIndex++;
      }
    });

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Labour Cost Estimator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Trade-wise man-days, daily wages, crew sizing & contractor markup</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Trade Crew & Wage Schedule</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-dashboard text-slate-500 dark:text-zinc-400 uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Trade Role</th>
                    <th className="py-2.5 px-3">Daily Rate ({currency})</th>
                    <th className="py-2.5 px-3">Headcount</th>
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3 text-right">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-zinc-200">{t.name}</td>
                      <td className="py-2.5 px-3">
                        <input type="number" value={t.dailyWage} onChange={e => handleFieldChange(t.id, 'dailyWage', e.target.value)} className="w-16 bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3">
                        <input type="number" value={t.menCount} onChange={e => handleFieldChange(t.id, 'menCount', e.target.value)} className="w-12 bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3">
                        <input type="number" value={t.days} onChange={e => handleFieldChange(t.id, 'days', e.target.value)} className="w-12 bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs" />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {currency}{(t.menCount * t.days * t.dailyWage).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-borderDark">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Contractor / Supervisor Fee (%)</label>
                <input type="number" value={contractorMargin} onChange={e => setContractorMargin(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500">Overtime & Holidays (%)</label>
                <input type="number" value={overtimeAllowance} onChange={e => setOvertimeAllowance(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-semibold" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="h-[280px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Site Workforce Representation</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Total Labour Budget</p>
              <p className="text-lg font-bold text-cyan-400">{currency}{results?.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 uppercase">Total Man-Days</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{results?.totalManDays} Days</p>
            </div>
            <div className="p-4 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 uppercase">Active Crew Size</p>
              <p className="text-base font-bold text-amber-500 mt-1">{results?.totalHeadcount} Workers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
