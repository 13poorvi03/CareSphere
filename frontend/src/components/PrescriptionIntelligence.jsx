import React, { useState, useEffect, useCallback } from "react";
import { 
  UploadCloud, FileText, ShieldCheck, RefreshCw, FolderArchive,
  Sun, Sunset, Moon, Coffee
} from "lucide-react";
import { api } from "../services/api";

export default function PrescriptionIntelligence({ currentPatient, onUploadComplete }) {
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "vault"
  const [file] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [vaultItems, setVaultItems] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);

  const loadVault = useCallback(async () => {
    setVaultLoading(true);
    try {
      const items = await api.getPrescriptionVault(currentPatient.patient_id);
      setVaultItems(items);
    } catch (err) {
      console.error("Vault loading error:", err);
    } finally {
      setVaultLoading(false);
    }
  }, [currentPatient.patient_id]);

  useEffect(() => {
    if (activeTab === "vault") loadVault();
  }, [activeTab, loadVault]);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0] || file;
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", currentPatient.patient_id);

      const res = await api.uploadPrescription(formData);
      setUploadResult(res);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error("Prescription upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDemo = async () => {
    setLoading(true);
    try {
      const blob = new Blob(["Dr. Anita Patel Rx - Dolo 650, Augmentin 625 Duo, Pan 40, Disprin"], { type: "text/plain" });
      const demoFile = new File([blob], "apollo_prescription_sample.pdf", { type: "application/pdf" });
      
      const formData = new FormData();
      formData.append("file", demoFile);
      formData.append("patient_id", currentPatient.patient_id);

      const res = await api.uploadPrescription(formData);
      setUploadResult(res);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error("Demo prescription error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <FileText className="w-6 h-6 text-teal-300" />
              <h2 className="text-xl font-bold">Prescription Intelligence & Digital Vault</h2>
            </div>
            <p className="text-sm text-teal-100 mt-1">
              AWS Bedrock Multimodal OCR parses handwritten & printed prescriptions into organized daily schedules.
            </p>
          </div>
          <div className="flex bg-white/20 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "upload" ? "bg-white text-teal-900 shadow-xs" : "text-white hover:bg-white/10"
              }`}
            >
              Upload & Scan
            </button>
            <button
              onClick={() => setActiveTab("vault")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "vault" ? "bg-white text-teal-900 shadow-xs" : "text-white hover:bg-white/10"
              }`}
            >
              Prescription Vault
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Upload & Scan */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          {/* File Dropzone */}
          <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-teal-300 hover:border-teal-500 transition-all text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Upload Prescription Document</h3>
              <p className="text-xs text-slate-500 mt-1">
                Supports PDF, JPG, PNG from clinics, hospitals, or camera photos.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all">
                <span>Browse File from Device</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleSimulateDemo}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-teal-300 hover:bg-teal-50 text-teal-800 text-xs font-bold transition-all cursor-pointer"
              >
                Scan Sample Prescription (Instant Demo)
              </button>
            </div>

            {loading && (
              <div className="p-4 bg-teal-50 rounded-xl max-w-md mx-auto space-y-2">
                <div className="flex items-center justify-center space-x-2 text-teal-700 text-xs font-bold">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Amazon Bedrock OCR & Clinical NER in progress...</span>
                </div>
                <div className="w-full bg-teal-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}
          </div>

          {/* Results: Extracted Medicines & 4-Slot Schedule */}
          {uploadResult && (
            <div className="space-y-6">
              {/* Medicines Summary Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Extracted Medications ({uploadResult.extracted_medicines.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prescription ID: <span className="font-mono text-teal-700 font-bold">{uploadResult.prescription_id}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>OCR Verified</span>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="pb-2">Medicine / Brand</th>
                        <th className="pb-2">Active Salt</th>
                        <th className="pb-2">Dosage</th>
                        <th className="pb-2">Frequency</th>
                        <th className="pb-2">Timing</th>
                        <th className="pb-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {uploadResult.extracted_medicines.map((med, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="py-2.5 font-bold text-slate-900">{med.brand_name}</td>
                          <td className="py-2.5 text-teal-700 font-semibold">{med.generic_name}</td>
                          <td className="py-2.5">{med.strength}</td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold">
                              {med.frequency}
                            </span>
                          </td>
                          <td className="py-2.5">{med.timing}</td>
                          <td className="py-2.5">{med.duration_days} Days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Clean 4-Phase Visual Schedule */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Daily Visual Medication Schedule</h3>
                  <p className="text-xs text-slate-500">
                    Automatically mapped into 4 structured daily time slots.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {uploadResult.clean_schedule.schedule_slots.map((slot, i) => {
                    const icons = [Coffee, Sun, Sunset, Moon];
                    const SlotIcon = icons[i % icons.length];
                    const colorStyles = [
                      "border-amber-200 bg-amber-50/40 text-amber-900",
                      "border-blue-200 bg-blue-50/40 text-blue-900",
                      "border-orange-200 bg-orange-50/40 text-orange-900",
                      "border-indigo-200 bg-indigo-50/40 text-indigo-900"
                    ];

                    return (
                      <div
                        key={i}
                        className={`rounded-2xl border p-4 space-y-3 ${colorStyles[i % colorStyles.length]}`}
                      >
                        <div className="flex items-center space-x-2">
                          <SlotIcon className="w-5 h-5 opacity-80" />
                          <h4 className="font-bold text-xs uppercase tracking-wider">{slot.time_slot}</h4>
                        </div>

                        {slot.medicines.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4 text-center">No pills scheduled</p>
                        ) : (
                          <div className="space-y-2">
                            {slot.medicines.map((m, mIdx) => (
                              <div key={mIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-xs text-slate-900">{m.name}</p>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800">
                                    {m.count} tab
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">{m.dose} • {m.timing}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Digital Prescription Vault */}
      {activeTab === "vault" && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-slate-800">
              <FolderArchive className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-sm">Archived Prescriptions in S3</h3>
            </div>
            <button
              onClick={loadVault}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Vault</span>
            </button>
          </div>

          {vaultLoading ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-500">
              Loading stored prescriptions...
            </div>
          ) : vaultItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              No prescriptions found in vault for this patient.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vaultItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{item.file_name || "Prescription Document"}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{item.id || item.prescription_id}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      S3 Stored
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Extracted medicines:{" "}
                    <span className="font-semibold text-slate-800">
                      {item.extracted_medicines?.map((m) => m.brand_name).join(", ") || "Standard regimen"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

