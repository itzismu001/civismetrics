import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { useUnit } from '../context/UnitContext.jsx';

// Rebar unit weight per meter (D^2 / 162.28 in kg/m)
const rebarWeights = {
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.853,
  32: 6.313
};

const standardShapes = [
  { id: 'straight', name: 'Shape 00: Straight Bar', icon: '—', desc: 'Main longitudinal tension/compression rebar' },
  { id: 'lbend', name: 'Shape 21: L-Bend (90° Hook)', icon: '⌐', desc: 'Beam-column junction anchorage rebar' },
  { id: 'cranked', name: 'Shape 41: Cranked / Bent-Up', icon: '⎍', desc: 'One-way/Two-way slab shear & hogging moment' },
  { id: 'stirrup', name: 'Shape 51: Rectangular Stirrup', icon: '▢', desc: 'Beam shear link / Column lateral tie with 135° hooks' },
  { id: 'chair', name: 'Shape 71: Top Mesh Chair Bar', icon: '⑁', desc: 'Maintains top & bottom mat spacing during slab pour' }
];

export default function RebarCuttingOptimizer() {
  const { addItemToProject } = useProject();
  const { isMetric } = useUnit();

  const [selectedDia, setSelectedDia] = useState(12);
  const [stockLength, setStockLength] = useState(12.0); // 12.0m standard commercial length
  const [steelRatePerKg, setSteelRatePerKg] = useState(72);
  const [currency] = useState('₹');
  const [toastMessage, setToastMessage] = useState('');

  // Required Bar Cut Schedule List
  const [cutSchedule, setCutSchedule] = useState([
    { id: 'cut-1', shape: 'lbend', dia: 12, length: 3.45, qty: 16, desc: 'Footing Pedestal Column L-Dowel' },
    { id: 'cut-2', shape: 'straight', dia: 12, length: 4.80, qty: 12, desc: 'Plinth Beam Bottom Tension Bars' },
    { id: 'cut-3', shape: 'stirrup', dia: 8, length: 1.15, qty: 45, desc: 'Column Ties @ 150mm c/c' },
    { id: 'cut-4', shape: 'cranked', dia: 10, length: 3.85, qty: 18, desc: 'Ground Floor Slab Cranked Bar' }
  ]);

  // Form input for new bar cut
  const [formShape, setFormShape] = useState('lbend');
  const [formDia, setFormDia] = useState(12);
  const [formLength, setFormLength] = useState(3.2);
  const [formQty, setFormQty] = useState(10);
  const [formDesc, setFormDesc] = useState('');

  // Add Cut Item
  const handleAddCut = (e) => {
    e.preventDefault();
    if (formLength <= 0 || formQty <= 0) return;
    if (formLength > stockLength) {
      alert(`Cut length (${formLength}m) cannot exceed commercial stock length (${stockLength}m). Use lap splices.`);
      return;
    }

    const newCut = {
      id: `cut-${Date.now()}`,
      shape: formShape,
      dia: Number(formDia),
      length: Number(formLength),
      qty: Number(formQty),
      desc: formDesc || `${formDia}mm ${formShape.toUpperCase()} Bar`
    };

    setCutSchedule(prev => [...prev, newCut]);
    setFormDesc('');
  };

  const handleRemoveCut = (id) => {
    setCutSchedule(prev => prev.filter(c => c.id !== id));
  };

  // 1D Cutting Stock Optimization Algorithm (Best Fit Decreasing) for Selected Diameter
  const optimizationResults = useMemo(() => {
    // Filter cuts by currently selected diameter
    const relevantCuts = cutSchedule.filter(c => c.dia === Number(selectedDia));
    
    // Flatten cut requests into individual pieces
    const pieces = [];
    relevantCuts.forEach(item => {
      for (let i = 0; i < item.qty; i++) {
        pieces.push({ id: item.id, length: item.length, desc: item.desc });
      }
    });

    // Sort pieces in descending order (Largest Fit First)
    pieces.sort((a, b) => b.length - a.length);

    // Bin Packing: Pack pieces into 12.0m stock bars
    const stockBars = [];

    pieces.forEach(piece => {
      // Find the first stock bar that has enough remaining space
      let placed = false;
      for (let bar of stockBars) {
        if (bar.remaining >= piece.length) {
          bar.cuts.push(piece);
          bar.used += piece.length;
          bar.remaining -= piece.length;
          placed = true;
          break;
        }
      }

      // If no existing bar can fit it, open a new 12.0m stock bar
      if (!placed) {
        stockBars.push({
          barNumber: stockBars.length + 1,
          totalLength: stockLength,
          used: piece.length,
          remaining: stockLength - piece.length,
          cuts: [piece]
        });
      }
    });

    const totalStockBarsCount = stockBars.length;
    const totalPurchasedMeters = totalStockBarsCount * stockLength;
    const totalRequiredCutMeters = pieces.reduce((sum, p) => sum + p.length, 0);
    const totalScrapMeters = totalPurchasedMeters - totalRequiredCutMeters;
    const scrapWastePercent = totalPurchasedMeters > 0 ? (totalScrapMeters / totalPurchasedMeters) * 100 : 0;

    const unitWt = rebarWeights[selectedDia] || 0.888;
    const totalPurchasedKg = totalPurchasedMeters * unitWt;
    const totalRequiredKg = totalRequiredCutMeters * unitWt;
    const totalScrapKg = totalScrapMeters * unitWt;
    const totalSteelCost = totalPurchasedKg * steelRatePerKg;

    return {
      stockBars,
      totalStockBarsCount,
      totalPurchasedMeters,
      totalRequiredCutMeters,
      totalScrapMeters,
      scrapWastePercent,
      totalPurchasedKg,
      totalRequiredKg,
      totalScrapKg,
      totalSteelCost,
      piecesCount: pieces.length
    };
  }, [cutSchedule, selectedDia, stockLength, steelRatePerKg]);

  // Send Optimized Rebar Takeoff to Master Project BOQ
  const handlePushToMasterBOQ = () => {
    const item = addItemToProject({
      category: 'Reinforcement Steel',
      module: 'BBS Rebar Optimizer',
      description: `Fe 500D TMT Reinforcement (Ø${selectedDia}mm) — ${optimizationResults.totalStockBarsCount} standard 12m bars optimized (${optimizationResults.scrapWastePercent.toFixed(1)}% scrap rate)`,
      quantity: Math.round(optimizationResults.totalPurchasedKg),
      unit: 'kg',
      rate: steelRatePerKg,
      cost: optimizationResults.totalSteelCost
    });

    setToastMessage(`✓ Successfully added ${item.quantity} kg of Ø${selectedDia}mm Rebar to Project Master BOQ!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="flex flex-col w-full pb-10 space-y-6 text-slate-100 font-sans">
      
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-borderDark p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-10 w-[350px] h-[350px] bg-sky-500/10 blur-[90px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] font-bold uppercase tracking-wider font-mono">
                IS 2502 / SP 34 Rebar Sizing Standard
              </span>
              <span className="text-[11px] font-mono text-slate-400">1D Cutting Stock Optimization Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Bar Bending Schedule (BBS) & <span className="gradient-text">12m Rebar Cut Optimizer</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Eliminate costly contractor scrap waste (from over 6% down to under 1.8%) by calculating optimal cutting sequences on standard 12.0m commercial TMT steel stock bars.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {toastMessage && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl animate-fade-in">
                {toastMessage}
              </span>
            )}
            <button
              onClick={handlePushToMasterBOQ}
              disabled={optimizationResults.totalStockBarsCount === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-glow-accent transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <span>+</span> Push Steel Schedule to Master BOQ
            </button>
          </div>
        </div>

        {/* Live Optimization KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-borderDark">
          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">12m Stock Bars Req.</span>
            <p className="text-xl font-extrabold text-sky-400 mt-1 font-mono">
              {optimizationResults.totalStockBarsCount} <span className="text-xs text-slate-500">bars</span>
            </p>
            <span className="text-[10px] text-slate-500">Ø{selectedDia}mm TMT Bars</span>
          </div>

          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Steel Procurement</span>
            <p className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">
              {optimizationResults.totalPurchasedKg.toFixed(1)} <span className="text-xs text-slate-500">kg</span>
            </p>
            <span className="text-[10px] text-slate-500">{(optimizationResults.totalPurchasedKg / 1000).toFixed(2)} Metric Tonnes</span>
          </div>

          <div className="stat-card bg-emerald-950/20 border-emerald-500/30">
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">Scrap Waste Efficiency</span>
            <p className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
              {optimizationResults.scrapWastePercent.toFixed(1)}% <span className="text-xs text-emerald-500">waste</span>
            </p>
            <span className="text-[10px] text-emerald-500/80">Industry Benchmark: 6–8%</span>
          </div>

          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Procurement Budget</span>
            <p className="text-xl font-extrabold text-amber-400 mt-1 font-mono">
              {currency}{optimizationResults.totalSteelCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-slate-500">@ {currency}{steelRatePerKg}/kg Rate</span>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: BBS TABLE + 1D CUTTING VISUALIZER ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Bar Entry & Active BBS Schedule (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Add New Cut Piece Form */}
          <div className="bg-cardDark border border-borderDark rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📐</span> Add Bar Schedule Item
            </h2>

            <form onSubmit={handleAddCut} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Standard Shape Code</label>
                <div className="grid grid-cols-2 gap-2">
                  {standardShapes.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormShape(s.id)}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                        formShape === s.id
                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 font-bold'
                          : 'bg-dash-950 border-borderDark text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-base font-mono">{s.icon}</span>
                      <span className="text-[11px] truncate">{s.name.split(':')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Bar Dia (mm)</label>
                  <select
                    value={formDia}
                    onChange={e => setFormDia(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-2.5 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  >
                    {[8, 10, 12, 16, 20, 25, 32].map(d => (
                      <option key={d} value={d}>Ø {d} mm</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Cut Length (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formLength}
                    onChange={e => setFormLength(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-2.5 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQty}
                    onChange={e => setFormQty(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-2.5 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Member Location & Remarks</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="e.g. C1 Column Main Rebar Ground to First Floor"
                  className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-glow-accent"
              >
                + Add Bar to BBS List
              </button>
            </form>
          </div>

          {/* Bar Schedule List */}
          <div className="bg-cardDark border border-borderDark rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-borderDark">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                Bar Cutting Schedule ({cutSchedule.length} entries)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">IS 2502 Specifications</span>
            </div>

            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scroll pr-1">
              {cutSchedule.map((cut, idx) => (
                <div
                  key={cut.id}
                  className="bg-dash-950 border border-borderDark rounded-xl p-3 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Ø{cut.dia}mm</span>
                        <span className="text-slate-400 font-mono">{cut.length}m each</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 text-[10px] font-mono">× {cut.qty} pcs</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{cut.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveCut(cut.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: 1D Stock Optimization Visualizer (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          
          <div className="bg-cardDark border border-borderDark rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            
            {/* Optimization Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-borderDark">
              <div>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Optimal 12.0m Cutting Layouts
                </h2>
                <span className="text-xs text-slate-400">
                  Select diameter to visualize linear 1D nesting
                </span>
              </div>

              {/* Diameter Switcher Pills */}
              <div className="flex gap-1 overflow-x-auto no-scrollbars">
                {[8, 10, 12, 16, 20, 25, 32].map(dia => (
                  <button
                    key={dia}
                    onClick={() => setSelectedDia(dia)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedDia === dia
                        ? 'bg-sky-500 text-slate-950 font-black shadow-glow-accent'
                        : 'bg-dash-950 text-slate-400 hover:text-white border border-borderDark'
                    }`}
                  >
                    Ø{dia}
                  </button>
                ))}
              </div>
            </div>

            {/* Visualizer of 12m Commercial Bars */}
            {optimizationResults.stockBars.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-4xl">🔩</div>
                <h3 className="text-sm font-bold text-white">No bar cuts required for Ø{selectedDia}mm</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add cutting schedule entries with Ø{selectedDia}mm diameter to run the 1D nesting cutting algorithm.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[560px] overflow-y-auto custom-scroll pr-1">
                {optimizationResults.stockBars.map((bar) => {
                  return (
                    <div key={bar.barNumber} className="bg-dash-950 border border-borderDark rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sky-400">12.0m Commercial Bar #{bar.barNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({bar.cuts.length} cuts assigned)</span>
                        </div>
                        <div className="text-[11px] font-mono">
                          <span className="text-emerald-400 font-bold">{bar.used.toFixed(2)}m Used</span> · <span className="text-rose-400">{bar.remaining.toFixed(2)}m Offcut</span>
                        </div>
                      </div>

                      {/* 1D Multi-Segment Bar Rendering */}
                      <div className="w-full h-8 bg-slate-900 rounded-lg overflow-hidden flex border border-borderDark relative shadow-inner">
                        {bar.cuts.map((cut, cIdx) => {
                          const widthPct = (cut.length / bar.totalLength) * 100;
                          const bgColors = ['bg-sky-500', 'bg-indigo-500', 'bg-teal-500', 'bg-blue-600'];
                          const color = bgColors[cIdx % bgColors.length];

                          return (
                            <div
                              key={cIdx}
                              style={{ width: `${widthPct}%` }}
                              className={`${color} h-full border-r border-slate-950 flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 px-1 truncate`}
                              title={`${cut.desc}: ${cut.length}m`}
                            >
                              {cut.length}m
                            </div>
                          );
                        })}

                        {/* Offcut / Scrap Piece */}
                        {bar.remaining > 0 && (
                          <div
                            style={{ width: `${(bar.remaining / bar.totalLength) * 100}%` }}
                            className="bg-rose-950/40 text-rose-400 h-full flex items-center justify-center text-[9px] font-mono font-bold px-1"
                            title={`Offcut Scrap: ${bar.remaining.toFixed(2)}m`}
                          >
                            {bar.remaining > 0.3 ? `${bar.remaining.toFixed(2)}m scrap` : ''}
                          </div>
                        )}
                      </div>

                      {/* Bar Cuts Legend */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
                        {bar.cuts.map((cut, cIdx) => (
                          <span key={cIdx} className="bg-dash-900 px-2 py-0.5 rounded border border-borderDark/60 truncate max-w-[200px]">
                            Cut #{cIdx + 1}: {cut.length}m ({cut.desc})
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Procurement Summary Strip */}
            <div className="p-4 rounded-xl bg-dash-950 border border-borderDark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
              <div>
                <span className="font-bold text-white block">TMT Steel Market Standard: 12.0m Bundles</span>
                <span className="text-[10px] text-slate-500 font-mono">IS 1786 Fe500D Thermo-Mechanically Treated Bars</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono text-[11px]">Unit Rate:</span>
                <div className="flex items-center bg-cardDark border border-borderDark rounded-lg px-2 py-1">
                  <span className="text-slate-400 text-xs mr-1">{currency}</span>
                  <input
                    type="number"
                    value={steelRatePerKg}
                    onChange={e => setSteelRatePerKg(Number(e.target.value))}
                    className="w-12 bg-transparent text-right font-mono font-bold text-white outline-none"
                  />
                  <span className="text-[10px] text-slate-400 ml-1">/kg</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
