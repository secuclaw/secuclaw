---
summary: "Deploy SecuClaw to cloud platforms: AWS, GCP, Azure."
read_when:
  - Deploying to AWS, GCP, or Azure
  - Configuring cloud-specific settings
title: "Cloud Deployment"
---

# Cloud Deployment

Deploy SecuClaw to major cloud platforms with production-grade configurations.

## AWS

### ECS Fargate

```yaml
# ecs-task-definition.json
{
  "family": "secuclaw",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "secuclaw",
      "image": "secuclaw/secuclaw:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 21000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ANTHROPIC_API_KEY",
          "value": "${SECRET_ARN}"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/secuclaw",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster secuclaw-cluster \
  --service-name secuclaw \
  --task-definition secuclaw:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}"
```

### EC2 with Systemd

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ec2-user

# Create systemd service
cat > /etc/systemd/system/secuclaw.service << EOF
[Unit]
Description=SecuClaw Security Commander
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user
ExecStart=/usr/bin/docker run --rm -p 21000:21000 \\
  -v /home/ec2-user/.secuclaw:/root/.secuclaw \\
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \\
  secuclaw/secuclaw:latest
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable secuclaw
systemctl start secuclaw
```

### AWS Lambda (Lightweight)

```python
# lambda_function.py
import json
import os
import asyncio
from dataclasses import dataclass

@dataclass
class LambdaEvent:
    body: str
    headers: dict

async def handler(event, context):
    body = json.loads(event.get("body", "{}"))
    command = body.get("command", "")
    
    # Import and run SecuClaw
    from core import SecurityCommander
    
    commander = SecurityCommander(
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
        provider="anthropic"
    )
    
    result = await commander.execute(command)
    
    return {
        "statusCode": 200,
        "body": json.dumps(result)
    }
```

```bash
# Package and deploy
zip -r function.zip lambda_function.py
aws lambda create-function \
  --function-name secuclaw \
  --runtime python3.11 \
  --handler lambda_function.handler \
  --zip-file fileb://function.zip \
  --timeout 300 \
  --memory-size 10240
```

---

## Google Cloud Platform

### Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy secuclaw \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --port 21000 \
  --set-env-vars ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

### GKE (Kubernetes)

```yaml
# gke-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secuclaw
  namespace: secuclaw
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secuclaw
  template:
    metadata:
      labels:
        app: secuclaw
    spec:
      containers:
        - name: secuclaw
          image: secuclaw/secuclaw:latest
          ports:
            - containerPort: 21000
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: secuclaw-secrets
                  key: anthropic-api-key
```

```bash
# Apply deployment
kubectl apply -f gke-deployment.yaml

# Expose with Cloud Load Balancer
kubectl expose deployment secuclaw \
  --type=LoadBalancer \
  --port 80 \
  --target-port 21000
```

### Compute Engine

```bash
# Startup script
cat > startup.sh << 'EOF'
#!/bin/bash
apt-get update
apt-get install -y docker.io

docker pull secuclaw/secuclaw:latest

docker run -d \
  --name secuclaw \
  --restart always \
  -p 21000:21000 \
  -v /home/secuclaw:/root/.secuclaw \
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  secuclaw/secuclaw:latest
EOF

# Create instance
gcloud compute instances create secuclaw \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --boot-disk-size=50GB \
  --tags=http-server,https-server \
  --metadata-from-file startup-script=startup.sh
```

---

## Azure

### Container Instances

```bash
# Deploy to Azure Container Instances
az container create \
  --resource-group secuclaw-rg \
  --name secuclaw \
  --image secuclaw/secuclaw:latest \
  --cpu 2 \
  --memory 4 \
  --port 21000 \
  --environment-variables \
    ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  --dns-name-label secuclaw-${RANDOM} \
  --location eastus
```

### Azure Kubernetes Service

```yaml
# aks-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secuclaw
  namespace: secuclaw
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secuclaw
  template:
    metadata:
      labels:
        app: secuclaw
    spec:
      containers:
        - name: secuclaw
          image: secuclaw/secuclaw:latest
          ports:
            - containerPort: 21000
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: secuclaw-secrets
                  key: anthropic-api-key
---
apiVersion: v1
kind: Service
metadata:
  name: secuclaw-lb
  namespace: secuclaw
spec:
  type: LoadBalancer
  selector:
    app: secuclaw
  ports:
    - port: 80
      targetPort: 21000
```

```bash
# Deploy to AKS
az aks get-credentials --resource-group secuclaw-rg --name secuclaw-aks
kubectl apply -f aks-deployment.yaml
```

### Azure App Service (Containers)

```bash
# Create App Service
az webapp create \
  --resource-group secuclaw-rg \
  --plan secuclaw-plan \
  --name secuclaw \
  --deployment-container-image-name secuclaw/secuclaw:latest

# Configure environment variables
az webapp config appsettings set \
  --resource-group secuclaw-rg \
  --name secuclaw \
  --settings ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

---

## Cloud-Specific Configuration

### AWS Secrets Manager

```typescript
// src/config/secrets.ts
import { SecretsManager } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManager({ region: "us-east-1" });

export async function loadSecrets(): Promise<Record<string, string>> {
  const response = await client.getSecretValue({
    SecretId: "secuclaw/production",
  });
  
  return JSON.parse(response.SecretString || "{}");
}
```

### GCP Secret Manager

```bash
# Store secrets
echo -n "your-api-key" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding ANTHROPIC_API_KEY \
  --member=serviceAccount:secuclaw@project.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Azure Key Vault

```bash
# Store secret
az keyvault secret set \
  --vault-name secuclaw-vault \
  --name ANTHROPIC-API-KEY \
  --value "your-api-key"

# Grant access
az keyvault set-policy \
  --name secuclaw-vault \
  --spn <service-principal-id> \
  --secret-permissions get list
```

---

## Environment Matrix

| Platform | Service | Scaling | Cost (est/mo) |
|----------|---------|---------|---------------|
| AWS | ECS Fargate | Auto | $50-100 |
| AWS | EC2 | Manual | $30-60 |
| GCP | Cloud Run | Auto | $40-80 |
| GKE | Kubernetes | Auto | $60-120 |
| Azure | ACI | Manual | $40-80 |
| AKS | Kubernetes | Auto | $60-120 |

---

## Health Checks

All cloud deployments should include health check endpoints:

```bash
# Health check
curl http://localhost:21000/health

# Readiness check
curl http://localhost:21000/ready
```

Configure your cloud load balancer to use these endpoints for health monitoring.

---

## Monitoring

### CloudWatch (AWS)

```yaml
# metrics.yaml
resources:
  - type: AWS::Logs::LogGroup
    properties:
      LogGroupName: /ecs/secuclaw
      RetentionInDays: 7
```

### Cloud Logging (GCP)

```bash
# View logs
gcloud logs read "resource.type=cloud_run_revision" --limit 50
```

### Azure Monitor

```bash
# View logs
az monitor log-analytics query \
  --workspace-name secuclaw-workspace \
  --query "ContainerLog | where TimeGenerated > ago(1h)"
```
