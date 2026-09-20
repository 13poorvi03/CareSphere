import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from app.core.aws_clients import get_dynamodb_resource
from app.config import settings
from app.modules.health_timeline.schemas import TimelineEvent, HealthTimelineResponse, TimelineEventCreate

logger = logging.getLogger(__name__)

# Sample historical seed events for demo patient P-101
SEED_EVENTS: List[Dict[str, Any]] = [
    {
        "id": "evt_seed_1",
        "patient_id": "P-101",
        "event_type": "CLINICAL_CONSULT",
        "timestamp": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
        "title": "General Physician Consultation",
        "description": "Routine quarterly health checkup with Dr. Anita Patel. Blood pressure 128/82 mmHg.",
        "severity": "NORMAL",
        "details": {"doctor": "Dr. Anita Patel", "clinic": "Apollo Clinic", "bp": "128/82"}
    },
    {
        "id": "evt_seed_2",
        "patient_id": "P-101",
        "event_type": "LAB_REPORT",
        "timestamp": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
        "title": "Complete Blood Count & Lipid Profile",
        "description": "Hb: 14.2 g/dL, Platelets: 240,000 /mcL, Total Cholesterol: 195 mg/dL. All parameters within normal limits.",
        "severity": "NORMAL",
        "details": {"lab": "Dr. Lal PathLabs", "status": "Normal"}
    },
    {
        "id": "evt_seed_3",
        "patient_id": "P-101",
        "event_type": "PRESCRIPTION_ADDED",
        "timestamp": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
        "title": "Prescription: Seasonal Pharyngitis",
        "description": "Prescribed Augmentin 625 Duo, Dolo 650, and Pan 40 for 5 days.",
        "severity": "NORMAL",
        "details": {"medications": ["Augmentin 625", "Dolo 650", "Pan 40"]}
    },
    {
        "id": "evt_seed_4",
        "patient_id": "P-101",
        "event_type": "MEDICATION_SAFETY_ALERT",
        "timestamp": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        "title": "Safety Alert: Duplicate Brand Detected",
        "description": "Patient attempted to add Crocin Advance while already taking Dolo 650. Both contain Paracetamol. Prevented accidental overdose.",
        "severity": "CRITICAL",
        "details": {"active_salt": "Paracetamol", "brands": ["Dolo 650", "Crocin Advance"]}
    },
    {
        "id": "evt_seed_5",
        "patient_id": "P-101",
        "event_type": "SYMPTOM_ASSESSMENT",
        "timestamp": (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat(),
        "title": "Symptom Triage: Mild Persistent Cough",
        "description": "Dry cough with mild throat irritation. Triage assessed as LOW RISK.",
        "severity": "LOW_RISK",
        "details": {"score": 25, "recommendation": "Hydration and steam inhalation"}
    }
]

class HealthTimelineService:
    @classmethod
    def get_patient_timeline(
        cls,
        patient_id: str,
        event_type_filter: Optional[str] = None
    ) -> HealthTimelineResponse:
        """
        Retrieves all timeline events for patient from DynamoDB,
        merges with seed events if initial setup, and sorts chronologically (newest first).
        """
        ddb = get_dynamodb_resource()
        table = ddb.Table(settings.DYNAMODB_TABLE_RECORDS)
        
        # Query / scan items
        items = table.scan().get("Items", [])
        patient_events = [
            item for item in items
            if item.get("patient_id") == patient_id and "event_type" in item
        ]

        # If no dynamic events exist yet, seed with sample records
        if not patient_events:
            for ev in SEED_EVENTS:
                if ev["patient_id"] == patient_id or patient_id == "P-101":
                    patient_events.append(ev)
                    table.put_item(Item=ev)

        # Filter by type if requested
        if event_type_filter and event_type_filter != "ALL":
            patient_events = [e for e in patient_events if e.get("event_type") == event_type_filter]

        # Sort reverse chronologically
        patient_events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        timeline_events = [
            TimelineEvent(
                id=e["id"],
                patient_id=e["patient_id"],
                event_type=e["event_type"],
                timestamp=e.get("timestamp", datetime.now(timezone.utc).isoformat()),
                title=e.get("title", "Health Event"),
                description=e.get("description", ""),
                severity=e.get("severity", "NORMAL"),
                details=e.get("details", {})
            )
            for e in patient_events
        ]

        return HealthTimelineResponse(
            patient_id=patient_id,
            total_events=len(timeline_events),
            events=timeline_events
        )

    @classmethod
    def record_event(cls, payload: TimelineEventCreate) -> TimelineEvent:
        ddb = get_dynamodb_resource()
        table = ddb.Table(settings.DYNAMODB_TABLE_RECORDS)
        
        event_id = f"evt_{int(datetime.now(timezone.utc).timestamp()*1000)}"
        now_iso = datetime.now(timezone.utc).isoformat()
        
        item = {
            "id": event_id,
            "patient_id": payload.patient_id,
            "event_type": payload.event_type,
            "timestamp": now_iso,
            "title": payload.title,
            "description": payload.description,
            "severity": payload.severity or "NORMAL",
            "details": payload.details or {}
        }
        table.put_item(Item=item)
        
        return TimelineEvent(**item)

