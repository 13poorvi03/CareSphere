import React, { useState, useEffect, useCallback } from "react";
import { 
  BellRing, CalendarX, Check, Clock,
  RefreshCw, ShieldAlert, ChevronRight
} from "lucide-react";
import { api } from "../services/api";

export default function AlertsAndFollowup({ currentPatient, onAlertActionTaken }) {
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts(currentPatient.patient_id);
      setAlertsSummary(res);
    } catch (err) {
      console.error("Alerts loading error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPatient.patient_id]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleReminderAction = async (alertId, actionType) => {
    setActionInProgress(alertId);
    try {
      await api.takeReminderAction({
        alert_id: alertId,
        action: actionType,
        snooze_minutes: 30
      });
      await loadAlerts();
      if (onAlertActionTaken) onAlertActionTaken();
    } catch (err) {
      console.error("Reminder action error:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800 rounded-2xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BellRing className="w-6 h-6 text-amber-200 animate-bounce" />
            <h2 className="text-xl font-bold">Alerts & Follow-up Center</h2>
          </div>
          <p className="text-sm text-amber-100 mt-1">
            AWS EventBridge & Step Functions powered missed doctor follow-up detection and smart dose reminders.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border border-white/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Triggers</span>
        </button>
      </div>

      {/* Summary Stat Counters */}
      {alertsSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-2xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Urgent Red Flags</p>
              <p className="text-xl font-black text-red-600">{alertsSummary.red_flags_count}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Missed Follow-ups</p>
              <p className="text-xl font-black text-amber-600">{alertsSummary.missed_followups_count}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Active Pill Reminders</p>
              <p className="text-xl font-black text-blue-600">{alertsSummary.medicine_reminders_count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Feed */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center space-x-2 border border-slate-200">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
          <span>Polling EventBridge scheduler...</span>
        </div>
      ) : alertsSummary?.alerts?.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-xs text-slate-400 italic border border-slate-200">
          No pending alerts or reminders for {currentPatient.name}. All caught up!
        </div>
      ) : (
        <div className="space-y-4">
          {alertsSummary?.alerts?.map((alert) => {
            const isRedFlag = alert.severity === "CRITICAL" || alert.alert_type === "RED_FLAG";
            const isMissed = alert.alert_type === "MISSED_FOLLOWUP";
            const isReminder = alert.alert_type === "MEDICINE_REMINDER";

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3 transition-all ${
                  isRedFlag
                    ? "border-red-300 bg-red-50/20"
                    : isMissed
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-slate-200 hover:border-blue-300"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isRedFlag
                          ? "bg-red-600 text-white"
                          : isMissed
                          ? "bg-amber-500 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {alert.alert_type.replace(/_/g, " ")}
                    </span>
                    {alert.due_date_or_time && (
                      <span className="text-xs font-semibold text-slate-500">
                        Due: {alert.due_date_or_time}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {new Date(alert.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short"
                    })}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Action: </span>
                    <span>{alert.action_required}</span>
                  </div>

                  {/* Reminder Adherence Actions */}
                  {isReminder && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleReminderAction(alert.id, "TAKEN")}
                        disabled={actionInProgress === alert.id}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Taken</span>
                      </button>

                      <button
                        onClick={() => handleReminderAction(alert.id, "SNOOZE")}
                        disabled={actionInProgress === alert.id}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Snooze 30m</span>
                      </button>
                    </div>
                  )}

                  {isMissed && (
                    <button
                      onClick={() => alert("Redirecting to Apollo Clinic Teleconsultation booking...")}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                    >
                      <span>Book Review Consult</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

