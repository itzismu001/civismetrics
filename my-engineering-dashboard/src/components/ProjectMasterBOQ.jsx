import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { useUnit } from '../context/UnitContext.jsx';

export default function ProjectMasterBOQ() {
  const {
    projectName, setProjectName,
    clientName, setClientName,
    siteLocation, setSiteLocation,
    engineerInCharge, setEngineerInCharge,
    projectRef, setProjectRef,
    contractorMargin, setContractorMargin,
    gstRate, setGstRate,
    contingencyRate, setContingencyRate,
    laborCessRate, setLaborCessRate,
    lineItems,
    addItemToProject,
    removeItemFromProject,
    clearProjectItems,
    subtotal,
    contractorAmount,
    contingencyAmount,
    laborCessAmount,
    gstAmount,
    grandTotal
  } = useProject();

  const { isMetric } = useUnit();
  const [currency, setCurrency] = useState('₹');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // New Custom Line Item Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Concrete & RCC');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState(isMetric ? 'm³' : 'cu.ft');
  const [newItemRate, setNewItemRate] = useState('');

  const categories = [
    'all',
    'Earthwork & Substructure',
    'Concrete & RCC',
    'Reinforcement Steel',
    'Masonry Work',
    'Finishes & Plaster',
    'Advanced & MEP'
  ];

  const filteredItems = filterCategory === 'all' 
    ? lineItems 
    : lineItems.filter(item => item.category === filterCategory);

  const handleAddNewItem = (e) => {
    e.preventDefault();
    if (!newItemDesc || !newItemQty || !newItemRate) return;

    addItemToProject({
      category: newItemCategory,
      module: 'Manual BOQ Entry',
      description: newItemDesc,
      quantity: Number(newItemQty),
      unit: newItemUnit,
      rate: Number(newItemRate),
      cost: Number(newItemQty) * Number(newItemRate)
    });

    setNewItemDesc('');
    setNewItemQty('');
    setNewItemRate('');
    setShowAddModal(false);
  };

  // CSV Export Utility
  const exportToCSV = () => {
    const headers = ['Item No', 'Category', 'Description', 'Quantity', 'Unit', `Rate (${currency})`, `Amount (${currency})`, 'Date Added'];
    const rows = lineItems.map((item, idx) => [
      idx + 1,
      `"${item.category}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      item.quantity,
      item.unit,
      item.rate,
      item.cost.toFixed(2),
      item.date
    ]);

    // Financial summary rows
    rows.push([]);
    rows.push(['', '', 'Subtotal', '', '', '', subtotal.toFixed(2)]);
    rows.push(['', '', `Contractor Margin (${contractorMargin}%)`, '', '', '', contractorAmount.toFixed(2)]);
    rows.push(['', '', `Contingency Allowance (${contingencyRate}%)`, '', '', '', contingencyAmount.toFixed(2)]);
    rows.push(['', '', `Labour Welfare Cess (${laborCessRate}%)`, '', '', '', laborCessAmount.toFixed(2)]);
    rows.push(['', '', `GST (${gstRate}%)`, '', '', '', gstAmount.toFixed(2)]);
    rows.push(['', '', 'GRAND TOTAL PROJECT ESTIMATE', '', '', '', grandTotal.toFixed(2)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${projectRef}_Master_BOQ_Schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full pb-10 space-y-6 text-slate-100 font-sans">
      
      {/* ── PROJECT HEADER & LETTERHEAD ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero border border-borderDark p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-10 w-[350px] h-[350px] bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider font-mono">
                CPWD / DSR Standard Schedule of Rates (SOR)
              </span>
              <span className="text-[11px] font-mono text-slate-400">Ref: {projectRef}</span>
            </div>

            {isEditingInfo ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-w-3xl">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="w-full bg-dash-950 border border-borderDark rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Client / Owner</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-dash-950 border border-borderDark rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Site Location</label>
                  <input
                    type="text"
                    value={siteLocation}
                    onChange={e => setSiteLocation(e.target.value)}
                    className="w-full bg-dash-950 border border-borderDark rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 font-mono">Engineer in Charge</label>
                  <input
                    type="text"
                    value={engineerInCharge}
                    onChange={e => setEngineerInCharge(e.target.value)}
                    className="w-full bg-dash-950 border border-borderDark rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {projectName}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Client: <strong className="text-slate-200">{clientName}</strong> · Location: <span className="text-slate-300">{siteLocation}</span> · Engr: <span className="text-sky-400">{engineerInCharge}</span>
                </p>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className="px-3 py-2 bg-cardDark hover:bg-slate-800 border border-borderDark rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
            >
              {isEditingInfo ? '✓ Save Info' : '✏️ Edit Project Info'}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-glow-accent flex items-center gap-1.5"
            >
              <span>+</span> Add Custom Line Item
            </button>

            <button
              onClick={exportToCSV}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Download Excel / CSV Workbook"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Excel CSV Export
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-cardDark hover:bg-slate-800 border border-borderDark rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 transition-all flex items-center gap-1.5"
              title="Print Official Stamp PDF"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-borderDark">
          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Total Line Items</span>
            <p className="text-xl font-extrabold text-sky-400 mt-1 font-mono">{lineItems.length}</p>
            <span className="text-[10px] text-slate-500">Live BOQ Schedule</span>
          </div>

          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Direct Civil Subtotal</span>
            <p className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">
              {currency}{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-slate-500">Base Material & Labour</span>
          </div>

          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Taxes & GST (18%)</span>
            <p className="text-xl font-extrabold text-amber-400 mt-1 font-mono">
              {currency}{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-slate-500">Includes 1% Labour Cess</span>
          </div>

          <div className="stat-card bg-emerald-950/20 border-emerald-500/30">
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">Turnkey Total Estimate</span>
            <p className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
              {currency}{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] text-emerald-500/80">With Contractor Margin</span>
          </div>
        </div>
      </div>

      {/* ── BOQ SCHEDULE OF RATES TABLE ── */}
      <div className="bg-cardDark border border-borderDark rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        
        {/* Table Top Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-borderDark">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-white tracking-tight uppercase">
              Schedule of Civil Quantities
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {filteredItems.length} items
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbars">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`pill-tab text-[10px] ${filterCategory === cat ? 'pill-tab-active' : 'pill-tab-inactive'}`}
              >
                {cat === 'all' ? 'All Trades' : cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Items Table */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-3xl">📋</div>
            <p className="text-xs text-slate-400">No items recorded under this trade. Add new items manually or calculate from individual engines.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-borderDark text-[10px] font-mono uppercase text-slate-400 tracking-wider bg-dash-950/60">
                  <th className="py-3 px-3 w-12">#</th>
                  <th className="py-3 px-3">Trade / Category</th>
                  <th className="py-3 px-3 min-w-[240px]">Work Description & Specifications</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-right">Unit Rate ({currency})</th>
                  <th className="py-3 px-3 text-right font-bold text-slate-200">Amount ({currency})</th>
                  <th className="py-3 px-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark/60">
                {filteredItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-dash-950 border border-slate-800 text-sky-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-medium leading-relaxed">
                      {item.description}
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Source: {item.module} · Added: {item.date}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-100">{item.quantity.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">{item.unit}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{item.rate.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400">
                      {item.cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => removeItemFromProject(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Item"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Clear All Action */}
        {lineItems.length > 0 && (
          <div className="pt-3 border-t border-borderDark flex justify-between items-center text-xs">
            <button
              onClick={clearProjectItems}
              className="text-rose-400 hover:text-rose-300 text-[11px] font-mono hover:underline"
            >
              Clear Entire Project Ledger
            </button>
            <span className="text-slate-400 text-[11px] font-mono">
              Auto-saved to active engineering session
            </span>
          </div>
        )}
      </div>

      {/* ── FINANCIAL ABSTRACT & TAX MODIFIERS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Financial Coefficients Adjuster */}
        <div className="bg-cardDark border border-borderDark rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span>⚙️</span> Financial & Tax Parameters
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Adjust contractor overheads, contingencies, and statutory GST rates to reflect actual tender terms.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between bg-dash-950 p-3 rounded-xl border border-borderDark">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Contractor Overhead & Profit</span>
                <span className="text-[10px] text-slate-500 font-mono">Standard industry margin (10%–15%)</span>
              </div>
              <div className="flex items-center gap-1 bg-dash-900 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  value={contractorMargin}
                  onChange={e => setContractorMargin(Number(e.target.value))}
                  className="w-12 bg-transparent text-right text-xs font-mono font-bold text-sky-400 outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-dash-950 p-3 rounded-xl border border-borderDark">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Unforeseen Site Contingency</span>
                <span className="text-[10px] text-slate-500 font-mono">Material price fluctuation allowance</span>
              </div>
              <div className="flex items-center gap-1 bg-dash-900 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  value={contingencyRate}
                  onChange={e => setContingencyRate(Number(e.target.value))}
                  className="w-12 bg-transparent text-right text-xs font-mono font-bold text-amber-400 outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-dash-950 p-3 rounded-xl border border-borderDark">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Goods & Services Tax (GST)</span>
                <span className="text-[10px] text-slate-500 font-mono">Applicable construction contract tax</span>
              </div>
              <div className="flex items-center gap-1 bg-dash-900 border border-slate-700 rounded-lg px-2 py-1">
                <input
                  type="number"
                  value={gstRate}
                  onChange={e => setGstRate(Number(e.target.value))}
                  className="w-12 bg-transparent text-right text-xs font-mono font-bold text-rose-400 outline-none"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Bill of Quantities Abstract Certificate */}
        <div className="bg-gradient-card border border-borderDark rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-borderDark">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                Bill Abstract Summary
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold">READY FOR TENDER</span>
            </div>

            <div className="space-y-2.5 pt-3 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Civil Direct Cost Subtotal</span>
                <span className="font-mono font-bold">{currency}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Add: Contractor Margin ({contractorMargin}%)</span>
                <span className="font-mono text-sky-400">+{currency}{contractorAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Add: Contingency Reserve ({contingencyRate}%)</span>
                <span className="font-mono text-amber-400">+{currency}{contingencyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Add: Labour Welfare Cess ({laborCessRate}%)</span>
                <span className="font-mono text-slate-300">+{currency}{laborCessAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Add: GST ({gstRate}%)</span>
                <span className="font-mono text-rose-400">+{currency}{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="pt-3 border-t border-borderDark flex justify-between items-center text-sm">
                <span className="font-extrabold text-white uppercase tracking-wider">Turnkey Total</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {currency}{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-borderDark text-[10px] text-slate-500 font-mono flex justify-between items-center">
            <span>Engineering Signature: Verified</span>
            <span>CivisMetric Civil Suite</span>
          </div>
        </div>

      </div>

      {/* ── MODAL: ADD CUSTOM LINE ITEM ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cardDark border border-borderDark rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-borderDark">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Add Custom Work Item to Project
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Trade Category</label>
                <select
                  value={newItemCategory}
                  onChange={e => setNewItemCategory(e.target.value)}
                  className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                >
                  <option value="Earthwork & Substructure">Earthwork & Substructure</option>
                  <option value="Concrete & RCC">Concrete & RCC</option>
                  <option value="Reinforcement Steel">Reinforcement Steel</option>
                  <option value="Masonry Work">Masonry Work</option>
                  <option value="Finishes & Plaster">Finishes & Plaster</option>
                  <option value="Advanced & MEP">Advanced & MEP</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Specification / Description</label>
                <textarea
                  required
                  rows={2}
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  placeholder="e.g. M25 grade Ready-Mix Concrete for suspended 150mm roof slab including pump and vibrator hire"
                  className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newItemQty}
                    onChange={e => setNewItemQty(e.target.value)}
                    placeholder="100"
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value)}
                    placeholder="m³, kg, Nos"
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Rate ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newItemRate}
                    onChange={e => setNewItemRate(e.target.value)}
                    placeholder="450"
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-borderDark flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-dash-950 hover:bg-slate-800 border border-borderDark rounded-xl text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-glow-accent"
                >
                  Add to Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
