import React, { useState } from "react";
import { 
  Sparkles, Globe, X, RefreshCw, CheckCircle2, ArrowRight
} from "lucide-react";
import { api } from "../services/api";

export default function MedicalSimplifierModal({ isOpen, onClose }) {
  const [text, setText] = useState(
    "Patient exhibits acute pharyngitis and mild hypertension. Prescribed Amoxicillin-clavulanate 625mg b.i.d. and Telmisartan 40mg q.d."
  );
  const [targetLang, setTargetLang] = useState("hindi");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleSimplify = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.simplifyMedicalText({
        medical_text: text,
        target_language: targetLang
      });
      setResult(res);
    } catch (err) {
      console.error("Simplifier error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                AWS Bedrock Medical Language Simplifier
              </h3>
              <p className="text-xs text-slate-500">
                Converts dense prescriptions & medical jargon into plain English and Indian regional languages.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input & Target Language */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Paste Medical Note / Prescription / Lab Terms:</label>
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1 outline-none cursor-pointer"
              >
                <option value="hindi">हिन्दी (Hindi)</option>
                <option value="telugu">తెలుగు (Telugu)</option>
                <option value="tamil">தமிழ் (Tamil)</option>
                <option value="bengali">বাংলা (Bengali)</option>
                <option value="marathi">मराठी (Marathi)</option>
              </select>
            </div>
          </div>

          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 p-3.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />

          <button
            onClick={handleSimplify}
            disabled={loading || !text.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Invoking Amazon Bedrock Simplifier...</span>
              </>
            ) : (
              <>
                <span>Simplify & Translate Medical Jargon</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Simplification Results */}
        {result && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Side-by-side: Plain English & Regional Translation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Plain English (Patient-Friendly)
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {result.plain_english_explanation}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <span className="text-[11px] uppercase font-bold text-indigo-700 tracking-wider">
                  {result.target_language.toUpperCase()} Translation
                </span>
                <p className="text-xs text-indigo-950 leading-relaxed font-semibold">
                  {result.regional_language_translation}
                </p>
              </div>
            </div>

            {/* Key Takeaways */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
              <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Key Patient Takeaways</span>
              </span>
              <ul className="list-disc list-inside text-xs text-emerald-800 space-y-0.5 font-medium">
                {result.key_takeaways?.map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

