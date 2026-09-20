import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, QrCode, Phone, AlertTriangle, Printer, Eye, RefreshCw
} from "lucide-react";
import { api } from "../services/api";

export default function EmergencyHealthCard({ currentPatient }) {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPublicPreview, setShowPublicPreview] = useState(false);

  const loadCard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getEmergencyCard(currentPatient.patient_id);
      setCardData(res);
    } catch (err) {
      console.error("Emergency card error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPatient.patient_id]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-800 rounded-2xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-red-200" />
            <h2 className="text-xl font-bold">Emergency Health Card & Rapid QR</h2>
          </div>
          <p className="text-sm text-red-100 mt-1">
            Instant first-responder access to critical allergies, blood group, current meds, and ICE contacts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPublicPreview(!showPublicPreview)}
            className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border border-white/20"
          >
            <Eye className="w-4 h-4" />
            <span>{showPublicPreview ? "Back to Card View" : "Simulate Paramedic Scan"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print ID Card</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center space-x-2 border border-slate-200">
          <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
          <span>Generating scannable QR Code and sanitizing emergency records...</span>
        </div>
      ) : cardData ? (
        showPublicPreview ? (
          /* Paramedic / Bystander Public Emergency View */
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border-4 border-red-500 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white font-black text-xl animate-pulse">
                  SOS
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-red-400 font-bold">
                    PARAMEDIC TRIAGE PORTAL • CEDAR PUBLIC ACCESS
                  </span>
                  <h3 className="text-xl font-black text-white">{cardData.full_name}</h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Blood Group</span>
                <span className="text-2xl font-black text-red-400">{cardData.blood_group}</span>
              </div>
            </div>

            {/* Critical Allergies Box */}
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-600 space-y-2">
              <div className="flex items-center space-x-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>CRITICAL ALLERGIES (DO NOT ADMINISTER)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cardData.critical_allergies.map((allergy, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-red-600 text-white font-bold text-xs shadow-xs"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            </div>

            {/* Special Medical Instructions */}
            {cardData.special_medical_instructions && (
              <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-600/80 text-amber-200 text-xs leading-relaxed font-semibold">
                ⚠️ {cardData.special_medical_instructions}
              </div>
            )}

            {/* Active Meds & Emergency Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Current Active Medications
                </span>
                <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                  {cardData.current_active_medications.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Emergency ICE Contact
                </span>
                {cardData.emergency_contacts.map((contact, i) => (
                  <div key={i} className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-sm font-bold text-white">{contact.name}</p>
                      <p className="text-xs text-slate-400">{contact.relationship}</p>
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{contact.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Digital Wallet Card */
          <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden print:border-black print:shadow-none">
            <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-indigo-300 font-bold uppercase">
                  CARESPHERE EMERGENCY MEDICAL ID • S3 VERIFIED
                </span>
                <h3 className="text-2xl font-black tracking-tight">{cardData.full_name}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Age: {cardData.age} • Gender: {cardData.gender} • DOB: {cardData.date_of_birth}
                </p>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-red-600 text-white text-center shadow-md">
                <span className="text-[10px] uppercase font-bold block opacity-80">Blood Type</span>
                <span className="text-2xl font-black tracking-wider">{cardData.blood_group}</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* QR Code Column */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                {cardData.qr_code_url ? (
                  <img
                    src={cardData.qr_code_url}
                    alt="Emergency QR Code"
                    className="w-44 h-44 rounded-xl shadow-xs border border-slate-200"
                  />
                ) : (
                  <div className="w-44 h-44 bg-slate-200 rounded-xl flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-slate-400" />
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-600">Scan for instant Paramedic View</span>
              </div>

              {/* Clinical Details Column */}
              <div className="md:col-span-2 space-y-4">
                {/* Allergies */}
                <div>
                  <span className="text-[11px] font-bold uppercase text-red-600 tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Critical Drug Allergies</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {cardData.critical_allergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold text-xs"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chronic Conditions */}
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Chronic Conditions
                  </span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {cardData.chronic_conditions.join(", ") || "None"}
                  </p>
                </div>

                {/* Current Meds */}
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Current Medications
                  </span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {cardData.current_active_medications.join(", ")}
                  </p>
                </div>

                {/* Emergency Contacts */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    ICE Contacts (In Case of Emergency)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                    {cardData.emergency_contacts.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <p className="font-bold text-slate-900">{c.name} ({c.relationship})</p>
                        <p className="text-teal-700 font-semibold">{c.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

