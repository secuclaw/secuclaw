---
summary: "Deploy SecuClaw to Kubernetes clusters."
read_when:
  - Deploying to Kubernetes
  - Setting up production clusters
title: "Kubernetes Deployment"
---

# Kubernetes Deployment

Deploy SecuClaw to Kubernetes for production-grade scalability and reliability.

## Prerequisites

- Kubernetes 1.24+
- kubectl configured
- Helm 3.x (optional)
- Ingress controller (optional)

## Quick Deploy

### Using kubectl

```bash
kubectl apply -f https://raw.githubusercontent.com/secuclaw/secuclaw/main/deploy/kubernetes/secuclaw.yaml
```

### Using Helm

```bash
helm repo add secuclaw https://charts.secuclaw.com
helm install secuclaw secuclaw/secuclaw
```

## Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secuclaw
  labels:
    app.kubernetes.io/name: secuclaw
    app.kubernetes.io/component: namespace
```

## Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secuclaw
  namespace: secuclaw
  labels:
    app.kubernetes.io/name: secuclaw
    app.kubernetes.io/component: gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: secuclaw
  template:
    metadata:
      labels:
        app.kubernetes.io/name: secuclaw
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "21000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: secuclaw
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: secuclaw
          image: secuclaw/secuclaw:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 21000
              protocol: TCP
          env:
            - name: ANTHROPIC_API_KEY
              valueFrom:
                secretKeyRef:
                  name: secuclaw-secrets
                  key: anthropic-api-key
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: secuclaw-secrets
                  key: openai-api-key
            - name: ESC_DEFAULT_PROVIDER
              value: "anthropic"
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          volumeMounts:
            - name: config
              mountPath: /root/.secuclaw
              readOnly: false
            - name: workspace
              mountPath: /root/.secuclaw/workspace
            - name: skills
              mountPath: /root/.secuclaw/skills
      volumes:
        - name: config
          persistentVolumeClaim:
            claimName: secuclaw-config-pvc
        - name: workspace
          persistentVolumeClaim:
            claimName: secuclaw-workspace-pvc
        - name: skills
          persistentVolumeClaim:
            claimName: secuclaw-skills-pvc
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app.kubernetes.io/name: secuclaw
                topologyKey: kubernetes.io/hostname
```

## Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: secuclaw
  namespace: secuclaw
  labels:
    app.kubernetes.io/name: secuclaw
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: secuclaw
```

## Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secuclaw
  namespace: secuclaw
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingubernetes.io/proxy-send-timeout: "300"
spec:
  tls:
    - hosts:
        - secuclaw.example.com
      secretName: secuclaw-tls
  rules:
    - host: secuclaw.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secuclaw
                port:
                  number: 80
```

## Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: secuclaw-secrets
  namespace: secuclaw
type: Opaque
stringData:
  anthropic-api-key: "your-anthropic-key"
  openai-api-key: "your-openai-key"
  aws-access-key-id: "your-aws-key"
  aws-secret-access-key: "your-aws-secret"
```

Create from literal:

```bash
kubectl create secret generic secuclaw-secrets \
  --from-literal=anthropic-api-key=sk-ant-... \
  --from-literal=openai-api-key=sk-... \
  -n secuclaw
```

## Persistent Volumes

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: secuclaw-config-pvc
  namespace: secuclaw
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: secuclaw-workspace-pvc
  namespace: secuclaw
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: secuclaw-skills-pvc
  namespace: secuclaw
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard
```

## ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: secuclaw-config
  namespace: secuclaw
data:
  secuclaw.json: |
    {
      "agents": {
        "defaults": {
          "workspace": "/root/.secuclaw/workspace",
          "model": {
            "primary": "anthropic/claude-sonnet-4-5"
          }
        }
      },
      "security": {
        "sources": {
          "siem": { "enabled": true }
        }
      }
    }
```

## Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: secuclaw-hpa
  namespace: secuclaw
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: secuclaw
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

## Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: secuclaw-pdb
  namespace: secuclaw
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: secuclaw
```

## Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: secuclaw-netpol
  namespace: secuclaw
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: secuclaw
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 21000
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53  # DNS
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443  # HTTPS for LLM APIs
```

## Helm Chart

### values.yaml

```yaml
replicaCount: 3

image:
  repository: secuclaw/secuclaw
  tag: latest
  pullPolicy: Always

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: secuclaw.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: secuclaw-tls
      hosts:
        - secuclaw.example.com

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

volumes:
  config:
    size: 1Gi
  workspace:
    size: 10Gi
  skills:
    size: 5Gi

secrets:
  anthropicApiKey: ""
  openaiApiKey: ""
```

### Install with Helm

```bash
helm install secuclaw secuclaw/secuclaw \
  --namespace secuclaw \
  --create-namespace \
  --set secrets.anthropicApiKey=sk-ant-... \
  --set secrets.openaiApiKey=sk-...
```

## Monitoring

### ServiceMonitor (Prometheus Operator)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: secuclaw
  namespace: secuclaw
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: secuclaw
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

## Related

- [Docker Deployment](/install/docker)
- [Cloud Deployment](/install/cloud)
- [Configuration](/gateway/configuration)
