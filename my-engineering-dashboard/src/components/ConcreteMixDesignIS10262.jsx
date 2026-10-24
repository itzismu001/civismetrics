import React, { useState, useMemo } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { useUnit } from '../context/UnitContext.jsx';

// Standard deviation 's' as per IS 10262:2019 Table 1
const gradeData = {
  'M20': { fck: 20, s: 4.0, maxWc: 0.50, minCement: 300 },
  'M25': { fck: 25, s: 4.0, maxWc: 0.45, minCement: 320 },
  'M30': { fck: 30, s: 5.0, maxWc: 0.45, minCement: 320 },
  'M35': { fck: 35, s: 5.0, maxWc: 0.45, minCement: 340 },
  'M40': { fck: 40, s: 5.0, maxWc: 0.40, minCement: 360 },
  'M45': { fck: 45, s: 5.0, maxWc: 0.40, minCement: 360 },
  'M50': { fck: 50, s: 5.0, maxWc: 0.38, minCement: 380 },
  'M55': { fck: 55, s: 5.0, maxWc: 0.35, minCement: 400 }
};

export default function ConcreteMixDesignIS10262() {
  const { addItemToProject } = useProject();
  const { isMetric } = useUnit();

  // Inputs
  const [grade, setGrade] = useState('M25');
  const [exposure, setExposure] = useState('Moderate'); // Mild, Moderate, Severe, Very Severe, Extreme
  const [slumpReq, setSlumpReq] = useState(100); // 75mm - 125mm
  const [maxAggSize, setMaxAggSize] = useState(20); // 10mm, 20mm, 40mm
  const [cementType, setCementType] = useState('OPC 53 Grade (IS 12269)');
  const [sandZone, setSandZone] = useState('Zone II (IS 383)');
  
  // Specific Gravities
  const [spgCement, setSpgCement] = useState(3.15);
  const [spgSand, setSpgSand] = useState(2.65);
  const [spgCoarse, setSpgCoarse] = useState(2.70);
  const [spgWater] = useState(1.0);
  const [spgAdmixture, setSpgAdmixture] = useState(1.15);

  // Moisture & Absorption Correction
  const [sandMoisture, setSandMoisture] = useState(2.0); // %
  const [sandAbsorption, setSandAbsorption] = useState(1.0); // %
  const [aggAbsorption, setAggAbsorption] = useState(0.5); // %
  const [admixtureDose, setAdmixtureDose] = useState(1.0); // % by weight of cement
  const [waterReduction, setWaterReduction] = useState(20); // % reduction via superplasticizer

  // Batch Volume
  const [batchVolume, setBatchVolume] = useState(1.0); // m³
  const [concreteRate, setConcreteRate] = useState(5800); // per m³
  const [currency] = useState('₹');
  const [toastMessage, setToastMessage] = useState('');

  // IS 10262:2019 Calculations
  const mixResults = useMemo(() => {
    const spec = gradeData[grade] || gradeData['M25'];
    
    // Step 1: Target Mean Strength (Cl. 4.2)
    // f'ck = fck + 1.65 * s
    const targetMeanStrength = spec.fck + (1.65 * spec.s);

    // Step 2: Water-Cement Ratio
    const wcRatio = spec.maxWc;

    // Step 3: Base Water Content per m³ (Table 4 for 20mm agg = 186 kg/m³ for 50mm slump)
    const baseWater = maxAggSize === 10 ? 208 : maxAggSize === 20 ? 186 : 165;
    // Slump correction: +3% water for every 25mm increase over 50mm
    const slumpExtraPct = ((slumpReq - 50) / 25) * 3;
    const waterWithSlump = baseWater * (1 + slumpExtraPct / 100);
    // Superplasticizer reduction
    const finalWaterKg = waterWithSlump * (1 - waterReduction / 100);

    // Step 4: Cementitious Content Calculation
    let cementContentKg = finalWaterKg / wcRatio;
    if (cementContentKg < spec.minCement) cementContentKg = spec.minCement;
    cementContentKg = Math.round(cementContentKg);

    // Step 5: Admixture Dosage
    const admixtureKg = (cementContentKg * admixtureDose) / 100;

    // Step 6: Volume of Components (Absolute Volume Method per 1 m³)
    const volCement = cementContentKg / (spgCement * 1000);
    const volWater = finalWaterKg / (spgWater * 1000);
    const volAdmixture = admixtureKg / (spgAdmixture * 1000);
    const volAir = maxAggSize === 20 ? 0.01 : 0.015; // 1.0% entrapped air for 20mm
    const volAllAggregates = 1.0 - (volCement + volWater + volAdmixture + volAir);

    // Proportion of Coarse Aggregate in total aggregate (IS 10262 Table 5: 0.62 for 20mm agg & Zone II sand with w/c 0.5)
    // Adjusted by -0.01 for every 0.05 decrease in w/c ratio
    const baseCoarseRatio = 0.62;
    const wcDiff = (0.50 - wcRatio) / 0.05;
    const coarseRatio = baseCoarseRatio + (wcDiff * 0.01);
    const fineRatio = 1.0 - coarseRatio;

    const massCoarseKg = Math.round(volAllAggregates * coarseRatio * spgCoarse * 1000);
    const massFineKg = Math.round(volAllAggregates * fineRatio * spgSand * 1000);

    // Step 7: Moisture Corrections
    // Sand moisture adjustment
    const freeSandMoisturePct = sandMoisture - sandAbsorption;
    const sandMoistureAdjustmentKg = (massFineKg * freeSandMoisturePct) / 100;
    const correctedSandKg = Math.round(massFineKg + sandMoistureAdjustmentKg);

    // Coarse aggregate absorption adjustment
    const aggAbsorptionKg = (massCoarseKg * aggAbsorption) / 100;
    const correctedCoarseKg = Math.round(massCoarseKg - aggAbsorptionKg);

    // Corrected mixing water
    const correctedWaterKg = Math.round(finalWaterKg - sandMoistureAdjustmentKg + aggAbsorptionKg);

    // Mix Proportions (By Weight normalized to 1 part cement)
    const ratioCement = 1.0;
    const ratioSand = (correctedSandKg / cementContentKg).toFixed(2);
    const ratioCoarse = (correctedCoarseKg / cementContentKg).toFixed(2);

    // Single 50kg Bag Batch Quantities
    const bagFactor = 50 / cementContentKg;
    const bagWater = (correctedWaterKg * bagFactor).toFixed(1);
    const bagSand = (correctedSandKg * bagFactor).toFixed(1);
    const bagCoarse = (correctedCoarseKg * bagFactor).toFixed(1);
    const bagAdmixture = (admixtureKg * bagFactor).toFixed(2);

    // Total Project Volume Sizing
    const totalVolumeCost = batchVolume * concreteRate;

    return {
      targetMeanStrength,
      wcRatio,
      cementContentKg,
      finalWaterKg: correctedWaterKg,
      sandKg: correctedSandKg,
      coarseKg: correctedCoarseKg,
      admixtureKg: admixtureKg.toFixed(2),
      ratioCement,
      ratioSand,
      ratioCoarse,
      bagWater,
      bagSand,
      bagCoarse,
      bagAdmixture,
      totalVolumeCost,
      spec
    };
  }, [grade, slumpReq, maxAggSize, spgCement, spgSand, spgCoarse, spgAdmixture, sandMoisture, sandAbsorption, aggAbsorption, admixtureDose, waterReduction, batchVolume, concreteRate]);

  const handlePushToMasterBOQ = () => {
    const item = addItemToProject({
      category: 'Concrete & RCC',
      module: 'IS 10262 Mix Design Engine',
      description: `${grade} Grade Design Mix Concrete (Target Strength: ${mixResults.targetMeanStrength.toFixed(1)} MPa, Ratio 1:${mixResults.ratioSand}:${mixResults.ratioCoarse}, w/c: ${mixResults.wcRatio})`,
      quantity: Number(batchVolume),
      unit: 'm³',
      rate: concreteRate,
      cost: mixResults.totalVolumeCost
    });

    setToastMessage(`✓ Successfully added ${item.quantity} m³ of ${grade} Mix to Master Project BOQ!`);
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
                IS 10262:2019 & IS 456:2000 Standard
              </span>
              <span className="text-[11px] font-mono text-slate-400">Absolute Volume Concrete Mix Design</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              IS 10262:2019 <span className="gradient-text">Concrete Mix Design Engine</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Certified structural design mix batching with target mean strength $f'_{'{ck}'}$, aggregate moisture absorption corrections, superplasticizers, and 1-bag mixer proportions.
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
              className="px-4 py-2.5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-glow-accent transition-all flex items-center gap-2"
            >
              <span>+</span> Push {grade} Mix to Master BOQ
            </button>
          </div>
        </div>

        {/* Live Mix Design KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-borderDark">
          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Target Mean Strength</span>
            <p className="text-xl font-extrabold text-sky-400 mt-1 font-mono">
              {mixResults.targetMeanStrength.toFixed(2)} <span className="text-xs text-slate-500">MPa</span>
            </p>
            <span className="text-[10px] text-slate-500">f'ck = {gradeData[grade]?.fck} + 1.65×{gradeData[grade]?.s}</span>
          </div>

          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Design Mix Ratio</span>
            <p className="text-xl font-extrabold text-indigo-400 mt-1 font-mono">
              1 : {mixResults.ratioSand} : {mixResults.ratioCoarse}
            </p>
            <span className="text-[10px] text-slate-500">Cement : Sand : Aggregate</span>
          </div>

          <div className="stat-card bg-emerald-950/20 border-emerald-500/30">
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">Water-Cement Ratio</span>
            <p className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
              {mixResults.wcRatio.toFixed(2)}
            </p>
            <span className="text-[10px] text-emerald-500/80">IS 456 Table 5 Max Limit</span>
          </div>

          <div className="stat-card">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Cement per m³</span>
            <p className="text-xl font-extrabold text-amber-400 mt-1 font-mono">
              {mixResults.cementContentKg} <span className="text-xs text-slate-500">kg ({(mixResults.cementContentKg / 50).toFixed(1)} bags)</span>
            </p>
            <span className="text-[10px] text-slate-500">Min Req: {gradeData[grade]?.minCement} kg</span>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE: INPUT PARAMETERS + BATCH WEIGHT REPORT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Inputs (5 cols) */}
        <div className="xl:col-span-5 space-y-5">
          
          <div className="bg-cardDark border border-borderDark rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🧪</span> Mix Specifications & Materials
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Concrete Grade</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono font-bold text-sky-400"
                  >
                    {Object.keys(gradeData).map(g => (
                      <option key={g} value={g}>{g} Grade</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Exposure Condition</label>
                  <select
                    value={exposure}
                    onChange={e => setExposure(e.target.value)}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                  >
                    <option value="Mild">Mild (Sheltered RCC)</option>
                    <option value="Moderate">Moderate (Normal Rain)</option>
                    <option value="Severe">Severe (Coastal / Wet)</option>
                    <option value="Very Severe">Very Severe (Sea Water)</option>
                    <option value="Extreme">Extreme (Tidal Zone)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Max Coarse Agg Size</label>
                  <select
                    value={maxAggSize}
                    onChange={e => setMaxAggSize(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  >
                    <option value={10}>10 mm Gravel</option>
                    <option value={20}>20 mm Standard</option>
                    <option value={40}>40 mm Mass Concrete</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Slump Workability (mm)</label>
                  <select
                    value={slumpReq}
                    onChange={e => setSlumpReq(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                  >
                    <option value={50}>50 mm (Pavements)</option>
                    <option value={75}>75 mm (Normal Slabs)</option>
                    <option value={100}>100 mm (Beams/Columns)</option>
                    <option value={150}>150 mm (Pumped RCC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Fine Aggregate Sand Zone</label>
                <select
                  value={sandZone}
                  onChange={e => setSandZone(e.target.value)}
                  className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400"
                >
                  <option value="Zone I">Zone I (Coarse Sand)</option>
                  <option value="Zone II (IS 383)">Zone II (Standard Medium Sand)</option>
                  <option value="Zone III">Zone III (Fine Sand)</option>
                  <option value="Zone IV">Zone IV (Very Fine Sand)</option>
                </select>
              </div>

              {/* Moisture & Chemical Admixture Adjustments */}
              <div className="pt-3 border-t border-borderDark space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Moisture Corrections & Admixture</span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Sand Free Moisture (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sandMoisture}
                      onChange={e => setSandMoisture(Number(e.target.value))}
                      className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Superplasticizer Dose (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={admixtureDose}
                      onChange={e => setAdmixtureDose(Number(e.target.value))}
                      className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono text-sky-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Project Volume Sizing */}
              <div className="pt-3 border-t border-borderDark grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">Total Pour Volume (m³)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={batchVolume}
                    onChange={e => setBatchVolume(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">RMC / Pour Rate ({currency}/m³)</label>
                  <input
                    type="number"
                    value={concreteRate}
                    onChange={e => setConcreteRate(Number(e.target.value))}
                    className="w-full bg-dash-950 border border-borderDark rounded-xl px-3 py-2 text-white outline-none focus:border-sky-400 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Batching Outputs (7 cols) */}
        <div className="xl:col-span-7 space-y-5">
          
          {/* Batch Proportions per 1 m³ Table */}
          <div className="bg-cardDark border border-borderDark rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-borderDark">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Material Batch Quantities (Per 1.0 m³ Concrete)
                </h3>
                <span className="text-xs text-slate-400 font-mono">IS 10262 Absolute Volume Schedule</span>
              </div>
              <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-full font-mono text-xs font-bold">
                {grade} Mix Design
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderDark text-[10px] font-mono uppercase text-slate-400 bg-dash-950/60">
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3">Material Spec</th>
                    <th className="py-2.5 px-3 text-right">Mass per 1 m³</th>
                    <th className="py-2.5 px-3 text-right">Specific Gravity</th>
                    <th className="py-2.5 px-3 text-right font-bold text-sky-400">Total Pour ({batchVolume} m³)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderDark/60 font-mono">
                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>⚪</span> Cement
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">{cementType}</td>
                    <td className="py-3 px-3 text-right font-bold text-white">{mixResults.cementContentKg} kg</td>
                    <td className="py-3 px-3 text-right text-slate-400">{spgCement}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-sky-400">
                      {(mixResults.cementContentKg * batchVolume).toFixed(0)} kg ({(mixResults.cementContentKg * batchVolume / 50).toFixed(0)} bags)
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>🏖️</span> Fine Aggregate
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">{sandZone}</td>
                    <td className="py-3 px-3 text-right font-bold text-white">{mixResults.sandKg} kg</td>
                    <td className="py-3 px-3 text-right text-slate-400">{spgSand}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-sky-400">
                      {(mixResults.sandKg * batchVolume).toFixed(0)} kg
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>🪨</span> Coarse Aggregate
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">{maxAggSize}mm Crushed Granite</td>
                    <td className="py-3 px-3 text-right font-bold text-white">{mixResults.coarseKg} kg</td>
                    <td className="py-3 px-3 text-right text-slate-400">{spgCoarse}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-sky-400">
                      {(mixResults.coarseKg * batchVolume).toFixed(0)} kg
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>💧</span> Mixing Water
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">Potable Water (w/c: {mixResults.wcRatio})</td>
                    <td className="py-3 px-3 text-right font-bold text-white">{mixResults.finalWaterKg} L</td>
                    <td className="py-3 px-3 text-right text-slate-400">{spgWater}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-sky-400">
                      {(mixResults.finalWaterKg * batchVolume).toFixed(0)} Litres
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>🧪</span> Superplasticizer
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">{admixtureDose}% PCE Polymer</td>
                    <td className="py-3 px-3 text-right font-bold text-white">{mixResults.admixtureKg} kg</td>
                    <td className="py-3 px-3 text-right text-slate-400">{spgAdmixture}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-sky-400">
                      {(mixResults.admixtureKg * batchVolume).toFixed(1)} kg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 1-Bag Site Mixer Batch Card */}
          <div className="bg-gradient-card border border-borderDark rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-borderDark">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>🚜</span> Site Concrete Mixer Batching (Per 50 kg Bag of Cement)
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">1-BAG MIXER RECIPE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-dash-950 p-3 rounded-xl border border-borderDark text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Cement</span>
                <p className="text-lg font-black text-white font-mono mt-0.5">1 Bag</p>
                <span className="text-[10px] text-slate-500 font-mono">(50 kg)</span>
              </div>

              <div className="bg-dash-950 p-3 rounded-xl border border-borderDark text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Sand</span>
                <p className="text-lg font-black text-sky-400 font-mono mt-0.5">{mixResults.bagSand} kg</p>
                <span className="text-[10px] text-slate-500 font-mono">~{(mixResults.bagSand / 1.6).toFixed(0)} L</span>
              </div>

              <div className="bg-dash-950 p-3 rounded-xl border border-borderDark text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Coarse Agg</span>
                <p className="text-lg font-black text-indigo-400 font-mono mt-0.5">{mixResults.bagCoarse} kg</p>
                <span className="text-[10px] text-slate-500 font-mono">~{(mixResults.bagCoarse / 1.5).toFixed(0)} L</span>
              </div>

              <div className="bg-dash-950 p-3 rounded-xl border border-borderDark text-center">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Water</span>
                <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">{mixResults.bagWater} L</p>
                <span className="text-[10px] text-slate-500 font-mono">+{mixResults.bagAdmixture} kg Admix</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
