import React, { useState } from 'react';
import { useUnit } from '../context/UnitContext.jsx';

const categories = [
  {
    id: 'master',
    title: 'Project Master & BOQ Suite',
    icon: '📊',
    color: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    accentColor: '#10b981',
    border: 'border-emerald-500/30',
    tag: 'Executive SOR & BBS',
    badge: '3 Flagship Engines',
    tools: [
      { name: 'AutoCAD Studio', desc: 'Interactive 2D drafting canvas, snap grid, live BIM material takeoff & 3D WebGL extrusion', icon: '📐', tag: 'CAD & 3D BIM', complexity: 'Flagship' },
      { name: 'Project Tracker', desc: '5-phase construction lifecycle milestones, IS 456 curing timers & daily site log', icon: '📊', tag: 'IS 456 / CPM', complexity: 'Executive' },
      { name: 'Project Master BOQ', desc: 'Centralized multi-trade takeoff ledger, GST, margins & Excel/PDF export', icon: '📋', tag: 'CPWD / DSR SOR', complexity: 'Executive' },
      { name: 'BBS Rebar Optimizer', desc: 'IS 2502 shape codes, bend deductions & 12m stock cutting scrap reducer (<2%)', icon: '🔩', tag: 'IS 2502 / SP 34', complexity: 'Critical' },
      { name: 'IS 10262 Mix Design', desc: 'Target strength f\'ck, absolute volume method, moisture & 1-bag mixer batching', icon: '🧪', tag: 'IS 10262:2019', complexity: 'High Precision' },
    ]
  },
  {
    id: 'core',
    title: 'Core Materials',
    icon: '🧱',
    color: 'from-sky-500/20 via-sky-500/5 to-transparent',
    accentColor: '#38bdf8',
    border: 'border-sky-500/30',
    tag: 'Batching & Mixes',
    badge: '6 Engines',
    tools: [
      { name: 'Cement Calculator', desc: 'OPC/PPC bags, volume, bag batching & water-cement ratio', icon: '⚪', tag: 'IS 269 / 8112', complexity: 'Core' },
      { name: 'Sand Calculator', desc: 'River/M-Sand, bulking factor, moisture % & Brass volume', icon: '🏖️', tag: 'IS 383', complexity: 'Core' },
      { name: 'Aggregate Calculator', desc: '10mm & 20mm gravel grading, voids & compaction factor', icon: '🪨', tag: 'IS 383 Coarse', complexity: 'Core' },
      { name: 'Bricks Calculator', desc: 'Modular & traditional brick count with mortar waste allowance', icon: '🧱', tag: 'IS 1077', complexity: 'Standard' },
      { name: 'Concrete Calculator', desc: 'M15, M20, M25 mix design batching with dry volume multiplier', icon: '🏗️', tag: 'IS 10262 / 456', complexity: 'High Precision' },
      { name: 'Steel Calculator', desc: 'TMT rebar diameter, weight calculation & bundle logistics', icon: '⚙️', tag: 'IS 1786', complexity: 'High Precision' },
    ]
  },
  {
    id: 'structural',
    title: 'Structural Engineering',
    icon: '🏗️',
    color: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
    accentColor: '#818cf8',
    border: 'border-indigo-500/30',
    tag: 'IS 456 Standards',
    badge: '6 Engines',
    tools: [
      { name: 'Foundation Calculator', desc: 'Slab-on-grade, isolated footing & stem wall concrete / rebar', icon: '🏛️', tag: 'IS 456 / IS 1904', complexity: 'Critical' },
      { name: 'Excavation Calculator', desc: 'Pit & trench earthwork, slope side batter & soil swell factor', icon: '🚜', tag: 'CPWD Spec', complexity: 'Standard' },
      { name: 'Slab Calculator', desc: 'One-way & two-way slab RCC rebar mesh & cranked bars', icon: '📐', tag: 'IS 456 Cl. 24', complexity: 'Critical' },
      { name: 'Column Calculator', desc: 'Longitudinal bars, lateral ties & concrete core volume', icon: '🏛️', tag: 'IS 456 Cl. 26', complexity: 'Critical' },
      { name: 'Beam Calculator', desc: 'Flexural reinforcement & shear stirrups distribution', icon: '📏', tag: 'IS 456 Cl. 26', complexity: 'Critical' },
      { name: 'Staircase Calculator', desc: 'Riser, tread, waist slab thickness & landing RCC takeoff', icon: '🪜', tag: 'IS 456 Cl. 33', complexity: 'Advanced' },
    ]
  },
  {
    id: 'measurements',
    title: 'Measurements & Survey',
    icon: '📐',
    color: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    accentColor: '#10b981',
    border: 'border-emerald-500/30',
    tag: 'Geometry Engines',
    badge: '3 Engines',
    tools: [
      { name: 'Area Calculator', desc: 'Irregular polygon, Heron formula & trapezoidal plot survey', icon: '📏', tag: 'Cadastral Survey', complexity: 'Universal' },
      { name: 'Volume Calculator', desc: 'Cylinder, frustum, prism & pyramid 3D solid geometry', icon: '📦', tag: '3D Geometry', complexity: 'Universal' },
      { name: 'Land Area Converter', desc: 'Acres, Guntha, Cents, Ground, Sq.Yards, Bigha & Hectares', icon: '🗺️', tag: 'Regional Units', complexity: 'Instant' },
    ]
  },
  {
    id: 'finishing',
    title: 'Finishing & Surfaces',
    icon: '🎨',
    color: 'from-amber-500/20 via-amber-500/5 to-transparent',
    accentColor: '#f59e0b',
    border: 'border-amber-500/30',
    tag: 'Surface Estimates',
    badge: '3 Engines',
    tools: [
      { name: 'Paint Calculator', desc: 'Primer, wall putty & multi-coat internal/external paint coverage', icon: '🎨', tag: 'IS 5410', complexity: 'Standard' },
      { name: 'Plaster Calculator', desc: '12mm & 20mm internal/external cement plaster batching', icon: '🪵', tag: 'IS 1661', complexity: 'Standard' },
      { name: 'Tile Calculator', desc: 'Floor & wall tile counts with joint spacers & adhesive paste', icon: '🔲', tag: 'IS 13712', complexity: 'Standard' },
    ]
  },
  {
    id: 'costing',
    title: 'Costing & Takeoffs',
    icon: '💰',
    color: 'from-rose-500/20 via-rose-500/5 to-transparent',
    accentColor: '#f43f5e',
    border: 'border-rose-500/30',
    tag: 'Financial BOQs',
    badge: '3 Engines',
    tools: [
      { name: 'Material Cost', desc: 'Itemized material schedule, supplier pricing & variance tracker', icon: '📋', tag: 'BOQ Rate Analysis', complexity: 'Financial' },
      { name: 'Labour Cost', desc: 'Masons, bar benders, carpenters & helper daily wage calculator', icon: '👷', tag: 'DSR 2023', complexity: 'Financial' },
      { name: 'Total Project Estimator', desc: 'Comprehensive turnkey civil estimate & contingency breakdown', icon: '📊', tag: 'Turnkey BOQ', complexity: 'Executive' },
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced & MEP',
    icon: '⚡',
    color: 'from-teal-500/20 via-teal-500/5 to-transparent',
    accentColor: '#14b8a6',
    border: 'border-teal-500/30',
    tag: 'BBS & Thermal',
    badge: '4 Engines',
    tools: [
      { name: 'Rebar Weight', desc: 'Bar Bending Schedule (BBS) & D²/162 weight formula', icon: '🔩', tag: 'SP 34 (S&T)', complexity: 'High Precision' },
      { name: 'Mortar Calculator', desc: '1:3 to 1:6 dry factor volume batching & joint masonry', icon: '🥣', tag: 'IS 2250', complexity: 'Standard' },
      { name: 'Insulation Estimator', desc: 'Thermal R-value, U-factor & glass wool insulation packs', icon: '❄️', tag: 'ECBC Standards', complexity: 'Specialized' },
      { name: 'Electrical Wiring', desc: 'Total connected load kW, wire coils, conduit & MCBs', icon: '⚡', tag: 'IS 732', complexity: 'MEP' },
    ]
  }
];

export default function EngineeringHub({ onSelectTool }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { isMetric } = useUnit();

  const filteredCategories = categories
    .map(cat => ({
      ...cat,
      tools: cat.tools.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(cat => activeCategory === 'all' || cat.id === activeCategory)
    .filter(cat => cat.tools.length > 0);

  const totalEnginesCount = categories.reduce((sum, c) => sum + c.tools.length, 0);

  return (
    <div className="flex flex-col w-full pb-10 space-y-6">
      
      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-borderDark p-5 sm:p-7 shadow-2xl">
        {/* Glow ambient background orbs */}
        <div className="absolute top-0 right-10 w-[350px] h-[350px] bg-sky-500/10 blur-[90px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-20 w-[280px] h-[280px] bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              CivisMetric Suite · v2.0 Civil Engineering Workstation
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Engineering Calculation <span className="gradient-text">Command Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              24 enterprise-grade structural sizing engines, 3D WebGL real-time mesh visualizers, IS code derivations, and contractor procurement Bill of Quantities.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full xl:w-auto shrink-0">
            <div className="stat-card">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Engines</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              </div>
              <p className="text-xl font-extrabold text-sky-400 mt-1 font-mono">{totalEnginesCount}</p>
              <span className="text-[10px] text-slate-500">100% Active</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Standard</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              </div>
              <p className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">IS:456</p>
              <span className="text-[10px] text-slate-500">IS 10262 Code</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Visualizer</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">3D WebGL</p>
              <span className="text-[10px] text-slate-500">Hardware Accel.</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                <span>Active Unit</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              </div>
              <p className="text-xl font-extrabold text-amber-400 mt-1 font-mono">{isMetric ? 'Metric' : 'Imperial'}</p>
              <span className="text-[10px] text-slate-500">{isMetric ? 'Meters / kg' : 'Feet / lbs'}</span>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-6 pt-5 border-t border-borderDark flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Instant search by module name, code standard, or material (e.g. Concrete, Foundation, BBS, M25, Stirrups)..."
              className="search-input w-full pl-10 pr-4 py-2.5 text-xs text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbars shrink-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`pill-tab ${activeCategory === 'all' ? 'pill-tab-active' : 'pill-tab-inactive'}`}
            >
              All Engines ({totalEnginesCount})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`pill-tab flex items-center gap-1.5 ${activeCategory === cat.id ? 'pill-tab-active' : 'pill-tab-inactive'}`}
              >
                <span>{cat.icon}</span>
                <span>{cat.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATEGORY ENGINES GRID ── */}
      <div className="space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="bg-cardDark border border-borderDark rounded-2xl p-12 text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="text-base font-bold text-white">No engineering engines found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No matching modules for "{searchQuery}". Try searching for terms like "Slab", "Mix", "Rebar", "Excavation", or "Plaster".
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="px-4 py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/40 rounded-xl text-xs font-bold transition-all"
            >
              Clear Search Filters
            </button>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div key={cat.id} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl p-1.5 rounded-lg bg-slate-900 border border-borderDark shadow-sm">{cat.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">{cat.title}</h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 font-semibold font-mono">
                        {cat.tag}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-mono font-semibold">{cat.tools.length} modules available</span>
              </div>

              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {cat.tools.map(tool => (
                  <div
                    key={tool.name}
                    onClick={() => onSelectTool(tool.name)}
                    className="calc-card bg-gradient-card border border-borderDark rounded-xl p-4 sm:p-5 cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{tool.icon}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-md">
                            {tool.tag}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0 translate-x-1">
                          Open Engine →
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {tool.desc}
                      </p>
                    </div>

                    {/* Footer Sizing Tags */}
                    <div className="mt-4 pt-3 border-t border-borderDark/60 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="status-dot bg-sky-400" style={{ color: '#38bdf8' }}></span>
                        <span className="font-mono">{tool.complexity}</span>
                      </div>
                      <span className="text-sky-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Calculate <span>↗</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
