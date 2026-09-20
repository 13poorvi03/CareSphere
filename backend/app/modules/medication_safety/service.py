import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from collections import defaultdict
from app.core.aws_clients import get_opensearch_client, DRUG_DATA, get_dynamodb_resource
from app.config import settings
from app.modules.medication_safety.schemas import (
    MedicineItem, DuplicateMedicineAlert, DrugInteractionAlert,
    MedicationSafetyAuditRequest, MedicationSafetyReport
)

logger = logging.getLogger(__name__)

class MedicationSafetyService:
    @classmethod
    def resolve_salt_and_info(cls, med: MedicineItem) -> Dict[str, Any]:
        """Resolves brand name to canonical generic salt and metadata"""
        brand_clean = med.brand_name.strip().lower()
        
        # Exact/Partial match in drug database
        for d in DRUG_DATA.get("drugs", []):
            if d["brand_name"].lower() in brand_clean or brand_clean in d["brand_name"].lower():
                return {
                    "brand_name": med.brand_name,
                    "generic_name": d["generic_name"],
                    "strength": med.strength or d["strength"],
                    "max_daily_dose_mg": d.get("max_daily_dose_mg", 4000)
                }
        
        # If generic_name was directly supplied
        if med.generic_name:
            return {
                "brand_name": med.brand_name,
                "generic_name": med.generic_name,
                "strength": med.strength or "Standard",
                "max_daily_dose_mg": 4000
            }

        return {
            "brand_name": med.brand_name,
            "generic_name": med.brand_name,
            "strength": med.strength or "Standard",
            "max_daily_dose_mg": 4000
        }

    @classmethod
    def check_duplicate_medicines(cls, medicines: List[MedicineItem]) -> List[DuplicateMedicineAlert]:
        """
        Detects duplicate medications where different brand names conceal the same active salt.
        Example: Crocin + Dolo 650 -> Double Paracetamol dosing.
        """
        resolved_list = [cls.resolve_salt_and_info(m) for m in medicines]
        salt_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

        for item in resolved_list:
            # Handle combinations like "Ibuprofen + Paracetamol"
            salts = [s.strip() for s in item["generic_name"].split("+")]
            for s in salts:
                salt_groups[s.lower()].append(item)

        alerts: List[DuplicateMedicineAlert] = []
        for salt_name, items in salt_groups.items():
            if len(items) > 1:
                brand_names = list({it["brand_name"] for it in items})
                canonical_salt = items[0]["generic_name"]

                why = (
                    f"You have been prescribed or are taking multiple brands ({', '.join(brand_names)}) "
                    f"that contain the exact same active medicine: '{canonical_salt}'."
                )
                concern = (
                    f"Taking both concurrently leads to inadvertent double-dosing. For {canonical_salt}, "
                    f"excess cumulative daily dose can cause severe acute hepatotoxicity (liver injury) or organ strain."
                )
                action = (
                    f"Do NOT take both {', '.join(brand_names)} together. Choose ONLY ONE brand as directed by your "
                    f"physician or contact your doctor immediately to adjust the prescription."
                )

                alerts.append(
                    DuplicateMedicineAlert(
                        active_salt=canonical_salt,
                        conflicting_brands=brand_names,
                        safe_daily_limit_mg=items[0].get("max_daily_dose_mg", 4000),
                        is_overdose_risk=True,
                        severity="CRITICAL",
                        why=why,
                        concern=concern,
                        action=action
                    )
                )

        return alerts

    @classmethod
    def check_drug_interactions(cls, medicines: List[MedicineItem]) -> List[DrugInteractionAlert]:
        """
        Checks all pairwise combinations against known Drug-Drug Interaction rules.
        """
        resolved_list = [cls.resolve_salt_and_info(m) for m in medicines]
        all_salts = []
        for it in resolved_list:
            all_salts.extend([s.strip() for s in it["generic_name"].split("+")])

        opensearch = get_opensearch_client()
        raw_interactions = opensearch.find_interactions(all_salts)

        alerts: List[DrugInteractionAlert] = []
        for inter in raw_interactions:
            alerts.append(
                DrugInteractionAlert(
                    drug_a=inter["drug_a"],
                    drug_b=inter["drug_b"],
                    severity=inter["severity"],
                    why=inter["why"],
                    concern=inter["concern"],
                    action=inter["action"]
                )
            )

        return alerts

    @classmethod
    def audit_medications(cls, req: MedicationSafetyAuditRequest) -> MedicationSafetyReport:
        """
        Comprehensive medication safety audit:
        1. Checks duplicate brands.
        2. Checks drug-drug interactions.
        3. Generates Explainable AI cards (Why, Concern, Action).
        4. Logs any critical alerts to DynamoDB alerts table and Health Timeline.
        """
        duplicate_alerts = cls.check_duplicate_medicines(req.medicines)
        interaction_alerts = cls.check_drug_interactions(req.medicines)

        crit_count = sum(1 for a in duplicate_alerts if a.severity == "CRITICAL") + \
                     sum(1 for a in interaction_alerts if a.severity == "CRITICAL")
        major_count = sum(1 for a in interaction_alerts if a.severity == "MAJOR")

        is_safe = (crit_count == 0 and major_count == 0)

        if crit_count > 0:
            rec = "CRITICAL SAFETY RISK: High risk of adverse interaction or accidental overdose detected. Immediate medical review required before taking these medications."
        elif major_count > 0:
            rec = "CAUTION: Potential moderate drug interaction detected. Physician supervision and dose timing separation advised."
        else:
            rec = "All checked medications appear compatible with no duplicate active salts or severe interactions identified."

        report = MedicationSafetyReport(
            patient_id=req.patient_id,
            is_safe=is_safe,
            total_medicines_checked=len(req.medicines),
            critical_alerts_count=crit_count,
            major_alerts_count=major_count,
            duplicate_alerts=duplicate_alerts,
            interaction_alerts=interaction_alerts,
            overall_recommendation=rec
        )

        # Log safety alerts to DynamoDB and timeline if risks detected
        if not is_safe:
            cls._log_safety_event(req.patient_id, report)

        return report

    @classmethod
    def _log_safety_event(cls, patient_id: str, report: MedicationSafetyReport):
        try:
            ddb = get_dynamodb_resource()
            records_table = ddb.Table(settings.DYNAMODB_TABLE_RECORDS)
            alerts_table = ddb.Table(settings.DYNAMODB_TABLE_ALERTS)

            event_id = f"alert_{int(datetime.now(timezone.utc).timestamp()*1000)}"
            now_iso = datetime.now(timezone.utc).isoformat()

            # Save in Alerts table
            alerts_table.put_item(Item={
                "id": event_id,
                "patient_id": patient_id,
                "alert_type": "MEDICATION_SAFETY_VIOLATION",
                "severity": "CRITICAL" if report.critical_alerts_count > 0 else "MAJOR",
                "created_at": now_iso,
                "status": "ACTIVE",
                "details": report.model_dump()
            })

            # Save in Health Timeline
            desc_items = []
            if report.duplicate_alerts:
                desc_items.append(f"{len(report.duplicate_alerts)} Duplicate Brand Alert(s)")
            if report.interaction_alerts:
                desc_items.append(f"{len(report.interaction_alerts)} Drug Interaction Alert(s)")

            records_table.put_item(Item={
                "id": event_id,
                "patient_id": patient_id,
                "event_type": "MEDICATION_SAFETY_ALERT",
                "timestamp": now_iso,
                "title": f"Safety Alert: {', '.join(desc_items)}",
                "description": report.overall_recommendation,
                "severity": "CRITICAL" if report.critical_alerts_count > 0 else "MAJOR",
                "details": report.model_dump()
            })
        except Exception as e:
            logger.error(f"Failed to log medication safety event: {e}")

