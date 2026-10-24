import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUnit } from './context/UnitContext.jsx';
import { useCad } from './context/CadContext.jsx';
import LoginPage from './components/LoginPage.jsx';
import EngineeringHub from './components/EngineeringHub.jsx';
import BricksCalculator from './components/BricksCalculator';
import FoundationCalculator from './components/FoundationCalculator';
import ExcavationCalculator from './components/ExcavationCalculator'; 
import CementCalculator from './components/CementCalculator';
import ColumnCalculator from './components/ColumnCalculator';
import SandCalculator from './components/SandCalculator';
import AggregateCalculator from './components/AggregateCalculator';
import ConcreteCalculator from './components/ConcreteCalculator';
import SteelCalculator from './components/SteelCalculator';
import SlabCalculator from './components/SlabCalculator';
import BeamCalculator from './components/BeamCalculator';
import StaircaseCalculator from './components/StaircaseCalculator';
import AreaCalculator from './components/AreaCalculator';
import VolumeCalculator from './components/VolumeCalculator';
import LandAreaConverter from './components/LandAreaConverter';
import PaintCalculator from './components/PaintCalculator';
import PlasterCalculator from './components/PlasterCalculator';
import TileCalculator from './components/TileCalculator';
import MaterialCostCalculator from './components/MaterialCostCalculator';
import LabourCostCalculator from './components/LabourCostCalculator';
import TotalProjectEstimator from './components/TotalProjectEstimator';
import RebarWeightCalculator from './components/RebarWeightCalculator';
import MortarCalculator from './components/MortarCalculator';
import InsulationEstimator from './components/InsulationEstimator';
import ElectricalWiringCalculator from './components/ElectricalWiringCalculator';

import ProjectMasterBOQ from './components/ProjectMasterBOQ';
import RebarCuttingOptimizer from './components/RebarCuttingOptimizer';
import ConcreteMixDesignIS10262 from './components/ConcreteMixDesignIS10262';
import ProjectTracker from './components/ProjectTracker';
import CadStudio from './components/CadStudio';

const SECTIONS = [
  {
    title: "CAD & Project Master",
    icon: "📐",
    items: ['AutoCAD Studio', 'Project Tracker', 'Project Master BOQ', 'BBS Rebar Optimizer', 'IS 10262 Mix Design']
  },
  {
    title: "Core Materials",
    icon: "🧱",
    items: ['Cement Calculator', 'Sand Calculator', 'Aggregate Calculator', 'Bricks Calculator', 'Concrete Calculator', 'Steel Calculator']
  },
  {
    title: "Structural",
    icon: "🏗️",
    items: ['Foundation Calculator', 'Excavation Calculator', 'Slab Calculator', 'Column Calculator', 'Beam Calculator', 'Staircase Calculator']
  },
  {
    title: "Measurements",
    icon: "📐",
    items: ['Area Calculator', 'Volume Calculator', 'Land Area Converter']
  },
  {
    title: "Finishing",
    icon: "🎨",
    items: ['Paint Calculator', 'Plaster Calculator', 'Tile Calculator']
  },
  {
    title: "Costing",
    icon: "💰",
    items: ['Material Cost', 'Labour Cost', 'Total Project Estimator']
  },
  {
    title: "Advanced",
    icon: "⚡",
    items: ['Rebar Weight', 'Mortar Calculator', 'Insulation Estimator', 'Electrical Wiring']
  }
];

const SidebarSection = ({ title, icon, items, activeItem, setActiveView, closeMobile }) => (
  <div className="mb-5 shrink-0">
    <div className="flex items-center gap-2 mb-2 px-2">
      <span className="text-xs opacity-80">{icon}</span>
      <h3 className="text-slate-400 font-extrabold text-[10px] tracking-[0.18em] uppercase font-mono">{title}</h3>
    </div>
    <div className="flex flex-col gap-0.5">
      {items.map(item => {
        const isActive = activeItem === item;
        return (
          <button 
            key={item} 
            onClick={() => {
              setActiveView(item);
              if (closeMobile) closeMobile();
            }}
            className={`text-left text-[12px] px-3 py-2.5 sm:py-2 rounded-xl transition-all duration-150 flex items-center justify-between group touch-manipulation ${
              isActive 
                ? 'bg-sky-500/15 text-sky-400 font-bold border border-sky-500/30 shadow-[0_0_12px_-4px_rgba(56,189,248,0.3)]' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                isActive ? 'bg-sky-400 scale-125 shadow-glow-accent' : 'bg-slate-600 group-hover:bg-slate-400'
              }`}></span>
              <span className="truncate">{item}</span>
            </div>
            {isActive && (
              <span className="text-[10px] font-mono font-bold text-sky-400 shrink-0 ml-1">LIVE</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const Sidebar = ({ isOpen, isMobile, closeMobile, activeView, setActiveView }) => {
  const sidebarClasses = isMobile 
    ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-[280px] max-w-[85vw] ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`
    : `relative flex flex-col h-full border-r border-borderDark shrink-0 bg-dash-900 z-20 transition-all duration-300 ease-in-out ${isOpen ? 'w-[260px] xl:w-[275px]' : 'w-[64px]'}`;

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity animate-fade-in touch-none" 
          onClick={closeMobile}
        />
      )}

      <aside className={`${sidebarClasses} overflow-hidden select-none bg-dash-900 border-r border-borderDark`}>
        
        {/* Top Header / Brand */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-borderDark shrink-0">
          <div 
            onClick={() => { setActiveView('Overview'); if (closeMobile) closeMobile(); }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-base font-black text-slate-950 shrink-0 shadow-glow-accent group-hover:scale-105 transition-all">
              CM
            </div>
            {isOpen && (
              <div className="min-w-0 animate-fade-in">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-sky-400 font-bold block leading-none">WORKSPACE</span>
                <span className="text-sm font-extrabold text-white tracking-tight truncate block group-hover:text-sky-400 transition-colors">
                  Civil Suite 2.0
                </span>
              </div>
            )}
          </div>

          {isMobile && isOpen && (
            <button 
              onClick={closeMobile} 
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto custom-scroll py-3 px-2 space-y-4">
          {/* Overview Hub Button */}
          <button
            onClick={() => { setActiveView('Overview'); if (closeMobile) closeMobile(); }}
            className={`w-full text-left text-xs p-2.5 rounded-xl font-bold transition-all flex items-center gap-2.5 touch-manipulation ${
              activeView === 'Overview'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-black shadow-glow-accent'
                : 'bg-cardDark/80 border border-borderDark text-slate-300 hover:text-white hover:border-sky-500/30'
            }`}
            title="Overview Hub"
          >
            <span className="text-base shrink-0">🏠</span>
            {isOpen && <span className="truncate">Overview Hub</span>}
          </button>

          {/* If collapsed on desktop: show single category icon triggers */}
          {!isOpen && !isMobile ? (
            <div className="space-y-2 pt-2 border-t border-borderDark/60 flex flex-col items-center">
              {SECTIONS.map((sec) => {
                const isSectionActive = sec.items.includes(activeView);
                return (
                  <button
                    key={sec.title}
                    onClick={() => setActiveView(sec.items[0])}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer text-base ${
                      isSectionActive
                        ? 'bg-sky-500/15 border border-sky-500/40 text-sky-400 shadow-glow-accent'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                    title={`${sec.title} (${sec.items.length} tools)`}
                  >
                    {sec.icon}
                  </button>
                );
              })}
            </div>
          ) : (
            /* If expanded: show categorized list */
            <div className="space-y-4 pt-1 animate-fade-in">
              {SECTIONS.map((section) => (
                <SidebarSection
                  key={section.title}
                  title={section.title}
                  icon={section.icon}
                  items={section.items}
                  activeItem={activeView}
                  setActiveView={setActiveView}
                  closeMobile={isMobile ? closeMobile : null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer info (when expanded) */}
        {isOpen && (
          <div className="p-3 border-t border-borderDark shrink-0 bg-dash-950/60 animate-fade-in">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="text-sky-400 font-bold">● 24 Engines</span>
              <span>IS:456 Code</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

const DashboardHeader = ({ toggleLeft, title, unitSystem, toggleUnitSystem, setActiveView, onLogout }) => {
  const currentCategory = useMemo(() => {
    for (const sec of SECTIONS) {
      if (sec.items.includes(title)) return sec.title;
    }
    return 'Dashboard';
  }, [title]);

  return (
    <header className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4 shrink-0 z-10 border-b border-borderDark pb-2.5 sm:pb-3">
      {/* Top Bar on Mobile / Left Section on Desktop */}
      <div className="flex items-center justify-between md:justify-start gap-2.5 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            onClick={toggleLeft} 
            className="p-2 sm:p-2 text-slate-300 hover:text-white bg-cardDark hover:bg-slate-800 border border-borderDark rounded-xl transition-all shadow-sm shrink-0 touch-manipulation active:scale-95"
            title="Toggle Menu"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">
              <span 
                onClick={() => setActiveView('Overview')} 
                className="hover:text-sky-400 cursor-pointer transition-colors"
              >
                CivisMetric
              </span>
              <span>/</span>
              <span className="text-slate-400 truncate">{currentCategory}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
                {title}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                Pro
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Hub Icon Button */}
        <button
          onClick={() => setActiveView('Overview')}
          className="md:hidden p-2 text-slate-300 hover:text-white bg-cardDark border border-borderDark rounded-xl text-xs flex items-center gap-1"
          title="Back to Hub"
        >
          <span>🏠</span>
        </button>
      </div>
      
      {/* Right Section: Metric/Imperial + Actions + Logout */}
      <div className="flex items-center gap-2 justify-between md:justify-end shrink-0">
        {/* Metric / Imperial Segmented Control */}
        <div className="flex p-0.5 bg-dash-950 rounded-xl border border-borderDark shadow-inner flex-1 md:flex-initial">
          <button
            onClick={toggleUnitSystem}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 touch-manipulation ${
              unitSystem === 'metric'
                ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📏</span> Metric <span className="hidden xs:inline">(m)</span>
          </button>
          <button
            onClick={toggleUnitSystem}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 touch-manipulation ${
              unitSystem === 'imperial'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📐</span> Imperial <span className="hidden xs:inline">(ft)</span>
          </button>
        </div>

        {/* Print BOQ */}
        <button 
          onClick={() => window.print()} 
          className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm touch-manipulation"
          title="Print BOQ"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          BOQ
        </button>

        {/* Logout Button */}
        {onLogout && (
          <button 
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/30 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm touch-manipulation"
            title="Log Out & Return to Login"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center pl-1 border-l border-borderDark shrink-0">
          <img 
            src="https://ui-avatars.com/api/?name=Civis+Engineer&background=38bdf8&color=070b14&bold=true&rounded=true" 
            alt="Avatar" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-sky-500/30 shadow-sm" 
          />
        </div>
      </div>
    </header>
  );
};

const EngineerIcon = ({ color, flip, pointing }) => (
  <svg width="28" height="42" viewBox="0 0 24 40" fill="none" stroke={color} strokeWidth="1.5" style={{ transform: flip ? 'scaleX(-1)' : 'none', filter: `drop-shadow(0 0 6px ${color})` }}>
    <path d="M5 10c0-4 14-4 14 0h2v2H3v-2h2z" fill={color} stroke="none" opacity="0.8" />
    <path d="M3 12h18" strokeWidth="2" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M12 17v12" strokeWidth="2.5" />
    {pointing ? (
      <path d="M12 18l-3 4l1 5M12 18l6 -2l3 0" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M12 18l-4 6l2 4M12 18l4 6l-2 4" strokeLinecap="round" strokeLinejoin="round" />
    )}
    <path d="M12 29l-3 10M12 29l3 10" strokeLinecap="round" />
    {!pointing && <rect x="5" y="22" width="4" height="6" rx="0.5" fill={color} fillOpacity="0.4" stroke="none" />}
  </svg>
);

const AnimatedHouse = ({ isDark = true, scale = 1, isIntro = false }) => {
  const rows = 6;
  const cols = 8;
  
  const particles = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => {
      const left = Math.random() * 220; 
      const delay = Math.random() * 1.5 + 0.2; 
      const duration = 0.5 + Math.random() * 0.4;
      const isSand = Math.random() > 0.4;
      const colorClass = isSand ? 'bg-amber-600' : 'bg-slate-500';
      
      return (
        <div 
          key={`p-${i}`} 
          className={`absolute bottom-[-10px] w-[3px] h-[3px] rounded-sm particle ${colorClass}`} 
          style={{ left: `${left}px`, animation: `drop-particle ${duration}s ${delay}s ease-in forwards` }} 
        />
      );
    });
  }, []);

  const bricks = useMemo(() => {
    const arr = [];
    let bDelay = isIntro ? 1.5 : 0; 
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < 3 && c >= 3 && c <= 4) continue;
        if (r >= 2 && r <= 4 && c === 1) continue;

        const brickClass = 'bg-gradient-to-br from-amber-400 to-orange-600 border border-orange-700/50 shadow-[0_0_6px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]';

        arr.push(
          <div
            key={`${r}-${c}`}
            className={`absolute rounded-[2px] brick-anim z-10 ${brickClass}`}
            style={{ 
              bottom: `${r * 17}px`, 
              left: `${c * 27 + (r % 2 === 0 ? 0 : 13.5)}px`, 
              width: '26px', 
              height: '16px', 
              animationDelay: `${bDelay}s` 
            }}
          />
        );
        bDelay += 0.025; 
      }
    }
    return { elements: arr, totalDelay: bDelay };
  }, [isIntro]);

  const finishDelay = bricks.totalDelay + 0.1;

  return (
    <div className="relative mx-auto origin-bottom" style={{ width: '240px', height: '200px', transform: `scale(${scale})` }}>
      {isIntro && (
        <svg className="absolute bottom-[2px] left-[5px] w-[230px] h-[175px] z-0 overflow-visible" viewBox="0 0 230 175" fill="none">
          <path d="M0,175 L230,175 L230,70 L115,0 L0,70 Z" stroke="#0ea5e9" strokeWidth="2" className="anim-wireframe" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="76" y="124" width="54" height="51" stroke="#0ea5e9" strokeWidth="1.5" className="anim-wireframe" style={{ animationDelay: '0.2s' }} />
          <rect x="22" y="90" width="27" height="51" stroke="#0ea5e9" strokeWidth="1.5" className="anim-wireframe" style={{ animationDelay: '0.4s' }} />
        </svg>
      )}

      <div className="absolute fade-anim bg-cyan-400/50 blur-[12px]" style={{ bottom: '-15px', left: '-10px', width: '260px', height: '6px', animationDelay: isIntro ? '1.5s' : '0.1s' }}></div>
      {isIntro && <div className="absolute inset-0 overflow-visible">{particles}</div>}

      {isIntro && (
        <div className="absolute bottom-[8px] left-0 w-[240px] h-[45px] z-0 pointer-events-none overflow-visible opacity-90">
          <div className="absolute bottom-0 anim-walk-right" style={{ animationDelay: '0.2s' }}>
            <div className="anim-bob"><EngineerIcon color="#22d3ee" /></div>
          </div>
          <div className="absolute bottom-0 anim-walk-left" style={{ animationDelay: '1.2s' }}>
            <div className="anim-bob" style={{ animationDelay: '0.3s' }}><EngineerIcon color="#818cf8" flip /></div>
          </div>
          <div className="absolute bottom-0 left-[180px] fade-anim glitch-out" style={{ animationDelay: '2.5s', animationDuration: `${finishDelay - 2.5}s` }}>
            <div className="anim-bob" style={{ animationDelay: '0.1s' }}><EngineerIcon color="#fbbf24" pointing /></div>
          </div>
        </div>
      )}

      <div className="absolute rounded-[3px] shadow-[0_5px_15px_rgba(0,0,0,0.6)] fade-anim flex flex-col justify-end z-10 bg-zinc-800 border-t-2 border-cyan-500/60" style={{ bottom: '-10px', left: '0', width: '240px', height: '10px', animationDelay: isIntro ? '1.4s' : '0.1s' }}>
        <div className="w-full h-[2px] bg-cyan-400/30"></div>
      </div>

      <div className="absolute z-10" style={{ bottom: '0', left: '6px', width: '228px', height: '105px' }}>
        {bricks.elements}
        
        <div 
          className="absolute rounded-t-lg fade-anim flex items-center justify-end pr-2.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)] border-2 z-20 bg-gradient-to-br from-zinc-800 to-black border-zinc-600"
          style={{ bottom: '0', left: '81px', width: '54px', height: '51px', animationDelay: `${finishDelay - 0.2}s` }}
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></div>
        </div>

        <div 
          className="absolute rounded-[4px] backdrop-blur-md overflow-hidden window-power border-2 z-20 bg-cyan-950/40 border-cyan-400"
          style={{ bottom: '34px', left: '27px', width: '27px', height: '51px', animationDelay: `${finishDelay + 0.3}s` }}
        >
          <div className="absolute top-1/2 w-full h-[2px] bg-cyan-400"></div>
          <div className="absolute left-1/2 w-[2px] h-full bg-cyan-400"></div>
          <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60 animate-shimmer-glass"></div>
        </div>
      </div>

      <div className="absolute roof-anim z-30" style={{ bottom: '102px', left: '0', width: '240px', height: '75px', animationDelay: `${finishDelay}s` }}>
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full animate-roof-flash" style={{ overflow: 'visible', animationDelay: `${finishDelay}s` }}>
          <defs>
            <linearGradient id="roofGradDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>
          <polygon points="0,50 50,0 100,50" fill="#09090b" transform="translate(0, 4)" />
          <polygon points="0,50 50,0 100,50" fill="url(#roofGradDark)" />
          <polyline points="0,50 50,0 100,50" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinejoin="round" />
          <polyline points="0,50 50,0" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

const App = () => {
  const { unitSystem, toggleUnitSystem } = useUnit();
  const { registerCadNavigator } = useCad();
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setUserRole] = useState('engineer');
  const [showIntro, setShowIntro] = useState(false);
  const [introFading, setIntroFading] = useState(false);

  const [currentView, setCurrentView] = useState('Overview');

  // Register navigation callback so CadContext can route to CAD Studio
  useEffect(() => {
    registerCadNavigator(() => setCurrentView('AutoCAD Studio'));
  }, [registerCadNavigator]);

  const handleLogin = (role) => {
    setUserRole(role);
    setIsLoggedIn(true);
    setCurrentView('Overview');
    setShowIntro(true);
    setTimeout(() => setIntroFading(true), 5500);
    setTimeout(() => setShowIntro(false), 6300);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowIntro(false);
    setIntroFading(false);
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsMobile(true);
        setIsLeftOpen(false);
      } else {
        setIsMobile(false);
        setIsLeftOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      {showIntro && (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-dashboard blueprint-grid transition-all duration-700 ease-in-out overflow-hidden ${introFading ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/20 blur-[100px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '5s' }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 via-transparent to-transparent blur-3xl opacity-60"></div>

          <div className="flex flex-col items-center justify-center w-full relative z-10 px-4" style={{ transform: 'translateY(-5%)' }}>
            <div className="flex justify-center items-end relative mb-12" style={{ height: '240px', width: '340px' }}>
              <AnimatedHouse isDark={true} scale={1.25} isIntro={true} />
            </div>
            <div className="flex flex-col items-center opacity-0 animate-fade-in-up mt-6 text-center" style={{ animationDelay: '4.5s' }}>
              <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] mb-1 laser-text">
                CIVISMETRIC
              </h1>
              <div className="w-[120%] max-w-[340px] h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] mb-3"></div>
              <h2 className="text-gray-300 text-[10px] sm:text-[12px] tracking-[0.5em] uppercase font-semibold drop-shadow-md">
                Architecting The Future
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Shell: dynamic viewport height for mobile/tablet/desktop */}
      <div className={`w-full h-screen h-[100dvh] max-w-[1720px] lg:rounded-2xl flex overflow-hidden relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] mx-auto bg-dashboard border border-borderDark/80 shadow-premium-dark ${showIntro && !introFading ? 'scale-90 opacity-0 blur-lg' : 'scale-100 opacity-100 blur-0'}`}>
        
        <Sidebar 
          isOpen={isLeftOpen} 
          isMobile={isMobile} 
          closeMobile={() => setIsLeftOpen(false)} 
          activeView={currentView} 
          setActiveView={setCurrentView} 
        />
        
        <main className="flex-1 flex flex-col p-2.5 sm:p-4 lg:p-6 overflow-hidden relative bg-dash-950 z-10 min-w-0">
          
          {/* Subtle Ambient Engineering Lighting */}
          <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-sky-500/[0.04] blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-600/[0.03] blur-[140px] rounded-full pointer-events-none"></div>

          <DashboardHeader 
            toggleLeft={() => setIsLeftOpen(!isLeftOpen)} 
            title={currentView}
            unitSystem={unitSystem}
            toggleUnitSystem={toggleUnitSystem}
            setActiveView={setCurrentView}
            onLogout={handleLogout}
          />
          
          {/* Main Module Canvas: smooth scrolling for all modules, dashboards and calculators */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pr-1 pb-4">
            {currentView === 'AutoCAD Studio' ? (
              <CadStudio />
            ) : currentView === 'Project Tracker' ? (
              <ProjectTracker />
            ) : currentView === 'Project Master BOQ' ? (
              <ProjectMasterBOQ />
            ) : currentView === 'BBS Rebar Optimizer' ? (
              <RebarCuttingOptimizer />
            ) : currentView === 'IS 10262 Mix Design' ? (
              <ConcreteMixDesignIS10262 />
            ) : currentView === 'Bricks Calculator' ? (
              <BricksCalculator />
            ) : currentView === 'Foundation Calculator' ? (
              <FoundationCalculator />
            ) : currentView === 'Excavation Calculator' ? (
              <ExcavationCalculator />
            ) : currentView === 'Cement Calculator' ? (
              <CementCalculator /> 
            ) : currentView === 'Column Calculator' ? ( 
              <ColumnCalculator />
            ) : currentView === 'Sand Calculator' ? (
              <SandCalculator />
            ) : currentView === 'Aggregate Calculator' ? (
              <AggregateCalculator />
            ) : currentView === 'Concrete Calculator' ? (
              <ConcreteCalculator />
            ) : currentView === 'Steel Calculator' ? (
              <SteelCalculator />
            ) : currentView === 'Slab Calculator' ? (
              <SlabCalculator />
            ) : currentView === 'Beam Calculator' ? (
              <BeamCalculator />
            ) : currentView === 'Staircase Calculator' ? (
              <StaircaseCalculator />
            ) : currentView === 'Area Calculator' ? (
              <AreaCalculator />
            ) : currentView === 'Volume Calculator' ? (
              <VolumeCalculator />
            ) : currentView === 'Land Area Converter' ? (
              <LandAreaConverter />
            ) : currentView === 'Paint Calculator' ? (
              <PaintCalculator />
            ) : currentView === 'Plaster Calculator' ? (
              <PlasterCalculator />
            ) : currentView === 'Tile Calculator' ? (
              <TileCalculator />
            ) : currentView === 'Material Cost' ? (
              <MaterialCostCalculator />
            ) : currentView === 'Labour Cost' ? (
              <LabourCostCalculator />
            ) : currentView === 'Total Project Estimator' ? (
              <TotalProjectEstimator />
            ) : currentView === 'Rebar Weight' ? (
              <RebarWeightCalculator />
            ) : currentView === 'Mortar Calculator' ? (
              <MortarCalculator />
            ) : currentView === 'Insulation Estimator' ? (
              <InsulationEstimator />
            ) : currentView === 'Electrical Wiring' ? (
              <ElectricalWiringCalculator />
            ) : (
              <EngineeringHub onSelectTool={(toolName) => setCurrentView(toolName)} />
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default App;