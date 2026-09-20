from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareSphere"
    API_V1_STR: str = "/api/v1"
    
    # AWS Configuration
    AWS_REGION: str = "ap-south-1"  # Default AWS Asia Pacific (Mumbai)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None
    
    # Live vs Mock toggle: If True or if AWS credentials missing, uses built-in in-memory simulation
    AWS_MOCK_MODE: bool = True
    
    # S3
    S3_BUCKET_NAME: str = "caresphere-prescriptions-and-qr"
    
    # DynamoDB
    DYNAMODB_TABLE_RECORDS: str = "CareSphere_HealthRecords"
    DYNAMODB_TABLE_ALERTS: str = "CareSphere_Alerts"
    DYNAMODB_TABLE_PROFILES: str = "CareSphere_Profiles"
    
    # Bedrock
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    BEDROCK_SIMPLIFIER_MODEL_ID: str = "amazon.titan-text-express-v1"
    
    # OpenSearch
    OPENSEARCH_ENDPOINT: Optional[str] = None
    
    # Cognito
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_APP_CLIENT_ID: Optional[str] = None
    
    # EventBridge & Step Functions
    EVENTBRIDGE_BUS_NAME: str = "caresphere-health-events"
    STEP_FUNCTIONS_ALERT_STATE_MACHINE_ARN: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
