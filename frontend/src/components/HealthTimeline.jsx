import React, { useState, useEffect, useCallback } from "react";
import { 
  Activity, Calendar, FileText, ShieldAlert, Stethoscope, 
  TestTube, Filter, Plus, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react";
import { api } from "../services/api";

export default function HealthTimeline({ currentPatient }) {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [expandedEventId, setExpandedEventId] = useState(null);

  // New event form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("CLINICAL_CONSULT");

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTimeline(
        currentPatient.patient_id,
        filter === "ALL" ? null : filter
      );
      setTimeline(res);
    } catch (err) {
      console.error("Timeline loading error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPatient.patient_id, filter]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.addTimelineEvent({
        patient_id: currentPatient.patient_id,
        event_type: newType,
        title: newTitle.trim(),
        description: newDesc.trim(),
        severity: "NORMAL"
      });
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      loadTimeline();
    } catch (err) {
      console.error("Add event error:", err);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case "SYMPTOM_ASSESSMENT":
        return { icon: Activity, color: "text-blue-600 bg-blue-100" };
      case "PRESCRIPTION_ADDED":
        return { icon: FileText, color: "text-teal-600 bg-teal-100" };
      case "MEDICATION_SAFETY_ALERT":
        return { icon: ShieldAlert, color: "text-red-600 bg-red-100" };
      case "CLINICAL_CONSULT":
        return { icon: Stethoscope, color: "text-purple-600 bg-purple-100" };
      case "LAB_REPORT":
        return { icon: TestTube, color: "text-amber-600 bg-amber-100" };
      default:
        return { icon: Calendar, color: "text-slate-600 bg-slate-100" };
    }
  };

  const filters = [
    { id: "ALL", label: "All Events" },
    { id: "SYMPTOM_ASSESSMENT", label: "Symptoms" },
    { id: "PRESCRIPTION_ADDED", label: "Prescriptions" },
    { id: "MEDICATION_SAFETY_ALERT", label: "Safety Alerts" },
    { id: "CLINICAL_CONSULT", label: "Doctor Consults" },
    { id: "LAB_REPORT", label: "Lab Reports" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold">Chronological Health Timeline</h2>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            DynamoDB unified medical journal aggregating doctor consults, symptoms, prescriptions, and alerts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Health Event</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === f.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Querying DynamoDB health records...</span>
        </div>
      ) : timeline?.events?.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-400 italic border border-slate-200">
          No records match this filter for {currentPatient.name}.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timeline?.events?.map((event) => {
            const { icon: Icon, color } = getEventIcon(event.event_type);
            const isExpanded = expandedEventId === event.id;
            const isAlert = event.severity === "CRITICAL" || event.event_type === "MEDICATION_SAFETY_ALERT";

            return (
              <div key={event.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${color}`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>

                {/* Event Card */}
                <div
                  className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all ${
                    isAlert ? "border-red-200 bg-red-50/20" : "border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                        {event.event_type.replace(/_/g, " ")}
                      </span>
                      {event.severity === "CRITICAL" && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(event.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-1.5">{event.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{event.description}</p>

                  {/* Toggle details */}
                  {event.details && Object.keys(event.details).length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Details" : "View Structured JSON / Clinical Metadata"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Log New Health Event</h3>
            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="CLINICAL_CONSULT">Doctor Consultation</option>
                  <option value="LAB_REPORT">Lab Test / Diagnostic Report</option>
                  <option value="SYMPTOM_ASSESSMENT">Patient Symptom Note</option>
                  <option value="PRESCRIPTION_ADDED">Prescription Log</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Cardiology review at Max Hospital"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Clinical Notes</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Key doctor advice, prescribed doses, blood pressure readings..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save to DynamoDB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

