// ==============================================================================
// Cedar Authorization Policies for CareSphere
// Designed for Amazon Verified Permissions (AVP)
// ==============================================================================

// Rule 1: First-Responders & Paramedics can view Emergency Card without login
permit(
    principal,
    action == Action::"viewEmergencyCard",
    resource is EmergencyCard
);

// Rule 2: Patient has full control over their own health records & symptoms
permit(
    principal is User,
    action in [
        Action::"readRecord",
        Action::"updateRecord",
        Action::"addSymptom",
        Action::"uploadPrescription",
        Action::"viewTimeline"
    ],
    resource is PatientRecord
) when {
    principal.patient_id == resource.patient_id
};

// Rule 3: Authorized Family Members can manage linked dependent records
permit(
    principal is User,
    action in [
        Action::"readRecord",
        Action::"addSymptom",
        Action::"viewTimeline",
        Action::"viewAlerts"
    ],
    resource is PatientRecord
) when {
    principal.role == "family_manager" &&
    principal.family_id == resource.family_id
};

// Rule 4: Certified Clinicians & Doctors can access clinical summaries & prescribe
permit(
    principal is User,
    action in [
        Action::"readRecord",
        Action::"viewDoctorDashboard",
        Action::"writePrescription",
        Action::"reviewAlerts",
        Action::"runSafetyAudit"
    ],
    resource is PatientRecord
) when {
    principal.role == "doctor"
};

