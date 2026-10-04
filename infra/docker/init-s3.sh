#!/bin/bash
awslocal s3 mb s3://sehatkosh-prescriptions
awslocal s3api put-bucket-cors --bucket sehatkosh-prescriptions --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": ["*"]
    }
  ]
}'
