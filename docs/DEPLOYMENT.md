# Deployment Guide

This guide covers deployment options for LabelGuard API.

## Prerequisites

- Node.js 20+ installed
- USDA API key from [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide.html)
- Docker (optional, for containerized deployment)

## Environment Variables

### Required

- `USDA_API_KEY`: Your USDA FoodData Central API key

### Optional

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (`development`, `production`, `test`)
- `CORS_ORIGIN`: Comma-separated allowed origins
- `API_KEYS`: Comma-separated API keys for authentication
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds (default: 900000)
- `RATE_LIMIT_MAX`: Max requests per window (default: 100)
- `TRUST_PROXY`: Trust reverse proxy (`true`/`false`)
- `CACHE_BACKEND`: Cache backend (`lru`, `kv`, `redis`)
- `CACHE_TTL_MS`: Cache TTL in milliseconds (default: 60000)
- `CACHE_MAX_SIZE`: Max cache size (default: 1000)
- `REDIS_URL`: Redis connection URL (required if `CACHE_BACKEND=redis`)
- `OTEL_ENABLED`: Enable OpenTelemetry tracing (`true`/`false`)

## Docker Deployment

### Building the Image

```bash
docker build -t labelguard-api .
```

### Running with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e USDA_API_KEY=your_key \
  -e NODE_ENV=production \
  --name labelguard-api \
  labelguard-api
```

### Docker Compose

```bash
docker-compose up -d
```

The Dockerfile is configured with:
- Multi-stage build for smaller image size
- Non-root user for security
- Health checks
- Graceful shutdown support

## Vercel Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed Vercel deployment instructions.

## Health Checks

The API provides several health check endpoints:

- `GET /health` - Basic health check
- `GET /health/liveness` - Kubernetes liveness probe
- `GET /health/readiness` - Kubernetes readiness probe (checks cache, circuit breaker)
- `GET /health/metrics` - Prometheus metrics

## Monitoring

### Prometheus Metrics

Metrics are available at `/health/metrics` in Prometheus format.

### OpenTelemetry Tracing

Set `OTEL_ENABLED=true` to enable distributed tracing. Configure exporters via OpenTelemetry environment variables.

## Troubleshooting

See [TROUBLESHOOTING_VERCEL.md](./TROUBLESHOOTING_VERCEL.md) for common issues and solutions.

## Déploiement Vercel

### Configuration

1. **Variables d'environnement** requises dans Vercel :
   - `USDA_API_KEY` : Clé API USDA FoodData Central
   - `API_KEYS` : Clés API séparées par virgules (optionnel, pour authentification)
   - `CACHE_BACKEND` : `lru` (défaut), `kv`, ou `redis`
   - `REDIS_URL` : Si `CACHE_BACKEND=redis`
   - `RATE_LIMIT_MAX` : Nombre max de requêtes par fenêtre (défaut: 100)
   - `RATE_LIMIT_WINDOW_MS` : Fenêtre de rate limiting en ms (défaut: 900000 = 15 min)

2. **Node.js Version** : 20.x (défini dans `package.json`)

3. **Build Command** : `npm run build` (automatique)

4. **Output Directory** : `dist` (automatique pour serverless)

### Note sur les dépendances

- `zod-to-openapi` a été retiré car non compatible avec Zod 3.x
- L'OpenAPI spec est maintenu manuellement dans `src/docs/openapiSpec.ts`
- Si vous rencontrez des conflits de dépendances, Vercel utilisera automatiquement la résolution configurée
