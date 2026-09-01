import os
import boto3
from botocore.client import Config

INTERNAL_ENDPOINT = os.getenv("AWS_ENDPOINT_URL", "http://localstack:4566")
EXTERNAL_ENDPOINT = os.getenv("AWS_ENDPOINT_URL_EXTERNAL", "http://192.168.1.50:4566")

s3_client_internal = boto3.client(
    "s3",
    endpoint_url=INTERNAL_ENDPOINT,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "mock_key"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "mock_secret"),
    region_name=os.getenv("AWS_DEFAULT_REGION", "ap-southeast-1"),
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)


def generate_presigned_upload_url(bucket_name: str, object_key: str, expires_in: int = 3600) -> str:
    url = s3_client_internal.generate_presigned_url(
        ClientMethod="put_object",
        Params={"Bucket": bucket_name, "Key": object_key},
        ExpiresIn=expires_in,
    )
    if "localstack:4566" in url:
        url = url.replace("http://localstack:4566", EXTERNAL_ENDPOINT)
    return url
