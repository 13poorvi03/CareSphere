from mangum import Mangum
from app.main import app

# AWS Lambda handler entrypoint for API Gateway / Lambda Function URLs
handler = Mangum(app, lifespan="off")

