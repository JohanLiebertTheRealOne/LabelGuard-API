# LabelGuard API

Production-grade REST API for USDA food search and food label validation. Search foods in USDA FoodData Central, extract clean nutrition data, and validate packaging labels for compliance issues.

## Features

- 🔍 **USDA Food Search**: Search USDA FoodData Central database with clean nutrition data extraction
- ✅ **Label Validation**: Validate food labels for allergen declarations, serving size requirements, and claim plausibility
- 🔒 **Security**: Helmet, CORS, rate limiting, input validation with Zod
- 📊 **Observability**: Structured logging with Pino, request tracing, health endpoints, metrics
- 🌍 **Internationalization**: English and French error messages
- 📚 **Documentation**: OpenAPI 3.1 specification with Swagger UI
- 🐳 **Docker**: Multi-stage Dockerfile and docker-compose setup
- ✅ **Testing**: 80%+ test coverage with Vitest and Supertest
- 🚀 **CI/CD**: GitHub Actions workflow with Node.js 18 and 20

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌───────────────────────────────┐  │
│  │  Middleware Stack             │  │
│  │  - Security (Helmet, CORS)    │  │
│  │  - Rate Limiting              │  │
│  │  - Request Logging            │  │
│  │  - Error Handling             |  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────────┐  ┌──────────┐         │
│  │  Routes  │→ │Controllers│        │
│  └──────────┘  └────┬──────┘        │
│                     │               │
│  ┌──────────────────▼──────────────┐│
│  │         Services                ││
│  │  - USDA Service                 ││
│  │  - Validation Service           │|
│  └─────────────────────────────────┘│
│                     │               |
│  ┌──────────────────▼──────────────┐│
│  │         Domain Types            ││
│  │  - Zod Schemas                  │|
│  │  - TypeScript Types             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │   USDA API   │
    └──────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20 LTS or higher
- npm or yarn
- USDA API key ([Get one here](https://fdc.nal.usda.gov/api-guide.html))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JohanLiebertTheRealOne/LabelGuard-API
cd labelguard-api
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
USDA_API_KEY=your_usda_api_key_here
PORT=3000
NODE_ENV=development
```

5. Start development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `USDA_API_KEY` | USDA FoodData Central API key | - | Yes |
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `CORS_ORIGIN` | Comma-separated allowed origins | - | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) | No |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | No |
| `TRUST_PROXY` | Trust reverse proxy (`true`/`false`) | `false` | No |

## API Endpoints

### Health Check

```http
GET /health
```

Returns server status, uptime, and timestamp.

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Additional endpoints:
- `GET /health/liveness` - Liveness probe
- `GET /health/readiness` - Readiness probe
- `GET /health/metrics` - Simple metrics export

### Search Foods

```http
GET /foods?q={query}&limit={limit}&dataType={types}
```

Search for foods in USDA FoodData Central.

**Query Parameters:**
- `q` (required): Search query (food name or type)
- `limit` (optional): Maximum results (1-50, default: 10)
- `dataType` (optional): Filter by data type (comma-separated: `Branded`, `SR Legacy`, `Survey (FNDDS)`, `Foundation`)

**Example:**
```bash
curl "http://localhost:3000/foods?q=greek%20yogurt&limit=5"
```

**Response:**
```json
{
  "items": [
    {
      "fdcId": 173430,
      "description": "Yogurt, Greek, plain, lowfat",
      "dataType": "SR Legacy",
      "servingSize": 170,
      "servingSizeUnit": "g",
      "caloriesKcal": 73,
      "macros": {
        "proteinG": 10,
        "fatG": 1.92,
        "carbsG": 3.87
      }
    }
  ],
  "meta": {
    "totalHits": 25,
    "limit": 5
  }
}
```

### Validate Label

```http
POST /labels/validate
```

Validate a food label for compliance issues.

**Request Body:**
```json
{
  "labelText": "Ingredients: milk, cultures. Contains live cultures.",
  "declaredAllergens": ["milk"],
  "servingSize": {
    "value": 170,
    "unit": "g"
  },
  "referenceFoodQuery": "greek yogurt",
  "claimTexts": ["high protein", "low fat"],
  "markets": ["US"]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/labels/validate \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: milk, cultures.",
    "declaredAllergens": ["milk"],
    "servingSize": { "value": 170, "unit": "g" }
  }'
```

**Response:**
```json
{
  "valid": false,
  "issues": [
    {
      "id": "CONTAINS_SECTION_MISSING",
      "severity": "low",
      "category": "format",
      "message": "Ingredients list found but no explicit 'Contains:' allergen statement.",
      "hint": "Add an explicit 'Contains:' section listing all major allergens present."
    }
  ],
  "summary": {
    "allergensFound": ["milk"],
    "totalIssues": 1
  }
}
```

## Error Format

All errors follow RFC 7807 Problem Details format:

```json
{
  "type": "https://labelguard.api/errors/BAD_REQUEST",
  "title": "Validation failed",
  "status": 400,
  "detail": "Invalid request data",
  "instance": "/foods",
  "code": "BAD_REQUEST",
  "traceId": "1234567890-abc123",
  "errors": {
    "q": "Search query 'q' is required"
  }
}
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run coverage
```

Coverage threshold: **80%**

## Docker

### Build

```bash
docker-compose build
```

### Run

```bash
docker-compose up -d
```

### Stop

```bash
docker-compose down
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Type check without building
- `npm test` - Run tests
- `npm run coverage` - Generate coverage report

### Project Structure

```
src/
├── index.ts              # Application entry point
├── server.ts             # Express app factory
├── config/
│   └── env.ts            # Environment configuration
├── middleware/
│   ├── errorHandler.ts   # Error handling middleware
│   ├── requestLogger.ts  # Request logging
│   ├── security.ts       # Security headers
│   ├── rateLimit.ts      # Rate limiting
│   └── notFound.ts       # 404 handler
├── utils/
│   ├── http.ts           # HTTP error utilities
│   ├── tracing.ts        # Request ID tracing
│   └── metrics.ts        # Metrics collection
├── domain/
│   ├── food.ts           # Food domain types
│   └── validation.ts     # Validation domain types
├── services/
│   ├── usdaService.ts    # USDA API integration
│   └── validationService.ts # Label validation logic
├── controllers/
│   ├── healthController.ts
│   ├── foodsController.ts
│   └── labelsController.ts
├── routes/
│   ├── health.ts
│   ├── foods.ts
│   └── labels.ts
├── i18n/
│   └── messages.ts       # Internationalization
└── docs/
    └── openapi.yaml      # OpenAPI specification

test/
├── unit/                 # Unit tests
└── integration/          # Integration tests
```

## Documentation

Interactive API documentation is available at `/docs` when the server is running.

## Security

### Threat Model & Mitigations

1. **Input Validation**
   - All inputs validated with Zod schemas
   - Request body size limit (1MB)
   - Query parameter validation

2. **Rate Limiting**
   - Default: 100 requests per 15 minutes
   - Strict: 50 requests per 15 minutes (validation endpoint)

3. **Security Headers**
   - Helmet.js configured with safe defaults
   - CORS allowlist via environment variable
   - X-Powered-By header disabled

4. **Error Handling**
   - No stack traces in production
   - RFC 7807 error format
   - Request tracing with traceId

5. **Timeouts**
   - 8 second timeout for USDA API requests
   - Graceful shutdown with connection draining

6. **Secrets Management**
   - No secrets in repository
   - Environment variables for configuration
   - Docker secrets support

## Deployment

### Vercel (Recommended)

**Quick Deploy:**

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel` (follow prompts)
4. Set environment variables in Vercel dashboard:
   - `USDA_API_KEY` (required)
   - `CORS_ORIGIN` (optional)
   - `RATE_LIMIT_WINDOW_MS` (optional)
   - `RATE_LIMIT_MAX` (optional)
   - `TRUST_PROXY` (optional, set to `true` if needed)

**Via Vercel Dashboard:**

1. Import your GitHub repository in [Vercel Dashboard](https://vercel.com/dashboard)
2. Vercel will auto-detect the project settings
3. Add environment variables:
   - Go to Project Settings → Environment Variables
   - Add: `USDA_API_KEY` with your API key
   - Optionally add other variables (CORS_ORIGIN, etc.)
4. Click "Deploy"

**Important Notes:**
- The API is configured as a serverless function in `api/index.ts`
- Environment variables must be set in Vercel dashboard (not `.env`)
- Vercel automatically handles HTTPS and CDN
- Cold starts may add ~100-500ms latency on first request

**Local Vercel Testing:**
```bash
vercel dev
```
This runs your app locally with Vercel's serverless environment.

### Render

1. Connect your repository
2. Set environment variables
3. Build command: `npm run build`
4. Start command: `npm start`

### Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Set secrets: `fly secrets set USDA_API_KEY=your_key`

### Heroku

1. Install Heroku CLI
2. Create app: `heroku create`
3. Set config: `heroku config:set USDA_API_KEY=your_key`
4. Deploy: `git push heroku main`

## Limitations & Legal Disclaimer

⚠️ **Important**: This API provides heuristic-based validation and is **NOT legal advice**. 

- Validation rules are simplified heuristics for educational purposes
- Actual food labeling regulations are complex and jurisdiction-specific
- Always consult with regulatory experts for production compliance decisions
- USDA data may have limitations and should be verified independently

## Internationalization

Currently supported languages:
- English (en) - Default
- French (fr)

Error messages are localized based on the `Accept-Language` header (future enhancement).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## FAQ

**Q: Why is my USDA search returning empty results?**  
A: Verify your `USDA_API_KEY` is valid and check the search query spelling.

**Q: How do I increase rate limits?**  
A: Adjust `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` environment variables.

**Q: Can I add custom validation rules?**  
A: Yes, extend `validationService.ts` with additional rule functions.

**Q: How do I enable CORS?**  
A: Set `CORS_ORIGIN` environment variable with comma-separated allowed origins.

## Troubleshooting

### Server won't start
- Check that `USDA_API_KEY` is set
- Verify port 3000 is available
- Check logs for configuration errors

### Tests failing
- Ensure `USDA_API_KEY` is set (even for mocked tests)
- Run `npm run typecheck` to verify TypeScript compilation
- Check test coverage threshold (80%)

### Docker build fails
- Ensure Docker is running
- Check Dockerfile syntax
- Verify base image availability

## License

MIT

## Support

For issues and questions, please open a GitHub issue.

