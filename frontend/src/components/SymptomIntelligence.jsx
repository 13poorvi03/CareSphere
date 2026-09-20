import React, { useState } from "react";
import { 
  Activity, AlertTriangle, CheckCircle2, ChevronRight,
  Clock, ShieldAlert, Sparkles, RefreshCw, Send, AlertCircle
} from "lucide-react";
import { api } from "../services/api";

export default function SymptomIntelligence({ currentPatient, onTriageComplete }) {
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState(2);
  const [severity, setSeverity] = useState(6);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("input"); // "input" | "adaptive_qa" | "result"

  // Adaptive Q&A state
  const [adaptiveQuestions, setAdaptiveQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [answerText, setAnswerText] = useState("");

  // Result state
  const [assessment, setAssessment] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const quickSamples = [
    {
      title: "Moderate: Fever & Headache",
      text: "Fever 101.5F with throbbing frontal headache and throat irritation since 2 days",
      duration: 2,
      severity: 6
    },
    {
      title: "Emergency: Chest Pain & Arm Numbness",
      text: "Sudden crushing chest pressure, shortness of breath, and left arm pain",
      duration: 1,
      severity: 9
    },
    {
      title: "Low: Seasonal Dry Cough",
      text: "Mild tickling dry cough and slight nasal stuffiness, no breathing issues",
      duration: 3,
      severity: 3
    }
  ];

  const handleStartAnalysis = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    setErrorMessage("");
    try {
      // 1. Fetch adaptive follow-up questions
      const qaResponse = await api.getAdaptiveQA({
        patient_id: currentPatient.patient_id,
        primary_symptoms: symptoms,
        answers_so_far: []
      });

      if (qaResponse && qaResponse.length > 0) {
        setAdaptiveQuestions(qaResponse);
        setCurrentQIndex(0);
        setAnswers([]);
        setChatMessages([
          { role: "user", text: symptoms.trim() },
          { role: "assistant", text: "Thanks. I have a few focused questions so the assessment is more useful." },
          { role: "assistant", text: qaResponse[0].question }
        ]);
        setStep("adaptive_qa");
      } else {
        // Direct assessment if no questions needed
        const result = await api.analyzeSymptoms({
          patient_id: currentPatient.patient_id,
          symptoms,
          duration_days: duration,
          severity_self_rating: severity
        });
        setAssessment(result);
        setStep("result");
        if (onTriageComplete) onTriageComplete();
      }
    } catch (err) {
      console.error("Symptom analysis error:", err);
      setErrorMessage(err.message || "The symptom service is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = async (option) => {
    const currentQ = adaptiveQuestions[currentQIndex];
    const newAnswers = [
      ...answers,
      {
        question_id: currentQ.id,
        question_text: currentQ.question,
        selected_option: option
      }
    ];
    setAnswers(newAnswers);
    setLoading(true);
    setErrorMessage("");
    try {
      const remainingQuestions = await api.getAdaptiveQA({
        patient_id: currentPatient.patient_id,
        primary_symptoms: symptoms,
        answers_so_far: newAnswers
      });

      if (remainingQuestions?.length > 0) {
        setAdaptiveQuestions(remainingQuestions);
        setCurrentQIndex(0);
        setChatMessages((messages) => [
          ...messages,
          { role: "user", text: option },
          { role: "assistant", text: remainingQuestions[0].question }
        ]);
      } else {
        setChatMessages((messages) => [
          ...messages,
          { role: "user", text: option },
          { role: "assistant", text: "I have enough information. I am preparing your explainable prediction now." }
        ]);
        const result = await api.assessFinalRisk(
          {
            patient_id: currentPatient.patient_id,
            symptoms,
            duration_days: duration,
            severity_self_rating: severity
          },
          newAnswers
        );
        setAssessment(result);
        setStep("result");
        if (onTriageComplete) onTriageComplete();
      }
    } catch (err) {
      console.error("Final assessment error:", err);
      setErrorMessage(err.message || "The prediction service is unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTypedAnswer = (event) => {
    event.preventDefault();
    if (answerText.trim()) {
      handleSelectAnswer(answerText.trim());
      setAnswerText("");
    }
  };

  const getRiskBadge = (category) => {
    switch (category) {
      case "EMERGENCY":
        return {
          bg: "bg-red-500 text-white",
          border: "border-red-600",
          icon: ShieldAlert,
          title: "EMERGENCY (Immediate Action Required)"
        };
      case "HIGH_RISK":
        return {
          bg: "bg-orange-500 text-white",
          border: "border-orange-600",
          icon: AlertTriangle,
          title: "HIGH RISK (Urgent In-Person Evaluation)"
        };
      case "MODERATE_RISK":
        return {
          bg: "bg-amber-500 text-white",
          border: "border-amber-600",
          icon: AlertCircle,
          title: "MODERATE RISK (Consult Doctor in 24h)"
        };
      default:
        return {
          bg: "bg-emerald-600 text-white",
          border: "border-emerald-700",
          icon: CheckCircle2,
          title: "LOW RISK (Home Care & Monitoring)"
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 care-shell">
      {/* Header Banner */}
      <div className="care-hero rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-6 h-6 text-blue-300" />
              <h2 className="text-xl font-bold">Symptom Intelligence & Clinical Triage</h2>
            </div>
            <p className="text-sm text-blue-100 mt-1">
              AWS Bedrock-powered adaptive clinical reasoning and red-flag emergency detection.
            </p>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-xs border border-white/20">
            Patient: {currentPatient?.name}
          </span>
        </div>
      </div>

      {/* Step 1: Initial Entry */}
      {step === "input" && (
        <div className="care-panel rounded-2xl p-6 space-y-6">
          {errorMessage && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700" role="alert">{errorMessage}</div>}
          <div>
            <label className="block text-sm font-bold text-[#102a4c] mb-2">
              Describe your symptoms, sensations, and onset:
            </label>
            <textarea
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. High fever with body aches, sore throat and dry cough since yesterday..."
              className="care-input w-full rounded-xl p-3.5 text-sm outline-none"
            />
          </div>

          <div className="chat-preview rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#345273]">
              <Sparkles className="w-4 h-4 text-[#b17d19]" />
              <span>CareSphere conversation</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-sm text-[#345273]">Share a symptom above and CareSphere will ask only the questions relevant to you.</p>
          </div>

          {/* Quick Demo Pre-fills */}
          <div>
              <span className="text-xs font-bold uppercase text-[#345273] tracking-wider">
              Quick Test Scenarios:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {quickSamples.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSymptoms(sample.text);
                    setDuration(sample.duration);
                    setSeverity(sample.severity);
                  }}
                  className="text-left p-3 rounded-xl border border-slate-300 bg-white hover:border-[#1d5a9e] hover:bg-blue-50 transition-all text-xs cursor-pointer group"
                >
                  <p className="font-semibold text-[#102a4c] group-hover:text-[#0f4c91]">
                    {sample.title}
                  </p>
                  <p className="text-slate-600 text-[11px] truncate mt-0.5">{sample.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Duration of Symptoms</span>
                <span className="font-bold text-[#102a4c]">{duration} Day{duration > 1 ? "s" : ""}</span>
              </div>
              <input
                type="range"
                min={1}
                max={14}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-[#0f4c91] cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Discomfort / Severity Rating</span>
                <span className="font-bold text-[#102a4c]">{severity} / 10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full accent-[#c99b36] cursor-pointer"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartAnalysis}
            disabled={loading || !symptoms.trim()}
            className="w-full py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Consulting AI Clinical Engine...</span>
              </>
            ) : (
              <>
                <span>Analyze Symptoms & Start Adaptive Triage</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Adaptive Q&A Follow-up Wizard */}
      {step === "adaptive_qa" && adaptiveQuestions.length > 0 && (
        <div className="care-panel rounded-2xl p-6 space-y-6 animate-slide-up">
          {errorMessage && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700" role="alert">{errorMessage}</div>}
          <div className="chat-thread space-y-3 max-h-64 overflow-y-auto">
            {chatMessages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "chat-user" : "chat-assistant"}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2 text-[#123b72]">
              <Sparkles className="w-5 h-5 text-[#c99b36] animate-pulse" />
              <h3 className="font-bold text-sm">Adaptive Clinical Follow-up</h3>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Question {currentQIndex + 1} of {adaptiveQuestions.length}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold text-slate-600 tracking-wider">
              {adaptiveQuestions[currentQIndex]?.context || "Clinical Clarification"}
            </span>
            <p className="text-base font-semibold text-[#123b72] mt-1">
              {adaptiveQuestions[currentQIndex]?.question}
            </p>
          </div>

          <div className="space-y-2.5">
            {adaptiveQuestions[currentQIndex]?.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectAnswer(opt)}
                disabled={loading}
                className="w-full text-left p-4 rounded-xl border border-slate-300 bg-white hover:border-[#1d5a9e] hover:bg-blue-50 transition-all font-medium text-sm text-slate-800 flex items-center justify-between cursor-pointer group"
              >
                <span>{opt}</span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#123b72] transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>

          <form onSubmit={handleTypedAnswer} className="flex gap-2 pt-2 border-t border-zinc-800">
            <input
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              placeholder="Type your answer..."
              className="care-input flex-1 rounded-xl px-4 py-3 text-sm outline-none"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !answerText.trim()} className="rounded-xl bg-zinc-100 px-4 text-zinc-950 hover:bg-white disabled:opacity-40" aria-label="Send answer">
              <Send className="w-4 h-4" />
            </button>
          </form>

          {loading && (
            <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-indigo-600 py-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Calculating triage risk category...</span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Triage Result Card */}
      {step === "result" && assessment && (
        <div className="care-panel rounded-2xl p-6 space-y-6 animate-fade-in">
          {/* Risk Level Banner */}
          {(() => {
            const badge = getRiskBadge(assessment.risk_category);
            const Icon = badge.icon;
            return (
              <div className={`p-4 rounded-xl ${badge.bg} flex items-center justify-between shadow-sm`}>
                <div className="flex items-center space-x-3">
                  <Icon className="w-7 h-7" />
                  <div>
                    <h3 className="text-base font-black tracking-wide">{badge.title}</h3>
                    <p className="text-xs opacity-90">Clinical Triage Score: {assessment.risk_score} / 100</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase opacity-80 block">Wait Window</span>
                  <span className="font-bold text-sm">{assessment.estimated_wait_window}</span>
                </div>
              </div>
            );
          })()}

          {/* Red Flag Warnings if any */}
          {assessment.red_flags_detected?.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-red-800 font-bold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>CRITICAL RED FLAGS DETECTED</span>
              </div>
              <ul className="list-disc list-inside text-xs text-red-700 space-y-1 font-medium">
                {assessment.red_flags_detected.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Triage Guidance & Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs mb-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Triage Guidance</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {assessment.triage_guidance}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center space-x-2 text-blue-900 font-semibold text-xs mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Recommended Action</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed font-medium">
                {assessment.recommended_action}
              </p>
            </div>
          </div>

          {assessment.disease_findings?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#123b72] font-bold text-sm"><Sparkles className="w-4 h-4 text-[#c99b36]" /> Explainable disease signals</div>
              {assessment.disease_findings.map((finding, index) => (
                <div key={index} className="finding-grid rounded-xl border border-slate-300 p-4 text-sm">
                  <div><span className="finding-label">Concern</span><p className="text-slate-900 font-semibold">{finding.concern}</p></div>
                  <div><span className="finding-label">Why</span><p className="text-slate-700">{finding.why}</p></div>
                  <div><span className="finding-label">Action</span><p className="text-slate-700">{finding.action}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              setStep("input");
              setSymptoms("");
              setAssessment(null);
              setChatMessages([]);
              setAnswers([]);
            }}
            className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Start New Symptom Assessment
          </button>
        </div>
      )}
    </div>
  );
}

