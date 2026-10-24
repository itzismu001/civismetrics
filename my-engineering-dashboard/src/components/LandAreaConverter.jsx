import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const conversionToSqFt = {
  sqft: 1,
  sqm: 10.7639104,
  sqyd: 9,
  acre: 43560,
  hectare: 107639.104,
  guntha: 1089,         // India (Maharashtra, Karnataka, Gujarat)
  cent: 435.6,          // India (Tamil Nadu, Kerala)
  ground: 2400,         // India (Tamil Nadu Chennai standard)
  bigha_pucca: 27225,   // North India (Standard Pucca Bigha)
  bigha_bengal: 14400,  // Bengal Bigha
  biswa: 1361.25,       // 1/20th of Pucca Bigha
  kanal: 5445,          // Punjab / Haryana / Pakistan
  marla: 272.25,        // 1/20th of Kanal
  katha: 720,           // Bihar / Bengal
  ankanam: 72           // Andhra Pradesh
};

const unitLabels = {
  sqft: 'Square Feet (sq.ft)',
  sqm: 'Square Meters (m²)',
  sqyd: 'Square Yards / Gaj',
  acre: 'Acres (ac)',
  hectare: 'Hectares (ha)',
  guntha: 'Guntha / Gunta',
  cent: 'Cents / Decimal',
  ground: 'Grounds (2400 sq.ft)',
  bigha_pucca: 'Bigha (Standard Pucca)',
  bigha_bengal: 'Bigha (Bengal 14,400 sq.ft)',
  biswa: 'Biswa',
  kanal: 'Kanal',
  marla: 'Marla',
  katha: 'Katha / Cottah',
  ankanam: 'Ankanam'
};

export default function LandAreaConverter({ isProjectMode = false, onAddOn }) {
  const [inputValue, setInputValue] = useState(2400);
  const [sourceUnit, setSourceUnit] = useState('sqft');
  const [plotLengthFt, setPlotLengthFt] = useState(60);
  const [plotWidthFt, setPlotWidthFt] = useState(40);
  const [compoundWallRatePerRft, setCompoundWallRatePerRft] = useState(650);
  const [currency, setCurrency] = useState('₹');

  const [visualTheme, setVisualTheme] = useState('realistic');
  const [conversions, setConversions] = useState({});

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rendererRef = useRef(null);

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
    camera.position.set(20, 25, 25);
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
    controls.maxDistance = 300;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.5);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(50, 50, 0x0ea5e9, 0x334155);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
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

  // --- Calculation & 3D Plot Visualizer ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 150);
    return () => clearTimeout(handler);
  }, [inputValue, sourceUnit, plotLengthFt, plotWidthFt, compoundWallRatePerRft, visualTheme]);

  const calculateAndRender = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const val = parseFloat(inputValue) || 0;
    const sqftTotal = val * (conversionToSqFt[sourceUnit] || 1);

    const matrix = {};
    Object.keys(conversionToSqFt).forEach(k => {
      matrix[k] = sqftTotal / conversionToSqFt[k];
    });

    const pLen = parseFloat(plotLengthFt) || 60;
    const pWid = parseFloat(plotWidthFt) || 40;
    const perimeterFt = 2 * (pLen + pWid);
    const wallCost = perimeterFt * (parseFloat(compoundWallRatePerRft) || 650);

    setConversions({
      sqftTotal,
      matrix,
      perimeterFt,
      wallCost
    });

    // 3D Plot Rebuild
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicLand') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicLand';

    const isBlueprint = visualTheme === 'blueprint';
    const landColor = isBlueprint ? 0x0ea5e9 : 0x15803d;
    const landMat = new THREE.MeshStandardMaterial({
      color: landColor,
      roughness: 0.9,
      wireframe: isBlueprint,
      side: THREE.DoubleSide
    });

    const scale = 0.25;
    const pW = pWid * scale, pL = pLen * scale;

    // Land Plot Surface
    const plotGeom = new THREE.PlaneGeometry(pL, pW);
    plotGeom.rotateX(-Math.PI / 2);
    const plotMesh = new THREE.Mesh(plotGeom, landMat);
    plotMesh.position.y = 0.02;
    mainGroup.add(plotMesh);

    // Boundary Wall / Fence
    const wallMat = new THREE.MeshStandardMaterial({ color: isBlueprint ? 0x38bdf8 : 0x78716c });
    const wallH = 1.0;
    const wallT = 0.2;

    const addWall = (wL, posX, posZ, rotY) => {
      const g = new THREE.BoxGeometry(wL, wallH, wallT);
      g.translate(0, wallH / 2, 0);
      const m = new THREE.Mesh(g, wallMat);
      m.position.set(posX, 0.02, posZ);
      m.rotation.y = rotY;
      mainGroup.add(m);
    };

    addWall(pL, 0, -pW/2, 0);
    addWall(pL, 0, pW/2, 0);
    addWall(pW, -pL/2, 0, Math.PI / 2);
    addWall(pW, pL/2, 0, Math.PI / 2);

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Land Area Converter</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Regional Indian & International survey conversions & boundary cost</p>
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
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="p-6 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Input Area & Survey Unit</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Input Magnitude</label>
                <input type="number" value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Source Unit</label>
                <select value={sourceUnit} onChange={e => setSourceUnit(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                  {Object.entries(unitLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mt-2">Plot Dimensions & Compound Wall</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Length (ft)</label>
                <input type="number" value={plotLengthFt} onChange={e => setPlotLengthFt(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Width (ft)</label>
                <input type="number" value={plotWidthFt} onChange={e => setPlotWidthFt(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Compound Wall Rate / Rft ({currency})</label>
              <input type="number" value={compoundWallRatePerRft} onChange={e => setCompoundWallRatePerRft(e.target.value)} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[280px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">3D Survey Plot & Boundary Wall</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Boundary Wall Cost</p>
              <p className="text-lg font-bold text-emerald-400">{currency}{conversions?.wallCost?.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({conversions?.perimeterFt} Rft)</p>
            </div>
          </div>

          {/* Full Unit Conversion Matrix Table */}
          <div className="p-4 bg-white dark:bg-cardDark rounded-2xl border border-slate-200 dark:border-borderDark shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-3">Instant Conversion Matrix</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {conversions?.matrix && Object.entries(conversions.matrix).map(([unitKey, convertedVal]) => (
                <div key={unitKey} className="p-2.5 bg-slate-50 dark:bg-dashboard rounded-xl border border-slate-200/60 dark:border-borderDark">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 truncate">{unitLabels[unitKey]}</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{convertedVal < 0.01 ? convertedVal.toFixed(5) : convertedVal.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
