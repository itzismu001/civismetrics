import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const unitToMeter = { 'm': 1, 'ft': 0.3048, 'cm': 0.01, 'in': 0.0254, 'yd': 0.9144 };

const shapes = [
  { id: 'rectangle', name: 'Rectangle / Square' },
  { id: 'triangle', name: 'Triangle (Heron Formula: 3 Sides)' },
  { id: 'trapezoid', name: 'Trapezoid / Irregular Quad' },
  { id: 'circle', name: 'Circle / Circular Pad' },
  { id: 'ellipse', name: 'Ellipse / Oval' },
  { id: 'lshape', name: 'L-Shaped Room / Plot' }
];

export default function AreaCalculator({ isProjectMode = false, onAddOn }) {
  const [unitSystem, setUnitSystem] = useState('ft');
  const [inputs, setInputs] = useState({
    shapeId: 'rectangle',
    dimA: 30, // Length or Base or Side A or Radius
    dimB: 20, // Width or Height or Side B
    dimC: 25, // Side C or Base 2
    dimD: 15, // Side D or Leg 2
    dimE: 10,
    ratePerSqUnit: 120, // Cost per sq ft or sq m
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
    camera.position.set(0, 20, 20);
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
    const dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    dirLight.position.set(15, 25, 15);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(40, 40, 0x0ea5e9, 0x334155);
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

  // --- Calculation & 3D Rendering ---
  useEffect(() => {
    const handler = setTimeout(() => calculateAndRender(), 200);
    return () => clearTimeout(handler);
  }, [inputs, unitSystem, visualTheme]);

  const calculateAndRender = () => {
    const { shapeId, dimA, dimB, dimC, dimD, ratePerSqUnit } = inputs;
    const scene = sceneRef.current;
    if (!scene) return;

    let areaSqUnits = 0;
    let perimeterUnits = 0;

    const a = dimA || 1, b = dimB || 1, c = dimC || 1, d = dimD || 1;

    if (shapeId === 'rectangle') {
      areaSqUnits = a * b;
      perimeterUnits = 2 * (a + b);
    } else if (shapeId === 'triangle') {
      const s = (a + b + c) / 2;
      const diff = s * (s - a) * (s - b) * (s - c);
      areaSqUnits = diff > 0 ? Math.sqrt(diff) : 0.5 * a * b;
      perimeterUnits = a + b + c;
    } else if (shapeId === 'trapezoid') {
      areaSqUnits = 0.5 * (a + b) * c; // (Base1 + Base2)/2 * Height
      perimeterUnits = a + b + (2 * Math.sqrt(Math.pow((Math.abs(a - b)/2), 2) + Math.pow(c, 2)));
    } else if (shapeId === 'circle') {
      areaSqUnits = Math.PI * Math.pow(a, 2);
      perimeterUnits = 2 * Math.PI * a;
    } else if (shapeId === 'ellipse') {
      areaSqUnits = Math.PI * a * b;
      perimeterUnits = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    } else if (shapeId === 'lshape') {
      areaSqUnits = (a * b) - ((a - c) * (b - d));
      perimeterUnits = 2 * (a + b);
    }

    if (areaSqUnits <= 0) areaSqUnits = 100;

    // Unit Conversion Matrix
    const factorToM2 = Math.pow(unitToMeter[unitSystem], 2);
    const areaSqm = areaSqUnits * factorToM2;
    const areaSqft = areaSqm * 10.7639;
    const areaSqYd = areaSqft / 9;
    const areaAcres = areaSqft / 43560;
    const areaHectares = areaSqm / 10000;
    const areaGuntha = areaSqft / 1089;

    const grandTotal = areaSqUnits * ratePerSqUnit;

    setResults({
      areaSqUnits,
      perimeterUnits,
      areaSqm,
      areaSqft,
      areaSqYd,
      areaAcres,
      areaHectares,
      areaGuntha,
      grandTotal
    });

    // 3D Scene Assembly
    const toRemove = [];
    scene.children.forEach(c => { if (c.name === 'dynamicArea') toRemove.push(c); });
    toRemove.forEach(c => {
      scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });

    const mainGroup = new THREE.Group();
    mainGroup.name = 'dynamicArea';

    const isBlueprint = visualTheme === 'blueprint';
    const faceMat = new THREE.MeshStandardMaterial({
      color: isBlueprint ? 0x0ea5e9 : 0x06b6d4,
      roughness: 0.8,
      wireframe: isBlueprint,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isBlueprint ? 0.4 : 0.85
    });

    // Generate Shape Mesh
    const shape = new THREE.Shape();
    const scaleFactor = 0.3;

    if (shapeId === 'rectangle') {
      const w = a * scaleFactor, h = b * scaleFactor;
      shape.moveTo(-w/2, -h/2);
      shape.lineTo(w/2, -h/2);
      shape.lineTo(w/2, h/2);
      shape.lineTo(-w/2, h/2);
      shape.closePath();
    } else if (shapeId === 'circle') {
      shape.absarc(0, 0, a * scaleFactor, 0, Math.PI * 2, false);
    } else {
      const w = a * scaleFactor, h = b * scaleFactor;
      shape.moveTo(-w/2, -h/2);
      shape.lineTo(w/2, -h/2);
      shape.lineTo(w/4, h/2);
      shape.lineTo(-w/4, h/2);
      shape.closePath();
    }

    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, faceMat);
    mesh.position.y = 0.05;
    mainGroup.add(mesh);

    // Perimeter Border Line
    const edges = new THREE.EdgesGeometry(geom);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    line.position.y = 0.06;
    mainGroup.add(line);

    scene.add(mainGroup);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white/60 dark:bg-cardDark/60 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-borderDark shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Area Calculator</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">2D multi-geometry surface area, perimeter & conversion matrix</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => setUnitSystem('ft')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'ft' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Feet (ft)</button>
            <button onClick={() => setUnitSystem('m')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${unitSystem === 'm' ? 'bg-white dark:bg-cardDark text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 dark:text-zinc-400'}`}>Meters (m)</button>
          </div>

          <button onClick={() => setVisualTheme(v => v === 'realistic' ? 'blueprint' : 'realistic')} className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${visualTheme === 'realistic' ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
            {visualTheme === 'realistic' ? 'Realistic' : 'Blueprint'}
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
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400">Shape Parameters</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Geometric Shape</label>
              <select name="shapeId" value={inputs.shapeId} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500">
                {shapes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Dimension A ({unitSystem})</label>
                <input type="number" name="dimA" value={inputs.dimA} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Dimension B ({unitSystem})</label>
                <input type="number" name="dimB" value={inputs.dimB} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Rate / Sq Unit ({inputs.currency})</label>
                <input type="number" name="ratePerSqUnit" value={inputs.ratePerSqUnit} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1 block">Perimeter</label>
                <div className="w-full bg-slate-100 dark:bg-dashboard border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-zinc-200 font-bold">
                  {results?.perimeterUnits?.toFixed(2)} {unitSystem}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="h-[320px] bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-lg">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 pointer-events-none bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white text-xs">
              <span className="text-cyan-400 font-bold">2D/3D Surface Geometry</span>
            </div>
            <div className="absolute bottom-4 right-4 pointer-events-none bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Calculated Area</p>
              <p className="text-lg font-bold text-cyan-400">{results?.areaSqUnits?.toFixed(2)} sq.{unitSystem}</p>
            </div>
          </div>

          {/* Unit Conversion Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Square Feet</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{results?.areaSqft?.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Square Meters</p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{results?.areaSqm?.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Guntha / Cents</p>
              <p className="text-base font-bold text-amber-500 mt-1">{results?.areaGuntha?.toFixed(3)}</p>
            </div>
            <div className="p-3 bg-white dark:bg-cardDark rounded-xl border border-slate-200 dark:border-borderDark">
              <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase">Acres</p>
              <p className="text-base font-bold text-emerald-500 mt-1">{results?.areaAcres?.toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
