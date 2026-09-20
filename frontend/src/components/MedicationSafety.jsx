import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, Plus, Trash2, 
  Sparkles, Pill, RefreshCw, AlertOctagon
} from "lucide-react";
import { api } from "../services/api";

export default function MedicationSafety({ currentPatient }) {
  const [medicines, setMedicines] = useState([
    { brand_name: "Dolo 650", generic_name: "Paracetamol", strength: "650mg" },
    { brand_name: "Crocin Advance", generic_name: "Paracetamol", strength: "500mg" },
    { brand_name: "Warf 5", generic_name: "Warfarin", strength: "5mg" },
    { brand_name: "Disprin", generic_name: "Aspirin", strength: "350mg" }
  ]);

  const [newBrand, setNewBrand] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const runAudit = useCallback(async (medList) => {
    if (!medList.length) return;
    setLoading(true);
    try {
      const res = await api.auditSafety({
        patient_id: currentPatient.patient_id,
        medicines: medList
      });
      setReport(res);
    } catch (err) {
      console.error("Safety audit error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPatient.patient_id]);

  useEffect(() => {
    runAudit(medicines);
  }, [runAudit, medicines]);

  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (!newBrand.trim()) return;
    const updated = [...medicines, { brand_name: newBrand.trim() }];
    setMedicines(updated);
    setNewBrand("");
    runAudit(updated);
  };

  const handleRemoveMedicine = (index) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated);
    runAudit(updated);
  };

  const loadPreset = (type) => {
    let preset = [];
    if (type === "duplicate") {
      preset = [
        { brand_name: "Dolo 650", generic_name: "Paracetamol", strength: "650mg" },
        { brand_name: "Crocin Advance", generic_name: "Paracetamol", strength: "500mg" },
        { brand_name: "Pan 40", generic_name: "Pantoprazole", strength: "40mg" }
      ];
    } else if (type === "ddi") {
      preset = [
        { brand_name: "Warf 5", generic_name: "Warfarin", strength: "5mg" },
        { brand_name: "Brufen 400", generic_name: "Ibuprofen", strength: "400mg" },
        { brand_name: "Atorva 20", generic_name: "Atorvastatin", strength: "20mg" }
      ];
    } else if (type === "safe") {
      preset = [
        { brand_name: "Telma 40", generic_name: "Telmisartan", strength: "40mg" },
        { brand_name: "Pan 40", generic_name: "Pantoprazole", strength: "40mg" },
        { brand_name: "Glycomet 500", generic_name: "Metformin", strength: "500mg" }
      ];
    }
    setMedicines(preset);
    runAudit(preset);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-6 h-6 text-rose-300" />
              <h2 className="text-xl font-bold">Medication Safety Engine & Explainable AI</h2>
            </div>
            <p className="text-sm text-rose-100 mt-1">
              AWS OpenSearch + Clinical Pharmacology index flags hidden duplicate brand names and toxic drug-drug interactions.
            </p>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-xs border border-white/20">
            Real-Time Safety Audit
          </span>
        </div>
      </div>

      {/* Preset Buttons & Quick Add */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
            <Pill className="w-4 h-4 text-rose-600" />
            <span>Active Prescription List ({medicines.length})</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadPreset("duplicate")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
            >
              Test: Duplicate Brand (Dolo + Crocin)
            </button>
            <button
              onClick={() => loadPreset("ddi")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition-colors cursor-pointer"
            >
              Test: Dangerous DDI (Warfarin + NSAID)
            </button>
            <button
              onClick={() => loadPreset("safe")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
            >
              Test: Safe Compatibility
            </button>
          </div>
        </div>

        {/* Medicine Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {medicines.map((med, idx) => (
            <div
              key={idx}
              className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 flex items-center space-x-2 shadow-2xs"
            >
              <span className="font-bold">{med.brand_name}</span>
              {med.generic_name && (
                <span className="text-[11px] text-slate-500">({med.generic_name})</span>
              )}
              <button
                onClick={() => handleRemoveMedicine(idx)}
                className="text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add custom medicine input */}
        <form onSubmit={handleAddMedicine} className="flex gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="Add brand name (e.g., Augmentin 625, Manforce 50, Sorbitrate)..."
            className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </form>
      </div>

      {/* Safety Audit Results */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
          <span>Searching OpenSearch drug database & evaluating chemical combinations...</span>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              report.is_safe
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-950"
            }`}
          >
            <div className="flex items-center space-x-3">
              {report.is_safe ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              ) : (
                <AlertOctagon className="w-7 h-7 text-red-600" />
              )}
              <div>
                <h3 className="font-bold text-sm">
                  {report.is_safe
                    ? "Safe Medication Compatibility Confirmed"
                    : "High-Priority Medication Safety Alerts Detected"}
                </h3>
                <p className="text-xs opacity-90">{report.overall_recommendation}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase opacity-70 block font-semibold">Flagged Issues</span>
              <span className="font-black text-base">
                {report.critical_alerts_count + report.major_alerts_count}
              </span>
            </div>
          </div>

          {/* Section 1: Duplicate Active Ingredients */}
          {report.duplicate_alerts?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Duplicate Medicine Alerts (Different Brand Names Sharing Same Salt)</span>
              </h4>

              {report.duplicate_alerts.map((dup, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-rose-200 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                        {dup.severity} OVERDOSE RISK
                      </span>
                      <h5 className="font-bold text-slate-900 text-sm">
                        Active Chemical: <span className="text-rose-700">{dup.active_salt}</span>
                      </h5>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">
                      Brands: {dup.conflicting_brands.join(" + ")}
                    </span>
                  </div>

                  {/* Explainable AI 3-Point Structure */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Why This Occurs</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{dup.why}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Clinical Concern</span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">{dup.concern}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Action Required</span>
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed font-semibold">{dup.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section 2: Drug-Drug Interactions */}
          {report.interaction_alerts?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2 text-red-800">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>Drug-Drug Interaction Warnings</span>
              </h4>

              {report.interaction_alerts.map((ddi, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-red-200 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white">
                        {ddi.severity} INTERACTION
                      </span>
                      <h5 className="font-bold text-slate-900 text-sm">
                        {ddi.drug_a} + {ddi.drug_b}
                      </h5>
                    </div>
                  </div>

                  {/* Explainable AI 3-Point Structure */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Why This Occurs</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{ddi.why}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-red-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>Clinical Concern</span>
                      </div>
                      <p className="text-xs text-red-800 leading-relaxed">{ddi.concern}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Action Required</span>
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed font-semibold">{ddi.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

