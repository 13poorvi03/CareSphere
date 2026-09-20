import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import SymptomIntelligence from "./components/SymptomIntelligence";
import PrescriptionIntelligence from "./components/PrescriptionIntelligence";
import MedicationSafety from "./components/MedicationSafety";
import HealthTimeline from "./components/HealthTimeline";
import EmergencyHealthCard from "./components/EmergencyHealthCard";
import AlertsAndFollowup from "./components/AlertsAndFollowup";
import DoctorDashboard from "./components/DoctorDashboard";
import MedicalSimplifierModal from "./components/MedicalSimplifierModal";
import HealthChatbot from "./components/HealthChatbot";
import { api } from "./services/api";
import { Cloud, ShieldCheck, Cpu, Database, HardDrive, Radio, Layers } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("symptoms");
  const [language, setLanguage] = useState("en");
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const [isSimplifierOpen, setIsSimplifierOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(3);

  // Family Profiles state
  const [familyMembers, setFamilyMembers] = useState([
    { patient_id: "P-101", name: "Rajesh Sharma", relationship: "Self", age: 42, blood_group: "B+" },
    { patient_id: "P-102", name: "Ramesh Sharma", relationship: "Father", age: 72, blood_group: "O+" },
    { patient_id: "P-103", name: "Sunita Sharma", relationship: "Mother", age: 68, blood_group: "A+" },
    { patient_id: "P-104", name: "Aarav Sharma", relationship: "Child", age: 9, blood_group: "B+" }
  ]);
  const [currentPatient, setCurrentPatient] = useState(familyMembers[0]);

  useEffect(() => {
    api.getFamilyProfiles("FAM-99").then((res) => {
      if (res?.members?.length > 0) {
        setFamilyMembers(res.members);
        const primary = res.members.find((m) => m.is_primary_account) || res.members[0];
        setCurrentPatient(primary);
      }
    }).catch((err) => console.warn("Using default family members:", err));
  }, []);

  useEffect(() => {
    api.getAlerts(currentPatient?.patient_id || "P-101").then((res) => {
      if (res?.total_active_alerts !== undefined) setAlertCount(res.total_active_alerts);
    }).catch((err) => console.warn("Alert count fetch:", err));
  }, [currentPatient?.patient_id]);

  const refreshAlertCount = () => {
    api.getAlerts(currentPatient?.patient_id || "P-101").then((res) => {
      if (res?.total_active_alerts !== undefined) setAlertCount(res.total_active_alerts);
    }).catch((err) => console.warn("Alert count refresh:", err));
  };

  const handlePatientChange = (patient) => setCurrentPatient(patient);

  return (
    <div className="min-h-screen flex flex-col text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === "doctor") setIsDoctorMode(true);
          else setIsDoctorMode(false);
        }}
        currentPatient={currentPatient}
        setCurrentPatient={handlePatientChange}
        familyMembers={familyMembers}
        isDoctorMode={isDoctorMode}
        setIsDoctorMode={setIsDoctorMode}
        language={language}
        setLanguage={setLanguage}
        alertCount={alertCount}
        onOpenEmergencyModal={() => setActiveTab("emergency")}
        onOpenSimplifier={() => setIsSimplifierOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="dashboard-grid">
          <section className="min-w-0">
            {activeTab === "symptoms" && (
              <SymptomIntelligence
                currentPatient={currentPatient}
                onTriageComplete={refreshAlertCount}
              />
            )}

            {activeTab === "prescriptions" && (
              <PrescriptionIntelligence
                currentPatient={currentPatient}
                onUploadComplete={refreshAlertCount}
              />
            )}

            {activeTab === "safety" && (
              <MedicationSafety
                currentPatient={currentPatient}
              />
            )}

            {activeTab === "timeline" && (
              <HealthTimeline
                currentPatient={currentPatient}
              />
            )}

            {activeTab === "emergency" && (
              <EmergencyHealthCard
                currentPatient={currentPatient}
              />
            )}

            {activeTab === "alerts" && (
              <AlertsAndFollowup
                currentPatient={currentPatient}
                onAlertActionTaken={refreshAlertCount}
              />
            )}

            {activeTab === "doctor" && (
              <DoctorDashboard
                currentPatient={currentPatient}
              />
            )}
          </section>
          <HealthChatbot currentPatient={currentPatient} />
        </div>
      </main>

      {/* Bedrock Medical Simplifier Modal */}
      <MedicalSimplifierModal
        isOpen={isSimplifierOpen}
        onClose={() => setIsSimplifierOpen(false)}
      />

      {/* Cloud Architecture Ribbon / Footer */}
      <footer className="border-t border-slate-200 bg-white/90 py-6 mt-12 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800">CareSphere Architecture</span>
              <span className="text-slate-400">|</span>
              <span>FastAPI Backend • React 19 Frontend</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-semibold text-emerald-700">AWS Services Online</span>
              </span>
              <span>Cedar Policy Verified</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center space-x-1">
              <Cpu className="w-3 h-3 text-purple-600" />
              <span>Amazon Bedrock (Claude 3 / Titan)</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center space-x-1">
              <Database className="w-3 h-3 text-blue-600" />
              <span>AWS DynamoDB Records</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-amber-600" />
              <span>AWS S3 Prescriptions & QR</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center space-x-1">
              <Layers className="w-3 h-3 text-teal-600" />
              <span>AWS OpenSearch Drug DDI</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center space-x-1">
              <Radio className="w-3 h-3 text-red-600" />
              <span>AWS EventBridge & Step Functions</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
              <span>AWS Cognito + Cedar Policies</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
