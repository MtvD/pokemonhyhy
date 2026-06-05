#!/bin/bash
set -e

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="ap-southeast-1"
ECR_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/pokemon-app"
TAG=${1:-latest}  # Dùng argument đầu tiên hoặc "latest"

echo "Building image..."
docker build -t pokemon-app:$TAG .

echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "Tagging..."
docker tag pokemon-app:$TAG $ECR_URL:$TAG
docker tag pokemon-app:$TAG $ECR_URL:latest

echo "Pushing..."
docker push $ECR_URL:$TAG
docker push $ECR_URL:latest

echo "Done! Image: $ECR_URL:$TAG"