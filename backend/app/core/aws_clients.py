import os
import json
import logging
import boto3
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Load seeded drug database
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DRUG_DB_PATH = os.path.join(DATA_DIR, "drug_database.json")
TRIAGE_RULES_PATH = os.path.join(DATA_DIR, "triage_rules.json")

def load_json_file(path: str) -> Dict[str, Any]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

DRUG_DATA = load_json_file(DRUG_DB_PATH)
TRIAGE_DATA = load_json_file(TRIAGE_RULES_PATH)


class MockS3Client:
    """In-memory & local simulation for AWS S3"""
    def __init__(self):
        self._storage: Dict[str, bytes] = {}

    def put_object(self, Bucket: str, Key: str, Body: Any, ContentType: str = "application/octet-stream", **kwargs):
        if hasattr(Body, "read"):
            data = Body.read()
        elif isinstance(Body, str):
            data = Body.encode("utf-8")
        else:
            data = Body
        self._storage[f"{Bucket}/{Key}"] = data
        return {"ETag": '"mock-etag-12345"', "VersionId": "v1"}

    def get_object(self, Bucket: str, Key: str):
        path = f"{Bucket}/{Key}"
        if path in self._storage:
            class MockStreamingBody:
                def __init__(self, content):
                    self.content = content
                def read(self):
                    return self.content
            return {"Body": MockStreamingBody(self._storage[path])}
        raise FileNotFoundError(f"Key {Key} not found in mock bucket {Bucket}")

    def generate_presigned_url(self, ClientMethod: str, Params: Dict[str, Any], ExpiresIn: int = 3600):
        bucket = Params.get("Bucket", "default-bucket")
        key = Params.get("Key", "default-key")
        return f"https://{bucket}.s3.ap-south-1.amazonaws.com/{key}"


class MockDynamoDBTable:
    """Mock single DynamoDB table"""
    def __init__(self, table_name: str):
        self.name = table_name
        self.items: Dict[str, Dict[str, Any]] = {}

    def put_item(self, Item: Dict[str, Any]):
        key = Item.get("id") or Item.get("patient_id") or str(len(self.items))
        self.items[str(key)] = Item
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def get_item(self, Key: Dict[str, Any]):
        key_val = next(iter(Key.values()))
        item = self.items.get(str(key_val))
        return {"Item": item} if item else {}

    def scan(self, **kwargs):
        return {"Items": list(self.items.values()), "Count": len(self.items)}

    def query(self, **kwargs):
        # Return all items matching condition or all if mock
        return {"Items": list(self.items.values()), "Count": len(self.items)}

    def delete_item(self, Key: Dict[str, Any]):
        key_val = next(iter(Key.values()))
        if str(key_val) in self.items:
            del self.items[str(key_val)]
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}


class MockDynamoDBResource:
    """In-memory DynamoDB simulation"""
    def __init__(self):
        self.tables: Dict[str, MockDynamoDBTable] = {}

    def Table(self, name: str):
        if name not in self.tables:
            self.tables[name] = MockDynamoDBTable(name)
        return self.tables[name]


class MockBedrockClient:
    """AWS Bedrock Simulation for OCR, Simplification and Q&A"""
    def invoke_model(self, modelId: str, body: str, **kwargs):
        request = json.loads(body) if isinstance(body, str) else body
        prompt = request.get("prompt", "") or json.dumps(request)
        return {
            "body": {
                "read": lambda: json.dumps({
                    "completion": "Simulated Bedrock Response based on clinical reasoning model."
                }).encode("utf-8")
            }
        }


class MockOpenSearchClient:
    """Simulates AWS OpenSearch drug search against curated Indian Pharmacopoeia"""
    def search_drugs(self, query: str) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        results = []
        for drug in DRUG_DATA.get("drugs", []):
            if (query_lower in drug["brand_name"].lower() or 
                query_lower in drug["generic_name"].lower() or
                query_lower in drug["therapeutic_class"].lower()):
                results.append(drug)
        return results

    def find_interactions(self, active_salts: List[str]) -> List[Dict[str, Any]]:
        salts_lower = [s.strip().lower() for s in active_salts]
        flagged = []
        for inter in DRUG_DATA.get("interactions", []):
            da = inter["drug_a"].lower()
            db = inter["drug_b"].lower()
            
            # Check if both drugs or partial salt names appear in the active salts
            match_a = any(da in s or s in da for s in salts_lower)
            match_b = any(db in s or s in db for s in salts_lower)
            if match_a and match_b:
                flagged.append(inter)
        return flagged


class MockEventBridgeClient:
    """Simulates AWS EventBridge event publication"""
    def __init__(self):
        self.published_events = []

    def put_events(self, Entries: List[Dict[str, Any]]):
        self.published_events.extend(Entries)
        return {
            "FailedEntryCount": 0,
            "Entries": [{"EventId": f"evt-mock-{i}"} for i, _ in enumerate(Entries)]
        }


class MockStepFunctionsClient:
    """Simulates AWS Step Functions execution"""
    def start_execution(self, stateMachineArn: str, name: str, input: str):
        return {
            "executionArn": f"{stateMachineArn}:execution:{name}",
            "startDate": "2026-09-18T13:00:00Z"
        }


# Singleton instances for local in-memory fallback
_mock_s3 = MockS3Client()
_mock_ddb = MockDynamoDBResource()
_mock_bedrock = MockBedrockClient()
_mock_opensearch = MockOpenSearchClient()
_mock_eventbridge = MockEventBridgeClient()
_mock_sfn = MockStepFunctionsClient()


def get_s3_client():
    if not settings.AWS_MOCK_MODE and settings.AWS_ACCESS_KEY_ID:
        try:
            return boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                aws_session_token=settings.AWS_SESSION_TOKEN
            )
        except Exception as e:
            logger.warning(f"Failed to initialize live S3, falling back to mock: {e}")
    return _mock_s3


def get_dynamodb_resource():
    if not settings.AWS_MOCK_MODE and settings.AWS_ACCESS_KEY_ID:
        try:
            return boto3.resource(
                "dynamodb",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                aws_session_token=settings.AWS_SESSION_TOKEN
            )
        except Exception as e:
            logger.warning(f"Failed to initialize live DynamoDB, falling back to mock: {e}")
    return _mock_ddb


def get_bedrock_client():
    if not settings.AWS_MOCK_MODE and settings.AWS_ACCESS_KEY_ID:
        try:
            return boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                aws_session_token=settings.AWS_SESSION_TOKEN
            )
        except Exception as e:
            logger.warning(f"Failed to initialize live Bedrock, falling back to mock: {e}")
    return _mock_bedrock


def get_opensearch_client():
    return _mock_opensearch


def get_eventbridge_client():
    if not settings.AWS_MOCK_MODE and settings.AWS_ACCESS_KEY_ID:
        try:
            return boto3.client(
                "events",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        except Exception as e:
            logger.warning(f"Failed to initialize live EventBridge, falling back to mock: {e}")
    return _mock_eventbridge


def get_stepfunctions_client():
    if not settings.AWS_MOCK_MODE and settings.AWS_ACCESS_KEY_ID:
        try:
            return boto3.client(
                "stepfunctions",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        except Exception as e:
            logger.warning(f"Failed to initialize live Step Functions, falling back to mock: {e}")
    return _mock_sfn

