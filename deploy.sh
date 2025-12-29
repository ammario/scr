#!/bin/bash
set -e

IMAGE=gcr.io/scr-send/service:$(date +%s)
echo "Building image: $IMAGE"
docker build --platform linux/amd64 -t $IMAGE .
echo "Pushing image..."
docker push $IMAGE
echo "Deploying to Cloud Run..."
gcloud run deploy scr --project scr-send --image $IMAGE --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10
echo "Deployment complete!"
