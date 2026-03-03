---
summary: "Deploy SecuClaw using Docker containers."
read_when:
  - Deploying SecuClaw in production
  - Setting up containerized environments
title: "Docker Deployment"
---

# Docker Deployment

Docker is the recommended way to deploy SecuClaw in production.

## Quick Start

```bash
docker run -d \
  --name secuclaw \
  -p 21000:21000 \
  -v ~/.secuclaw:/root/.secuclaw \
  secuclaw/secuclaw:latest
```

## Docker Images

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release |
| `v1.0.0` | Specific version |
| `edge` | Latest development build |
| `slim` | Minimal image (no bundled skills) |

## Configuration

### Environment Variables

```bash
docker run -d \
  --name secuclaw \
  -p 21000:21000 \
  -e ANTHROPIC_API_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  -e AWS_REGION=us-east-1 \
  secuclaw/secuclaw:latest
```

### Volume Mounts

```bash
docker run -d \
  --name secuclaw \
  -p 21000:21000 \
  -v ~/.secuclaw:/root/.secuclaw \
  -v ./workspace:/root/.secuclaw/workspace \
  -v ./skills:/root/.secuclaw/skills \
  secuclaw/secuclaw:latest
```

### Complete Example

```bash
docker run -d \
  --name secuclaw \
  --restart unless-stopped \
  -p 21000:21000 \
  -v ~/.secuclaw:/root/.secuclaw \
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  -e OPENAI_API_KEY=${OPENAI_API_KEY} \
  -e ESC_DEFAULT_PROVIDER=anthropic \
  --memory="4g" \
  --cpus="2" \
  --security-opt no-new-privileges \
  secuclaw/secuclaw:latest
```

## Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  secuclaw:
    image: secuclaw/secuclaw:latest
    container_name: secuclaw
    restart: unless-stopped
    ports:
      - "21000:21000"
    volumes:
      - ./config:/root/.secuclaw
      - ./workspace:/root/.secuclaw/workspace
      - ./skills:/root/.secuclaw/skills
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ESC_DEFAULT_PROVIDER=anthropic
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:21000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    security_opt:
      - no-new-privileges:true
    read_only: false
    tmpfs:
      - /tmp:size=100M,mode=1777

  redis:
    image: redis:7-alpine
    container_name: secuclaw-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

Run with:

```bash
docker-compose up -d
```

## Health Checks

### Built-in Health Check

```bash
curl http://localhost:21000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "providers": {
    "anthropic": "available",
    "openai": "available"
  }
}
```

### Docker Health Check

```bash
docker inspect --format='{{.State.Health.Status}}' secuclaw
```

## Logging

### View Logs

```bash
docker logs secuclaw
docker logs -f secuclaw  # Follow mode
docker logs --tail 100 secuclaw  # Last 100 lines
```

### Configure Log Driver

```bash
docker run -d \
  --name secuclaw \
  --log-driver json-file \
  --log-opt max-size="10m" \
  --log-opt max-file="3" \
  secuclaw/secuclaw:latest
```

## Security

### Run as Non-Root User

```bash
docker run -d \
  --name secuclaw \
  --user 1000:1000 \
  -v ~/.secuclaw:/root/.secuclaw:Z \
  secuclaw/secuclaw:latest
```

### Read-Only Root Filesystem

```bash
docker run -d \
  --name secuclaw \
  --read-only \
  --tmpfs /tmp:size=100M \
  -v ~/.secuclaw:/root/.secuclaw \
  secuclaw/secuclaw:latest
```

### Network Security

```bash
docker network create secuclaw-net

docker run -d \
  --name secuclaw \
  --network secuclaw-net \
  -p 127.0.0.1:21000:21000 \
  secuclaw/secuclaw:latest
```

## Scaling

### Horizontal Scaling with Docker Compose

```yaml
version: '3.8'

services:
  secuclaw:
    image: secuclaw/secuclaw:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    ports:
      - "21000-18791:21000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - secuclaw
```

### Load Balancer Configuration

`nginx.conf`:
```nginx
upstream secuclaw {
    least_conn;
    server secuclaw_1:21000;
    server secuclaw_2:21000;
    server secuclaw_3:21000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://secuclaw;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Monitoring

### Prometheus Metrics

SecuClaw exposes metrics at `/metrics`:

```bash
curl http://localhost:21000/metrics
```

### Docker Stats

```bash
docker stats secuclaw
```

## Troubleshooting

### Container Won't Start

```bash
docker logs secuclaw
docker inspect secuclaw
```

### Permission Issues

```bash
# Fix volume permissions
sudo chown -R 1000:1000 ~/.secuclaw
```

### Network Issues

```bash
# Check port binding
docker port secuclaw

# Test connectivity
docker exec secuclaw curl http://localhost:21000/health
```

## Related

- [Kubernetes Deployment](/install/kubernetes)
- [Cloud Deployment](/install/cloud)
- [Configuration](/gateway/configuration)
