/**
 * OpenAPI 3.1.0 specification for LabelGuard API
 * Embedded as TypeScript constant for reliable loading in serverless environments
 */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "LabelGuard API",
    description:
      "Production-grade REST API for USDA food search and food label validation.\nSearch foods in USDA FoodData Central, extract clean nutrition data, and validate packaging labels for compliance issues.",
    version: "1.0.0",
    contact: {
      name: "LabelGuard API Support",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NODE_ENV === "production"
        ? "https://label-guard-api.vercel.app"
        : "http://localhost:3000",
      description: process.env.VERCEL_URL
        ? "Production server"
        : process.env.NODE_ENV === "production"
        ? "Production server"
        : "Local development server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Health check and status endpoints",
    },
    {
      name: "Foods",
      description: "Search and retrieve food data from USDA FoodData Central",
    },
    {
      name: "Labels",
      description: "Validate food labels for compliance",
    },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "API root",
        description: "Returns API information and available endpoints",
        operationId: "getRoot",
        responses: {
          "200": {
            description: "API information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    version: { type: "string" },
                    description: { type: "string" },
                    endpoints: { type: "object" },
                  },
                },
                example: {
                  name: "LabelGuard API",
                  version: "1.0.0",
                  description: "Production-grade REST API for USDA food search and label validation",
                  endpoints: {
                    health: "/health",
                    foods: "/foods",
                    labels: "/labels/validate",
                    docs: "/docs",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns server status, uptime, and timestamp",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
                example: {
                  status: "ok",
                  uptime: 12345,
                  timestamp: "2024-01-01T00:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    "/health/liveness": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        description: "Kubernetes-style liveness check",
        operationId: "getLiveness",
        responses: {
          "200": {
            description: "Service is alive",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "alive" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health/readiness": {
      get: {
        tags: ["Health"],
        summary: "Readiness probe",
        description: "Kubernetes-style readiness check",
        operationId: "getReadiness",
        responses: {
          "200": {
            description: "Service is ready",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ready" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health/metrics": {
      get: {
        tags: ["Health"],
        summary: "Metrics endpoint",
        description: "Prometheus-style metrics",
        operationId: "getMetrics",
        responses: {
          "200": {
            description: "Metrics in Prometheus format",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    "/foods": {
      get: {
        tags: ["Foods"],
        summary: "Search foods",
        description:
          "Search for foods in USDA FoodData Central database.\nReturns clean nutrition data including serving size, calories, and macronutrients.",
        operationId: "searchFoods",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            description: "Search query (food name or type)",
            schema: {
              type: "string",
              minLength: 1,
              example: "greek yogurt",
            },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of results (1-50)",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 50,
              default: 10,
              example: 5,
            },
          },
          {
            name: "dataType",
            in: "query",
            required: false,
            description: "Filter by data type (comma-separated)",
            schema: {
              type: "array",
              items: {
                type: "string",
                enum: ["Branded", "SR Legacy", "Survey (FNDDS)", "Foundation"],
              },
              example: ["Branded", "SR Legacy"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/FoodSearchResponse",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
          "502": {
            $ref: "#/components/responses/BadGateway",
          },
          "503": {
            $ref: "#/components/responses/ServiceUnavailable",
          },
        },
      },
    },
    "/labels/validate": {
      post: {
        tags: ["Labels"],
        summary: "Validate food label",
        description:
          "Validate a food label for compliance issues including allergen declarations,\nserving size requirements, and claim plausibility.",
        operationId: "validateLabel",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ValidationRequest",
              },
              examples: {
                basic: {
                  summary: "Basic validation",
                  value: {
                    labelText: "Ingredients: milk, cultures. Contains live cultures.",
                    declaredAllergens: ["milk"],
                    servingSize: {
                      value: 170,
                      unit: "g",
                    },
                  },
                },
                withClaims: {
                  summary: "Validation with claims",
                  value: {
                    labelText: "Ingredients: milk, cultures. Contains live cultures.",
                    declaredAllergens: ["milk"],
                    servingSize: {
                      value: 170,
                      unit: "g",
                    },
                    referenceFoodQuery: "greek yogurt",
                    claimTexts: ["high protein", "low fat"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Validation report",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationReport",
                },
              },
            },
          },
          "400": {
            $ref: "#/components/responses/BadRequest",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        properties: {
          status: {
            type: "string",
            example: "ok",
          },
          uptime: {
            type: "integer",
            description: "Server uptime in seconds",
            example: 12345,
          },
          timestamp: {
            type: "string",
            format: "date-time",
            example: "2024-01-01T00:00:00.000Z",
          },
        },
      },
      FoodSummary: {
        type: "object",
        properties: {
          fdcId: {
            type: "integer",
            description: "USDA FoodData Central ID",
            example: 173430,
          },
          description: {
            type: "string",
            example: "Yogurt, Greek, plain, lowfat",
          },
          brandOwner: {
            type: "string",
            nullable: true,
            example: "Example Brand",
          },
          gtinUpc: {
            type: "string",
            nullable: true,
            example: "012345678901",
          },
          dataType: {
            type: "string",
            example: "SR Legacy",
          },
          servingSize: {
            type: "number",
            nullable: true,
            example: 170,
          },
          servingSizeUnit: {
            type: "string",
            nullable: true,
            example: "g",
          },
          caloriesKcal: {
            type: "number",
            nullable: true,
            example: 73,
          },
          macros: {
            type: "object",
            properties: {
              proteinG: {
                type: "number",
                nullable: true,
                example: 10,
              },
              fatG: {
                type: "number",
                nullable: true,
                example: 1.92,
              },
              carbsG: {
                type: "number",
                nullable: true,
                example: 3.87,
              },
            },
          },
        },
      },
      FoodSearchResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              $ref: "#/components/schemas/FoodSummary",
            },
          },
          meta: {
            type: "object",
            properties: {
              totalHits: {
                type: "integer",
                example: 25,
              },
              limit: {
                type: "integer",
                example: 5,
              },
            },
          },
        },
      },
      ValidationRequest: {
        type: "object",
        required: ["labelText"],
        properties: {
          labelText: {
            type: "string",
            minLength: 1,
            description: "The label text to validate",
            example: "Ingredients: milk, cultures. Contains live cultures.",
          },
          markets: {
            type: "array",
            items: {
              type: "string",
            },
            default: ["US"],
            description: "Target markets for validation",
            example: ["US"],
          },
          declaredAllergens: {
            type: "array",
            items: {
              type: "string",
            },
            description: "List of declared allergens",
            example: ["milk", "soy"],
          },
          productName: {
            type: "string",
            description: "Product name (optional)",
            example: "Greek Yogurt",
          },
          servingSize: {
            type: "object",
            properties: {
              value: {
                type: "number",
                minimum: 0,
              },
              unit: {
                type: "string",
                minLength: 1,
              },
            },
            description: "Serving size specification",
            example: {
              value: 170,
              unit: "g",
            },
          },
          referenceFoodQuery: {
            type: "string",
            description: "Optional query to fetch USDA context foods",
            example: "greek yogurt",
          },
          claimTexts: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Product claims to validate",
            example: ["high protein", "low fat"],
          },
        },
      },
      ValidationIssue: {
        type: "object",
        properties: {
          id: {
            type: "string",
            example: "ALLERGEN_MISSING",
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
            example: "high",
          },
          category: {
            type: "string",
            enum: ["allergen", "serving", "claims", "format", "ingredient"],
            example: "allergen",
          },
          message: {
            type: "string",
            example: "Detected undeclared allergen: milk",
          },
          hint: {
            type: "string",
            nullable: true,
            example: "Add a 'Contains:' statement listing all major allergens present in the product.",
          },
          regulationRef: {
            type: "string",
            nullable: true,
            example: "US 21 CFR 101.4; FALCPA",
          },
        },
      },
      ValidationReport: {
        type: "object",
        properties: {
          valid: {
            type: "boolean",
            example: false,
          },
          issues: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ValidationIssue",
            },
          },
          summary: {
            type: "object",
            properties: {
              allergensFound: {
                type: "array",
                items: {
                  type: "string",
                },
                nullable: true,
              },
              totalIssues: {
                type: "integer",
              },
            },
          },
          context: {
            type: "object",
            nullable: true,
            properties: {
              foods: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/FoodSummary",
                },
              },
              chosen: {
                $ref: "#/components/schemas/FoodSummary",
                nullable: true,
              },
            },
          },
        },
      },
      ProblemDetails: {
        type: "object",
        description: "RFC 7807 Problem Details format",
        properties: {
          type: {
            type: "string",
            format: "uri",
            example: "https://labelguard.api/errors/BAD_REQUEST",
          },
          title: {
            type: "string",
            example: "Validation failed",
          },
          status: {
            type: "integer",
            example: 400,
          },
          detail: {
            type: "string",
            example: "Invalid request data",
          },
          instance: {
            type: "string",
            example: "/foods",
          },
          code: {
            type: "string",
            example: "BAD_REQUEST",
          },
          traceId: {
            type: "string",
            nullable: true,
            example: "1234567890-abc123",
          },
          errors: {
            type: "object",
            additionalProperties: true,
            nullable: true,
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ProblemDetails",
            },
            example: {
              type: "https://labelguard.api/errors/BAD_REQUEST",
              title: "Validation failed",
              status: 400,
              detail: "Invalid request data",
              instance: "/foods",
              code: "BAD_REQUEST",
              traceId: "1234567890-abc123",
              errors: {
                q: "Search query 'q' is required",
              },
            },
          },
        },
      },
      BadGateway: {
        description: "Bad gateway (upstream service error)",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ProblemDetails",
            },
            example: {
              type: "https://labelguard.api/errors/BAD_GATEWAY",
              title: "Bad gateway",
              status: 502,
              detail: "USDA API returned 500",
              instance: "/foods",
              code: "BAD_GATEWAY",
              traceId: "1234567890-abc123",
            },
          },
        },
      },
      ServiceUnavailable: {
        description: "Service unavailable (timeout or temporary error)",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ProblemDetails",
            },
            example: {
              type: "https://labelguard.api/errors/SERVICE_UNAVAILABLE",
              title: "Service unavailable",
              status: 503,
              detail: "Request to USDA API timed out",
              instance: "/foods",
              code: "SERVICE_UNAVAILABLE",
              traceId: "1234567890-abc123",
            },
          },
        },
      },
    },
  },
} as const;

