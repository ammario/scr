#!/bin/bash
set -e

IMAGE=gcr.io/scr-send/service:$(date +%s)
docker build -t $IMAGE .
docker push $IMAGE
gcloud run deploy scr --project scr-send --image $IMAGE --region us-central1 \
    --allow-unauthenticated
