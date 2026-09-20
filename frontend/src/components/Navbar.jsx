import React from "react";
import { 
  Activity, ShieldAlert, Users, Stethoscope, Globe, 
  HeartPulse, Sparkles, BellRing
} from "lucide-react";
import { UI_TRANSLATIONS } from "../data/translations";

export default function Navbar({
  activeTab,
  setActiveTab,
  currentPatient,
  setCurrentPatient,
  familyMembers,
  isDoctorMode,
  setIsDoctorMode,
  language,
  setLanguage,
  alertCount,
  onOpenEmergencyModal,
  onOpenSimplifier
}) {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  const navTabs = [
    { id: "symptoms", label: t.navSymptoms, icon: Activity },
    { id: "prescriptions", label: t.navPrescription, icon: HeartPulse },
    { id: "safety", label: t.navSafety, icon: ShieldAlert },
    { id: "timeline", label: t.navTimeline, icon: Activity },
    { id: "emergency", label: t.navEmergency, icon: ShieldAlert },
    { id: "alerts", label: t.navAlerts, icon: BellRing, badge: alertCount },
    { id: "doctor", label: t.navDoctor, icon: Stethoscope },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner with Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("symptoms")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0c2a54] via-[#123b72] to-[#c99b36] flex items-center justify-center text-white shadow-md">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{t.appTitle}</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-[#735313] border border-amber-200">
                AWS GenAI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{t.subTitle}</p>
          </div>
        </div>

        {/* Action Controls: Language, Family Switcher, Doctor Mode, Emergency SOS */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <Globe className="w-4 h-4 text-slate-500 ml-1.5 mr-1" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none pr-2 cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="bn">বাংলা (Bengali)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          </div>

          {/* Family Health Profile Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <Users className="w-4 h-4 text-slate-500 ml-1.5 mr-1" />
            <select
              value={currentPatient?.patient_id || "P-101"}
              onChange={(e) => {
                const selected = familyMembers.find((m) => m.patient_id === e.target.value);
                if (selected) setCurrentPatient(selected);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none pr-2 cursor-pointer"
            >
              {familyMembers.map((member) => (
                <option key={member.patient_id} value={member.patient_id}>
                  {member.name} ({member.relationship})
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Mode Toggle */}
          <button
            onClick={() => {
              setIsDoctorMode(!isDoctorMode);
              if (!isDoctorMode) setActiveTab("doctor");
              else setActiveTab("symptoms");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isDoctorMode
                ? "bg-[#123b72] text-white shadow-sm ring-2 ring-[#d9c28a]"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{isDoctorMode ? "Doctor Mode ON" : "Switch to Doctor"}</span>
          </button>

          {/* Medical Language Simplifier Quick Button */}
          <button
            onClick={onOpenSimplifier}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-[#123b72] hover:bg-blue-100 border border-blue-200 flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c99b36]" />
            <span>AI Simplifier</span>
          </button>

          {/* Emergency SOS Quick Launch */}
          <button
            onClick={onOpenEmergencyModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md animate-pulse flex items-center space-x-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t.emergencySOS}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="border-t border-slate-100 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-1 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#123b72] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#123b72] hover:bg-white/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white text-blue-700" : "bg-red-500 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

