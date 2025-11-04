# Plan d'Implémentation - LabelGuard API

Plan complet pour l'implémentation des features A-H, adapté à la structure actuelle de la codebase.

## 📋 Vue d'ensemble de la codebase actuelle

### Structure existante
```
src/
├── index.ts              # Point d'entrée
├── server.ts             # Factory Express app
├── config/
│   └── env.ts            # Configuration environnement
├── middleware/
│   ├── errorHandler.ts   # Gestion erreurs RFC 7807
│   ├── requestLogger.ts  # Logging avec Pino
│   ├── security.ts       # Helmet + CORS
│   ├── rateLimit.ts      # Rate limiting (express-rate-limit)
│   └── notFound.ts       # 404 handler
├── controllers/
│   ├── healthController.ts
│   ├── foodsController.ts
│   └── labelsController.ts
├── routes/
│   ├── health.ts
│   ├── foods.ts
│   └── labels.ts
├── services/
│   ├── usdaService.ts    # Client USDA (utilise fetch)
│   └── validationService.ts
├── domain/
│   ├── food.ts           # Types Zod + FoodSummary
│   └── validation.ts     # ValidationRequestSchema + Issue
├── utils/
│   ├── http.ts           # HttpError, HttpErrors
│   ├── tracing.ts        # Request ID (basique)
│   └── metrics.ts        # Métriques simples
├── i18n/
│   └── messages.ts       # Messages EN/FR (basique)
└── docs/
    ├── openapi.yaml
    └── openapiSpec.ts    # Spec embarquée
```

### Stack technique actuelle
- Node 20+, TypeScript, Express
- Zod pour validation
- Pino pour logging
- Vitest + Supertest pour tests
- OpenAPI 3.1 (embarqué)
- Helmet, CORS, rate limiting basique

---

## 🎯 Ordre d'implémentation recommandé

**Phase 1 - Fondations** (nécessaire pour le reste)
- **A. API & Contrat** (versioning, pagination, caching)
- **B. Robustesse** (retry, circuit breaker)

**Phase 2 - Sécurité & Observabilité**
- **C. Sécurité** (API keys, Zod strict, headers)
- **D. Observabilité** (Prometheus, OTel, health enrichi)

**Phase 3 - Fonctionnalités avancées**
- **E. I18n & Conformité** (moteur règles multi-marchés)
- **F. Documentation & DX** (génération OpenAPI, SDK)

**Phase 4 - Qualité & Déploiement**
- **G. Tests & Qualité** (property tests, mocks, seuils)
- **H. Déploiement** (Vercel durci, Docker rootless)

---

## 📦 Feature A: API & Contrat

### Objectifs
- Versionnage `/v1` + header `X-API-Version`
- Pagination cursor+limit (par défaut) et page+pageSize (fallback)
- Cache HTTP (Cache-Control, ETag/Last-Modified)
- Cache applicatif LRU/Redis/Vercel KV

### Fichiers à créer

```
src/middleware/
  └── versioning.ts          # Middleware version API
  └── httpCache.ts           # Cache HTTP (ETag, Cache-Control)

src/pagination/
  ├── index.ts               # Utilitaires pagination
  ├── cursor.ts              # Encodage/décodage cursor
  └── page.ts                # Pagination page/pageSize

src/cache/
  ├── index.ts               # Interface CacheProvider
  ├── lru.ts                 # Impl LRU in-memory
  ├── kv.ts                  # Impl Vercel KV (optionnel)
  └── redis.ts               # Impl Redis (optionnel)

src/routes/v1/
  ├── index.ts               # Router v1
  ├── foods.ts               # Routes /v1/foods
  └── labels.ts              # Routes /v1/labels
```

### Fichiers à modifier

```
src/config/env.ts            # Ajouter CACHE_BACKEND, CACHE_TTL, etc.
src/server.ts                # Ajouter router /v1, middleware versioning
src/controllers/foodsController.ts  # Adapter pagination + cache
src/services/usdaService.ts  # Intégrer cache applicatif
```

### Étapes détaillées

#### 1. Versionnage (2-3h)

**1.1. Créer `src/middleware/versioning.ts`**
```typescript
export function apiVersioning(req: Request, res: Response, next: NextFunction) {
  // Force X-API-Version: 1 si absent
  const requestedVersion = req.headers['x-api-version'] || '1';
  res.setHeader('X-API-Version', '1');
  req.apiVersion = requestedVersion;
  next();
}
```

**1.2. Créer `src/routes/v1/index.ts`**
```typescript
import { Router } from 'express';
import foodsRoutes from './foods.js';
import labelsRoutes from './labels.js';

const router = Router();
router.use('/foods', foodsRoutes);
router.use('/labels', labelsRoutes);
export default router;
```

**1.3. Modifier `src/server.ts`**
```typescript
import v1Routes from './routes/v1/index.js';
import { apiVersioning } from './middleware/versioning.js';

// Après security middleware
app.use('/v1', apiVersioning, v1Routes);

// Garder routes legacy (deprecated warning)
app.use('/foods', (req, res, next) => {
  res.setHeader('X-Deprecated', 'true');
  res.setHeader('X-Deprecated-Since', '2024-01-01');
  res.setHeader('X-Migration-Path', '/v1/foods');
  next();
}, foodsRoutes);
```

#### 2. Pagination (3-4h)

**2.1. Créer `src/pagination/cursor.ts`**
```typescript
export function encodeCursor(data: { lastId: number; lastScore?: number }): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): { lastId: number; lastScore?: number } {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString());
  } catch {
    throw new HttpError(400, 'INVALID_CURSOR', 'Invalid cursor format');
  }
}
```

**2.2. Créer `src/pagination/page.ts`**
```typescript
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export function applyPagination<T>(
  items: T[],
  params: { limit?: number; cursor?: string; page?: number; pageSize?: number }
): { data: T[]; meta: PaginationMeta } {
  // Si cursor présent → pagination cursor
  if (params.cursor) {
    // Implémenter cursor pagination
  }
  // Si page présent → pagination offset
  else if (params.page) {
    // Implémenter page pagination
  }
  // Par défaut → cursor avec limit
  else {
    // Implémenter cursor par défaut
  }
}
```

**2.3. Modifier `src/controllers/foodsController.ts`**
```typescript
import { PaginationQuerySchema, applyPagination } from '../pagination/index.js';

export async function getFoods(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, limit, dataType, ...paginationParams } = 
      querySchema.merge(PaginationQuerySchema).parse(req.query);

    const result = await searchFoods({ q, limit, dataType });
    
    const paginated = applyPagination(result.items, paginationParams);
    
    res.json({
      data: paginated.data,
      meta: {
        ...result.meta,
        ...paginated.meta,
      }
    });
  } catch (error) {
    next(error);
  }
}
```

#### 3. Cache HTTP (2-3h)

**3.1. Créer `src/middleware/httpCache.ts`**
```typescript
import { createHash } from 'crypto';
import stableStringify from 'fast-json-stable-stringify';

export function httpCache(maxAge = 60, staleWhileRevalidate = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(body) {
      // Calculer ETag faible (hash du body)
      const bodyStr = stableStringify(body);
      const etag = `W/"${createHash('md5').update(bodyStr).digest('hex')}"`;
      
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 
        `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      );
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      // Vérifier If-None-Match
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch === etag) {
        return res.status(304).end();
      }
      
      return originalJson(body);
    };
    
    next();
  };
}
```

**3.2. Appliquer dans `src/routes/v1/foods.ts`**
```typescript
import { httpCache } from '../../middleware/httpCache.js';

router.get('/', httpCache(60, 300), getFoods);
```

#### 4. Cache applicatif (4-5h)

**4.1. Créer `src/cache/index.ts`**
```typescript
export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

**4.2. Créer `src/cache/lru.ts`**
```typescript
import { LRUCache } from 'lru-cache';
import type { CacheProvider } from './index.js';

export class LRUCacheProvider implements CacheProvider {
  private cache: LRUCache<string, unknown>;

  constructor(options: { maxSize?: number; ttl?: number } = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 1000,
      ttl: options.ttl || 60_000,
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.cache.set(key, value, { ttl: ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
```

**4.3. Créer `src/cache/kv.ts` (Vercel KV)**
```typescript
import { kv } from '@vercel/kv';
import type { CacheProvider } from './index.js';

export class VercelKVProvider implements CacheProvider {
  async get<T>(key: string): Promise<T | undefined> {
    const value = await kv.get<T>(key);
    return value ?? undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    await kv.setex(key, Math.floor(ttlMs! / 1000), value);
  }

  // ...
}
```

**4.4. Modifier `src/config/env.ts`**
```typescript
export interface EnvConfig {
  // ... existing
  CACHE_BACKEND?: 'lru' | 'kv' | 'redis';
  CACHE_TTL_MS?: number;
  CACHE_MAX_SIZE?: number;
  REDIS_URL?: string;
}
```

**4.5. Modifier `src/services/usdaService.ts`**
```typescript
import { getCacheProvider } from '../cache/index.js';

const cache = getCacheProvider(); // Factory basée sur CACHE_BACKEND

export async function searchFoods(params: SearchParams): Promise<SearchResult> {
  const cacheKey = `usda:search:${JSON.stringify(params)}`;
  
  // Vérifier cache
  const cached = await cache.get<SearchResult>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Appel USDA
  const result = await fetchFromUSDA(params);
  
  // Mettre en cache
  await cache.set(cacheKey, result, config.CACHE_TTL_MS);
  
  return result;
}
```

### Tests à ajouter

```
test/integration/
  └── v1/
      ├── foods.pagination.spec.ts    # Tests cursor/page pagination
      └── foods.cache.spec.ts         # Tests ETag, 304, Cache-Control

test/unit/
  ├── pagination/
  │   ├── cursor.spec.ts
  │   └── page.spec.ts
  └── cache/
      ├── lru.spec.ts
      └── kv.spec.ts (si applicable)
```

### Dépendances à installer

```bash
npm i lru-cache fast-json-stable-stringify
npm i -D @types/lru-cache
# Optionnel:
npm i @vercel/kv                    # Pour Vercel KV
npm i ioredis @types/ioredis        # Pour Redis
```

### Definition of Done
- ✅ Routes `/v1/*` fonctionnent avec `X-API-Version: 1`
- ✅ Pagination cursor retourne `nextCursor` valide
- ✅ Pagination page retourne `totalPages` valide
- ✅ `If-None-Match` retourne 304
- ✅ Cache applicatif réduit les appels USDA (visible en logs)
- ✅ Tests e2e passent

---

## 🔄 Feature B: Robustesse aux pannes

### Objectifs
- Retry avec backoff exponentiel + jitter
- Circuit breaker (closed → open → half-open)
- Keep-alive via undici dispatcher
- Annulation avec AbortController

### Fichiers à créer

```
src/resilience/
  ├── index.ts               # Exports
  ├── retry.ts               # Logique retry
  ├── circuitBreaker.ts      # Circuit breaker
  └── httpClient.ts          # Client HTTP avec keep-alive
```

### Fichiers à modifier

```
src/services/usdaService.ts  # Intégrer retry + circuit breaker
src/server.ts                # Bridge AbortController
src/config/env.ts            # Config retry/breaker
```

### Étapes détaillées

#### 1. Retry avec backoff (2-3h)

**1.1. Créer `src/resilience/retry.ts`**
```typescript
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  retryableErrors?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    jitter = true,
    retryableErrors = isRetryableError,
  } = options;

  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      
      if (!retryableErrors(error) || attempt === maxAttempts) {
        throw error;
      }
      
      const delay = calculateBackoff(attempt, initialDelayMs, maxDelayMs, jitter);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

function calculateBackoff(attempt: number, initial: number, max: number, jitter: boolean): number {
  const exponential = Math.min(initial * Math.pow(2, attempt - 1), max);
  if (jitter) {
    return exponential + Math.random() * 100;
  }
  return exponential;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status >= 500 || error.status === 429;
  }
  // ECONNRESET, ETIMEDOUT, etc.
  return true;
}
```

#### 2. Circuit Breaker (3-4h)

**2.1. Créer `src/resilience/circuitBreaker.ts`**
```typescript
export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  coolDownMs?: number;
  halfOpenMaxAttempts?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime?: number;
  private halfOpenAttempts = 0;

  constructor(
    private key: string,
    private options: CircuitBreakerOptions = {}
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > (this.options.coolDownMs || 20000)) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      } else {
        throw new HttpError(503, 'CIRCUIT_OPEN', 'Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.halfOpenAttempts = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= (this.options.halfOpenMaxAttempts || 2)) {
        this.state = 'open';
      }
    } else if (this.failures >= (this.options.failureThreshold || 5)) {
      this.state = 'open';
    }
  }
}
```

#### 3. HTTP Client avec keep-alive (2h)

**3.1. Créer `src/resilience/httpClient.ts`**
```typescript
import { Agent, setGlobalDispatcher, ProxyAgent } from 'undici';

// Dispatcher global avec keep-alive
const dispatcher = new Agent({
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 300_000,
  connections: 100,
});

setGlobalDispatcher(dispatcher);

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number; signal?: AbortSignal } = {}
): Promise<Response> {
  const { timeout = 8000, signal, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Combiner signaux
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      dispatcher, // Utiliser dispatcher global
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

#### 4. Intégration dans USDA Service (2h)

**4.1. Modifier `src/services/usdaService.ts`**
```typescript
import { withRetry } from '../resilience/retry.js';
import { CircuitBreaker } from '../resilience/circuitBreaker.js';
import { fetchWithTimeout } from '../resilience/httpClient.js';

const usdaBreaker = new CircuitBreaker('usda', {
  failureThreshold: 5,
  coolDownMs: 20_000,
});

export async function searchFoods(params: SearchParams): Promise<SearchResult> {
  return usdaBreaker.execute(() =>
    withRetry(
      async () => {
        const response = await fetchWithTimeout(usdaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          timeout: 8000,
        });
        // ... reste du code
      },
      {
        maxAttempts: 3,
        retryableErrors: (err) => err instanceof HttpError && err.status >= 500,
      }
    )
  );
}
```

#### 5. Annulation requêtes (2h)

**5.1. Modifier `src/server.ts`**
```typescript
app.use((req, res, next) => {
  const abortController = new AbortController();
  req.abortSignal = abortController.signal;
  
  req.on('close', () => {
    if (!res.headersSent) {
      abortController.abort();
    }
  });
  
  next();
});
```

**5.2. Modifier `src/controllers/foodsController.ts`**
```typescript
export async function getFoods(req: Request, res: Response, next: NextFunction) {
  try {
    // Vérifier si requête annulée
    if (req.abortSignal?.aborted) {
      return res.status(499).json({ error: 'Client Closed Request' });
    }
    
    const result = await searchFoods(params, { signal: req.abortSignal });
    // ...
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(499).json({ error: 'Request cancelled' });
    }
    next(error);
  }
}
```

### Tests à ajouter

```
test/unit/resilience/
  ├── retry.spec.ts
  └── circuitBreaker.spec.ts

test/integration/
  └── usda.resilience.spec.ts        # Tests retry + breaker
```

### Dépendances
```bash
npm i undici  # Déjà présent
```

### Definition of Done
- ✅ Retry visible en logs (niveau debug)
- ✅ Circuit breaker s'ouvre après 5 échecs
- ✅ Half-open teste 2 requêtes max
- ✅ Annulation ferme requête USDA et répond <50ms

---

## 🔒 Feature C: Sécurité

### Objectifs
- API keys avec validation
- Rate limiting par clé API (rate-limiter-flexible)
- Pino redaction (masquer secrets)
- Zod validation stricte
- Headers sécurité renforcés

### Fichiers à créer

```
src/middleware/
  └── apiKeyAuth.ts         # Validation API keys

src/validation/
  └── query.zod.ts          # Schemas Zod stricts

src/logger/
  └── pino.ts               # Logger avec redaction
```

### Fichiers à modifier

```
src/middleware/rateLimit.ts  # Adapter pour API keys
src/middleware/security.ts   # Headers renforcés
src/logger.ts                # Utiliser logger redacté
src/config/env.ts            # API_KEYS, etc.
```

### Étapes détaillées

#### 1. API Keys (3h)

**1.1. Créer `src/middleware/apiKeyAuth.ts`**
```typescript
import { HttpErrors } from '../utils/http.js';
import { getConfig } from '../config/env.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key']?.toString();
  
  if (!apiKey) {
    throw HttpErrors.unauthorized('API key required', 'Missing X-Api-Key header');
  }
  
  const config = getConfig();
  const validKeys = config.API_KEYS?.split(',').map(k => k.trim()) || [];
  
  if (!validKeys.includes(apiKey)) {
    throw HttpErrors.unauthorized('Invalid API key', 'API key not found');
  }
  
  req.apiKey = apiKey;
  next();
}
```

**1.2. Modifier `src/config/env.ts`**
```typescript
export interface EnvConfig {
  // ... existing
  API_KEYS?: string; // CSV
  REQUIRE_API_KEY?: boolean;
}
```

#### 2. Rate Limiting par clé (4h)

**2.1. Modifier `src/middleware/rateLimit.ts`**
```typescript
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

let limiter: RateLimiterMemory | RateLimiterRedis;

export function createRateLimiter(options: {
  points: number;
  duration: number;
}) {
  const config = getConfig();
  
  if (config.REDIS_URL) {
    limiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: options.points,
      duration: options.duration,
    });
  } else {
    limiter = new RateLimiterMemory({
      points: options.points,
      duration: options.duration,
    });
  }
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.apiKey || req.ip; // API key ou IP fallback
    
    try {
      const rateLimiterRes = await limiter.consume(key);
      
      res.setHeader('RateLimit-Limit', options.points);
      res.setHeader('RateLimit-Remaining', rateLimiterRes.remainingPoints);
      res.setHeader('RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext));
      
      next();
    } catch (rateLimiterRes) {
      const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
      res.setHeader('Retry-After', retryAfter);
      throw HttpErrors.tooManyRequests('Rate limit exceeded', `Retry after ${retryAfter} seconds`);
    }
  };
}
```

#### 3. Pino Redaction (2h)

**3.1. Créer `src/logger/pino.ts`**
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.query.q',
      'req.body.labelText',
      '*.apiKey',
      '*.password',
      '*.token',
    ],
    remove: true,
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
      // ... autres champs safe
    }),
  },
});
```

#### 4. Zod Validation Stricte (2h)

**4.1. Créer `src/validation/query.zod.ts`**
```typescript
export const StrictFoodQuerySchema = z.object({
  q: z.string().min(1).max(128),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  dataType: z.enum(['Branded', 'SR Legacy', 'Survey (FNDDS)', 'Foundation']).optional(),
  cursor: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
});

export const StrictValidationSchema = z.object({
  labelText: z.string().min(1).max(10_000),
  declaredAllergens: z.array(z.string()).max(20).optional(),
  servingSize: z.object({
    value: z.number().positive().max(10000),
    unit: z.string().min(1).max(20),
  }).optional(),
  // ...
});
```

**4.2. Modifier `src/middleware/errorHandler.ts`**
```typescript
// Pour erreurs Zod → 422 au lieu de 400
if (err instanceof ZodError) {
  return res.status(422).json({
    type: 'https://labelguard.api/errors/VALIDATION_ERROR',
    title: 'Validation Error',
    status: 422,
    detail: 'Request validation failed',
    errors: formatZodErrors(err),
  });
}
```

#### 5. Headers Sécurité (1h)

**5.1. Modifier `src/middleware/security.ts`**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      // ... existing
      reportOnly: process.env.CSP_REPORT_ONLY === '1',
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  permissionsPolicy: {
    geolocation: [],
    camera: [],
    microphone: [],
  },
}));
```

### Tests à ajouter

```
test/integration/
  └── security.spec.ts       # API keys, rate limit, validation
```

### Dépendances
```bash
npm i rate-limiter-flexible
npm i -D @types/rate-limiter-flexible
```

### Definition of Done
- ✅ 401 sans clé API (si REQUIRE_API_KEY=true)
- ✅ 429 avec Retry-After et headers RFC 9239
- ✅ Logs ne contiennent jamais secrets
- ✅ 422 pour erreurs Zod avec détails

---

## 📊 Feature D: Observabilité

### Objectifs
- Métriques Prometheus (`/metrics`)
- Health/readiness enrichi
- Tracing OpenTelemetry
- TraceId dans logs et réponse

### Fichiers à créer

```
src/observability/
  ├── metrics.ts             # Prometheus métriques
  ├── tracing.ts             # Setup OTel
  └── health.ts              # Health enrichi
```

### Fichiers à modifier

```
src/controllers/healthController.ts  # Enrichir
src/server.ts                        # Init metrics/tracing
src/middleware/requestLogger.ts      # Inject traceId
```

### Étapes détaillées

#### 1. Prometheus Metrics (3h)

**1.1. Créer `src/observability/metrics.ts`**
```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  registers: [register],
});

export const dependencyUp = new Gauge({
  name: 'dependency_up',
  help: 'Dependency availability',
  labelNames: ['target'],
  registers: [register],
});

export function getMetrics() {
  return register.metrics();
}
```

**1.2. Ajouter route `/metrics`**
```typescript
// Dans src/routes/health.ts
router.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getMetrics());
});
```

#### 2. Health Enrichi (2h)

**2.1. Modifier `src/controllers/healthController.ts`**
```typescript
export async function getHealth(_req: Request, res: Response) {
  const usdaStatus = await checkUSDAAvailability();
  
  res.json({
    status: 'ok',
    version: process.env.BUILD_VERSION || 'unknown',
    commitSha: process.env.COMMIT_SHA?.substring(0, 7) || 'unknown',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    dependencies: {
      usda: {
        status: usdaStatus.ok ? 'up' : 'down',
        avgLatencyMs: usdaStatus.latency,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
```

#### 3. OpenTelemetry Tracing (4h)

**3.1. Créer `src/observability/tracing.ts`**
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export function initTracing() {
  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  });
  
  sdk.start();
  
  return sdk;
}
```

**3.2. Modifier `src/middleware/requestLogger.ts`**
```typescript
import { trace } from '@opentelemetry/api';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId || generateRequestId();
  
  req.traceId = traceId;
  res.setHeader('Trace-Id', traceId);
  
  logger.info({
    traceId,
    spanId: span?.spanContext().spanId,
    // ...
  }, 'Incoming request');
  
  next();
}
```

### Tests à ajouter

```
test/integration/
  └── observability.spec.ts  # Métriques, health, tracing
```

### Dépendances
```bash
npm i prom-client
npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/api
```

### Definition of Done
- ✅ `/metrics` retourne métriques Prometheus
- ✅ `/health` retourne version/sha/dependencies
- ✅ Logs contiennent traceId
- ✅ Réponse contient header `Trace-Id`

---

## 🌍 Feature E: I18n & Conformité

### Objectifs
- Moteur de règles plug-in par marché (US, EU, FR)
- Messages localisés (Accept-Language)
- Payload enrichi par marché

### Fichiers à créer

```
src/rules/
  ├── engine.ts              # Moteur règles
  ├── base.ts                # Interface Rule
  ├── us/
  │   └── index.ts           # Règles US (FDA)
  ├── eu/
  │   └── index.ts           # Règles EU (INCO)
  └── fr/
      └── index.ts           # Règles FR

src/i18n/
  ├── index.ts               # Négociation langue
  └── locales/
      ├── en.json
      └── fr.json
```

### Fichiers à modifier

```
src/services/validationService.ts  # Intégrer moteur règles
src/controllers/labelsController.ts # Multi-marchés
```

### Étapes détaillées

#### 1. Moteur de Règles (6h)

**1.1. Créer `src/rules/base.ts`**
```typescript
export interface Rule {
  id: string;
  market: 'US' | 'EU' | 'FR';
  applies(input: ValidationInput): boolean;
  evaluate(input: ValidationInput, context?: Context): Issue[];
}
```

**1.2. Créer `src/rules/us/index.ts`**
```typescript
export const usRules: Rule[] = [
  {
    id: 'ALLERGEN_MISSING',
    market: 'US',
    applies: (input) => hasAllergens(input.labelText),
    evaluate: (input) => {
      // Vérifier 9 allergènes US (FDA)
      // ...
    },
  },
  // ... autres règles US
];
```

**1.3. Créer `src/rules/engine.ts`**
```typescript
export function evaluateRules(
  input: ValidationInput,
  markets: string[]
): ValidationReport {
  const issues: Issue[] = [];
  
  for (const market of markets) {
    const rules = getRulesForMarket(market);
    for (const rule of rules) {
      if (rule.applies(input)) {
        issues.push(...rule.evaluate(input));
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    markets,
  };
}
```

#### 2. I18n (3h)

**2.1. Créer `src/i18n/index.ts`**
```typescript
import { parseAcceptLanguage } from 'accept-language-parser';

export function getLocale(req: Request): string {
  const acceptLang = req.headers['accept-language'] || 'en';
  const parsed = parseAcceptLanguage(acceptLang);
  const preferred = parsed[0]?.code || 'en';
  return ['en', 'fr'].includes(preferred) ? preferred : 'en';
}

export function t(key: string, locale: string, ...args: string[]): string {
  const messages = loadMessages(locale);
  let message = messages[key] || messages[key.split('.')[0]] || key;
  args.forEach((arg, i) => {
    message = message.replace(`{${i}}`, arg);
  });
  return message;
}
```

### Tests à ajouter

```
test/unit/rules/
  ├── us.spec.ts
  ├── eu.spec.ts
  └── fr.spec.ts

test/integration/
  └── i18n.spec.ts
```

### Dépendances
```bash
npm i accept-language-parser
```

---

## 📚 Feature F: Documentation & DX

### Objectifs
- Générer OpenAPI depuis Zod
- SDK TypeScript généré
- Collections Postman/Insomnia
- Tests contractuels

### Fichiers à créer

```
scripts/
  ├── openapi.ts             # Génération OpenAPI
  └── sdk.ts                 # Génération SDK

docs/
  └── ERRORS.md              # Scénarios d'erreurs

sdk/                         # SDK généré (gitignored)
  └── ...

.github/workflows/
  └── contract.yml           # Tests contractuels
```

### Étapes détaillées

#### 1. Génération OpenAPI (4h)

**1.1. Créer `scripts/openapi.ts`**
```typescript
import { OpenAPIRegistry, OpenAPIGenerator } from '@asteasolutions/zod-to-openapi';
import { foodSchema, validationSchema } from '../src/domain/...';

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'get',
  path: '/v1/foods',
  request: {
    query: foodQuerySchema,
  },
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: foodSearchResponseSchema,
        },
      },
    },
  },
});

const generator = new OpenAPIGenerator(registry.definitions);
const spec = generator.generateDocument({
  info: {
    title: 'LabelGuard API',
    version: '1.0.0',
  },
});
```

**1.2. Ajouter script `package.json`**
```json
{
  "scripts": {
    "openapi:gen": "tsx scripts/openapi.ts > openapi.yaml"
  }
}
```

#### 2. SDK TypeScript (3h)

**2.1. Créer `scripts/sdk.ts`**
```typescript
import { generate } from 'openapi-typescript-codegen';
import { input } from './openapi.yaml';

await generate({
  input,
  output: './sdk',
  httpClient: 'fetch',
});
```

### Dépendances
```bash
npm i -D @asteasolutions/zod-to-openapi openapi-typescript-codegen
npm i -D @stoplight/prism-cli  # Pour tests contractuels
```

---

## ✅ Feature G: Tests & Qualité

### Objectifs
- Property-based testing
- Mocks USDA (MSW)
- Seuils couverture par répertoire
- CI sécurité (CodeQL, npm audit)

### Fichiers à créer

```
test/property/
  └── validation.spec.ts     # Tests propriétés

test/mocks/
  └── usda.mock.ts           # Handlers MSW

.github/workflows/
  ├── codeql.yml
  └── security.yml
```

### Étapes détaillées

#### 1. Property-Based Testing (3h)

**1.1. Créer `test/property/validation.spec.ts`**
```typescript
import fc from 'fast-check';
import { validateLabel } from '../../src/services/validationService';

test('allergens found ⊆ declared + undeclared', () => {
  fc.assert(
    fc.property(
      fc.string(), // labelText
      fc.array(fc.string()), // declaredAllergens
      (labelText, declaredAllergens) => {
        const report = validateLabel({ labelText, declaredAllergens });
        // Propriété: tous les allergènes trouvés sont déclarés ou dans issues
        // ...
      }
    )
  );
});
```

#### 2. MSW Mocks (2h)

**2.1. Créer `test/mocks/usda.mock.ts`**
```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('https://api.nal.usda.gov/fdc/v1/foods/search', () => {
    return HttpResponse.json({
      foods: [/* mock data */],
      totalHits: 10,
    });
  }),
];
```

#### 3. Seuils Couverture (1h)

**3.1. Modifier `vitest.config.ts`**
```typescript
export default defineConfig({
  coverage: {
    thresholds: {
      'src/domain/**': { lines: 90, functions: 90 },
      'src/services/**': { lines: 90, functions: 90 },
      global: { lines: 80, functions: 80 },
    },
  },
});
```

### Dépendances
```bash
npm i -D fast-check msw
```

---

## 🐳 Feature H: Déploiement

### Objectifs
- Durcir Vercel (KV cache)
- Docker rootless + HEALTHCHECK
- Documentation déploiement

### Fichiers à créer/modifier

```
Dockerfile                    # Multi-stage, rootless
docker-compose.yml            # Mise à jour
docker/entrypoint.sh          # Entrypoint sécurisé
docs/DEPLOYMENT.md            # Guide déploiement
vercel.json                   # Config KV
```

### Étapes détaillées

#### 1. Docker Rootless (3h)

**1.1. Modifier `Dockerfile`**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production

USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "dist/index.js"]
```

### Dépendances
Aucune nouvelle dépendance nécessaire.

---

## 📅 Timeline suggérée

### Semaine 1-2: Phase 1 (Fondations)
- **Jour 1-3**: Feature A (versioning, pagination)
- **Jour 4-5**: Feature A (caching HTTP)
- **Jour 6-8**: Feature A (cache applicatif)
- **Jour 9-10**: Feature B (retry, circuit breaker)
- **Jour 11-12**: Feature B (keep-alive, annulation)

### Semaine 3: Phase 2 (Sécurité & Observabilité)
- **Jour 1-3**: Feature C (API keys, rate limiting)
- **Jour 4-5**: Feature C (redaction, validation stricte)
- **Jour 6-8**: Feature D (Prometheus, health enrichi)
- **Jour 9-10**: Feature D (OpenTelemetry)

### Semaine 4: Phase 3 (Fonctionnalités avancées)
- **Jour 1-5**: Feature E (moteur règles multi-marchés)
- **Jour 6-8**: Feature F (génération OpenAPI, SDK)
- **Jour 9-10**: Feature F (collections, tests contractuels)

### Semaine 5: Phase 4 (Qualité & Déploiement)
- **Jour 1-3**: Feature G (property tests, mocks)
- **Jour 4-5**: Feature G (CI sécurité)
- **Jour 6-8**: Feature H (Docker, Vercel)
- **Jour 9-10**: Tests finaux, documentation

---

## 🔗 Dépendances entre features

```
A (API/Contrat)
  └─> B (utilise cache de A pour retry)
  └─> C (utilise pagination de A)
  └─> D (métrique sur routes de A)
  └─> E (payload enrichi compatible A)

B (Robustesse)
  └─> D (métriques sur circuit breaker)

C (Sécurité)
  └─> D (métriques rate limit)

E (I18n/Conformité)
  └─> F (OpenAPI inclut règles multi-marchés)

F (Documentation)
  └─> G (tests contractuels valident OpenAPI)

H (Déploiement)
  └─> A (utilise cache KV de H)
```

---

## 📝 Notes importantes

1. **Compatibilité**: Garder routes `/foods` et `/labels` avec warning de dépréciation
2. **Migration**: Proposer période de transition 3-6 mois avant suppression routes legacy
3. **Tests**: Chaque feature doit avoir tests unitaires + intégration avant merge
4. **Documentation**: Mettre à jour README et OpenAPI à chaque feature
5. **Performance**: Monitorer impact cache/retry sur latence (objectif <200ms p95)

---

## ✅ Checklist finale

- [ ] Toutes les features implémentées
- [ ] Tests passent (>80% couverture globale, >90% domain/services)
- [ ] Documentation à jour (README, OpenAPI, DEPLOYMENT)
- [ ] CI/CD vert (tests, lint, security)
- [ ] Performance validée (latence, throughput)
- [ ] Migration guide pour clients (v0 → v1)
