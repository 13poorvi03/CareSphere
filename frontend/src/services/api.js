const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...options.headers,
  };
  
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Backend request failed (${res.status})` }));
      throw new Error(err.detail || `Error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Module 1: Symptom Intelligence
  analyzeSymptoms: (data) =>
    request("/symptoms/analyze", { method: "POST", body: JSON.stringify(data) }),
  getAdaptiveQA: (data) =>
    request("/symptoms/adaptive-qa", { method: "POST", body: JSON.stringify(data) }),
  assessFinalRisk: (entry, answers) =>
    request("/symptoms/assess-final-risk", {
      method: "POST",
      body: JSON.stringify({ entry, answers }),
    }),
  sendHealthChatMessage: (data) =>
    request("/health-chat/message", { method: "POST", body: JSON.stringify(data) }),

  // Module 2: Prescription Intelligence & Vault
  uploadPrescription: (formData) =>
    request("/prescriptions/upload", { method: "POST", body: formData }),
  getPrescriptionVault: (patientId) =>
    request(`/prescriptions/vault/${patientId}`),

  // Module 3: Medication Safety Engine
  auditSafety: (data) =>
    request("/safety/audit", { method: "POST", body: JSON.stringify(data) }),

  // Module 4: Health Timeline
  getTimeline: (patientId, filter) =>
    request(`/timeline/${patientId}${filter ? `?event_type=${filter}` : ""}`),
  addTimelineEvent: (data) =>
    request("/timeline/events", { method: "POST", body: JSON.stringify(data) }),

  // Module 5: Emergency Health Card
  getEmergencyCard: (patientId) =>
    request(`/emergency/card/${patientId}`),
  getPublicEmergencyView: (patientId) =>
    request(`/emergency/public/${patientId}`),

  // Module 6: Alerts & Follow-up
  getAlerts: (patientId) =>
    request(`/alerts/${patientId}`),
  takeReminderAction: (data) =>
    request("/alerts/reminder-action", { method: "POST", body: JSON.stringify(data) }),

  // Family Profiles
  getFamilyProfiles: (familyId = "FAM-99") =>
    request(`/family/${familyId}`),

  // Doctor Dashboard
  getDoctorSummary: (patientId) =>
    request(`/doctor/summary/${patientId}`, {
      headers: { "x-user-role": "doctor" },
    }),

  // Localization / Bedrock Simplifier
  simplifyMedicalText: (data) =>
    request("/translate/simplify", { method: "POST", body: JSON.stringify(data) }),
};

