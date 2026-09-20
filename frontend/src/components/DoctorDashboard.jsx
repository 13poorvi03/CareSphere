import React, { useState, useEffect, useCallback } from "react";
import { 
  Stethoscope, ShieldCheck, AlertTriangle, Pill, RefreshCw
} from "lucide-react";
import { api } from "../services/api";

export default function DoctorDashboard({ currentPatient }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDoctorSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDoctorSummary(currentPatient.patient_id);
      setSummary(res);
    } catch (err) {
      console.error("Doctor summary error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPatient.patient_id]);

  useEffect(() => {
    loadDoctorSummary();
  }, [loadDoctorSummary]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Clinician Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-950 rounded-2xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-bold">Doctor Clinical Dashboard</h2>
          </div>
          <p className="text-sm text-purple-100 mt-1">
            Authorized Practitioner View • Cedar Role: <span className="font-mono text-purple-300">doctor</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider text-purple-200 block">Attending Clinician</span>
          <span className="font-bold text-sm text-white">Dr. Anita Patel, MD</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center space-x-2 border border-slate-200">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          <span>Synthesizing EHR history, safety checks & timeline...</span>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Patient Overview Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center space-x-3 md:col-span-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
                {summary.patient_name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">{summary.patient_name}</h3>
                <p className="text-xs text-slate-500">
                  ID: {summary.patient_id} • Age: {summary.age} ({summary.gender}) • Blood: {summary.blood_group}
                </p>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Triage Level</span>
              <span className="font-black text-sm text-purple-900">{summary.triage_level}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Consultation</span>
              <span className="font-bold text-xs text-slate-800">{summary.last_consultation_date}</span>
            </div>
          </div>

          {/* Chief Complaint & AI Clinical Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chief Complaint</span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {summary.chief_complaint}
              </p>
            </div>

            <div className="bg-purple-50/70 rounded-2xl p-5 border border-purple-200 space-y-2">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>AI Clinical Recommendations</span>
              </span>
              <ul className="space-y-1 text-xs text-purple-900 font-medium">
                {summary.clinical_recommendations?.map((rec, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Current Meds & Detected Safety Issues */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Regimen */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <Pill className="w-4 h-4 text-blue-600" />
                <span>Current Active Regimen</span>
              </h4>

              <div className="space-y-2">
                {summary.current_active_medications?.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{m.name} ({m.salt})</p>
                      <p className="text-[11px] text-slate-500">Dose: {m.dosage}</p>
                    </div>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200">
                      {m.freq}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Safety Flags */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2 text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Detected Safety Conflicts ({summary.detected_safety_issues?.length})</span>
              </h4>

              <div className="space-y-2">
                {summary.detected_safety_issues?.map((issue, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-900">{issue.detail}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-600 text-white">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-700">{issue.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

