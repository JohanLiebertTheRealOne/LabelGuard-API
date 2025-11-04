# LabelGuard API - Request Examples

This document contains comprehensive examples of API requests for the LabelGuard API. Replace `https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app` with your actual API URL.

## Table of Contents

1. [Health Check Endpoints](#health-check-endpoints)
2. [Food Search Endpoints](#food-search-endpoints)
3. [Label Validation Endpoints](#label-validation-endpoints)
4. [Error Examples](#error-examples)
5. [Code Examples](#code-examples)

---

## Health Check Endpoints

### Basic Health Check

**GET /health**

Returns server status, uptime, and timestamp.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/health"
```

#### Response
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Liveness Probe

**GET /health/liveness**

Used by orchestrators to check if the container is running.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/health/liveness"
```

#### Response
```json
{
  "status": "alive"
}
```

---

### Readiness Probe

**GET /health/readiness**

Used by orchestrators to check if the service is ready to accept traffic.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/health/readiness"
```

#### Response
```json
{
  "status": "ready"
}
```

---

### Metrics

**GET /health/metrics**

Returns simple metrics export.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/health/metrics"
```

#### Response
```
# HTTP requests
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="POST",status="200"} 567
http_requests_total{method="GET",status="400"} 12
```

---

## Food Search Endpoints

### Basic Food Search

**GET /foods?q={query}**

Search for foods with a simple query.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=greek%20yogurt"
```

#### Response
```json
{
  "items": [
    {
      "fdcId": 173430,
      "description": "Yogurt, Greek, plain, lowfat",
      "brandOwner": null,
      "gtinUpc": null,
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
    "limit": 10
  }
}
```

---

### Food Search with Limit

**GET /foods?q={query}&limit={number}**

Limit the number of results (1-50, default: 10).

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=pizza&limit=5"
```

#### JavaScript
```javascript
const response = await fetch(
  'https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=pizza&limit=5'
);
const data = await response.json();
console.log(data);
```

---

### Food Search - Branded Products Only

**GET /foods?q={query}&dataType=Branded**

Filter results to only include branded products.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=chocolate&dataType=Branded&limit=10"
```

#### Response
```json
{
  "items": [
    {
      "fdcId": 1998723,
      "description": "Chocolate Chip Cookie",
      "brandOwner": "Brand Name",
      "gtinUpc": "012345678901",
      "dataType": "Branded",
      "servingSize": 30,
      "servingSizeUnit": "g",
      "caloriesKcal": 150,
      "macros": {
        "proteinG": 2,
        "fatG": 8,
        "carbsG": 18
      }
    }
  ],
  "meta": {
    "totalHits": 150,
    "limit": 10
  }
}
```

---

### Food Search - Multiple Data Types

**GET /foods?q={query}&dataType=Branded,SR Legacy**

Filter by multiple data types (comma-separated).

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=bread&dataType=Branded,SR%20Legacy&limit=15"
```

---

### Food Search - Foundation Foods

**GET /foods?q={query}&dataType=Foundation**

Search for foundation foods only.

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=chicken%20breast&dataType=Foundation&limit=10"
```

---

### Food Search Examples - Various Foods

#### Search for Fruits
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=apple&limit=10"
```

#### Search for Vegetables
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=broccoli&limit=10"
```

#### Search for Meat
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=ground%20beef&limit=10"
```

#### Search for Dairy Products
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=cheese&limit=10"
```

#### Search for Beverages
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=orange%20juice&limit=10"
```

#### Search for Grains
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=rice&limit=10"
```

#### Search for Nuts
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=almonds&limit=10"
```

#### Search for Snacks
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=potato%20chips&dataType=Branded&limit=20"
```

---

## Label Validation Endpoints

### Basic Label Validation

**POST /labels/validate**

Validate a food label with minimal information.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: milk, cultures. Contains live cultures.",
    "declaredAllergens": ["milk"],
    "servingSize": {
      "value": 170,
      "unit": "g"
    }
  }'
```

#### Response
```json
{
  "valid": true,
  "issues": [],
  "summary": {
    "allergensFound": ["milk"],
    "totalIssues": 0
  }
}
```

---

### Label Validation with Product Claims

**POST /labels/validate**

Validate a label with health/nutrition claims.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: milk, cultures. Contains live cultures. High protein, low fat.",
    "declaredAllergens": ["milk"],
    "servingSize": {
      "value": 170,
      "unit": "g"
    },
    "referenceFoodQuery": "greek yogurt",
    "claimTexts": ["high protein", "low fat"]
  }'
```

#### Response
```json
{
  "valid": false,
  "issues": [
    {
      "id": "CLAIM_HIGH_PROTEIN_UNSUPPORTED",
      "severity": "medium",
      "category": "claims",
      "message": "Claim 'high protein' may be unsupported. Context shows ~8 g protein per serving.",
      "hint": "Ensure ≥ 10 g protein per serving to support 'high protein' claims, or revise the claim.",
      "regulationRef": null
    }
  ],
  "summary": {
    "allergensFound": ["milk"],
    "totalIssues": 1
  },
  "context": {
    "foods": [
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
    "chosen": {
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
  }
}
```

---

### Label Validation - Missing Allergen Declaration

**POST /labels/validate**

Example showing detection of undeclared allergens.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: milk, soy, sugar, vanilla extract.",
    "declaredAllergens": ["milk"],
    "servingSize": {
      "value": 100,
      "unit": "g"
    }
  }'
```

#### Response
```json
{
  "valid": false,
  "issues": [
    {
      "id": "ALLERGEN_MISSING",
      "severity": "high",
      "category": "allergen",
      "message": "Detected undeclared allergen: soy",
      "hint": "Add a 'Contains:' statement listing all major allergens present in the product.",
      "regulationRef": "US 21 CFR 101.4; FALCPA"
    }
  ],
  "summary": {
    "allergensFound": ["milk", "soy"],
    "totalIssues": 1
  }
}
```

---

### Label Validation - Missing Serving Size

**POST /labels/validate**

Example showing missing serving size validation.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: flour, sugar, eggs, butter. Contains: eggs, milk, wheat.",
    "declaredAllergens": ["eggs", "milk", "wheat"]
  }'
```

#### Response
```json
{
  "valid": false,
  "issues": [
    {
      "id": "SERVING_SIZE_MISSING",
      "severity": "medium",
      "category": "serving",
      "message": "Serving size is missing.",
      "hint": "Provide serving size value and unit (e.g., 30 g). Required by US 21 CFR 101.9.",
      "regulationRef": "US 21 CFR 101.9"
    }
  ],
  "summary": {
    "allergensFound": ["eggs", "milk", "wheat"],
    "totalIssues": 1
  }
}
```

---

### Label Validation - Multiple Allergens

**POST /labels/validate**

Validate a product with multiple allergens.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: peanuts, almonds, sugar, salt. Contains: peanuts, tree nuts.",
    "declaredAllergens": ["peanuts", "tree nuts"],
    "servingSize": {
      "value": 28,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Product with Multiple Claims

**POST /labels/validate**

Validate a product with multiple health claims.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Organic protein bar. High protein, low fat, sugar free.",
    "declaredAllergens": ["soy"],
    "servingSize": {
      "value": 50,
      "unit": "g"
    },
    "referenceFoodQuery": "protein bar",
    "claimTexts": ["high protein", "low fat", "sugar free"]
  }'
```

---

### Label Validation - Different Serving Size Units

**POST /labels/validate**

Examples with different serving size units.

#### Grams (g)
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: whole grain oats, honey.",
    "servingSize": {
      "value": 40,
      "unit": "g"
    }
  }'
```

#### Ounces (oz)
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: whole grain oats, honey.",
    "servingSize": {
      "value": 1.4,
      "unit": "oz"
    }
  }'
```

#### Milliliters (ml)
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: water, fruit juice concentrate, citric acid.",
    "servingSize": {
      "value": 240,
      "unit": "ml"
    }
  }'
```

---

### Label Validation - Complete Example

**POST /labels/validate**

A complete validation example with all optional fields.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Organic Greek Yogurt. Ingredients: organic milk, live active cultures. Contains: milk. High protein content, low fat.",
    "productName": "Organic Greek Yogurt",
    "declaredAllergens": ["milk"],
    "servingSize": {
      "value": 170,
      "unit": "g"
    },
    "referenceFoodQuery": "greek yogurt organic",
    "claimTexts": ["high protein", "low fat"],
    "markets": ["US"]
  }'
```

---

### Label Validation - Egg Product

**POST /labels/validate**

```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: whole eggs, salt, citric acid. Contains: eggs.",
    "declaredAllergens": ["eggs"],
    "servingSize": {
      "value": 50,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Wheat Product

**POST /labels/validate**

```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: wheat flour, water, yeast, salt. Contains: wheat.",
    "declaredAllergens": ["wheat"],
    "servingSize": {
      "value": 30,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Shellfish Product

**POST /labels/validate**

```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: shrimp, salt, water. Contains: shellfish (shrimp).",
    "declaredAllergens": ["shellfish", "shrimp"],
    "servingSize": {
      "value": 85,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Fish Product

**POST /labels/validate**

```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: tuna, water, salt. Contains: fish (tuna).",
    "declaredAllergens": ["fish"],
    "servingSize": {
      "value": 85,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Soy Product

**POST /labels/validate**

```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: soybeans, water, salt. Contains: soy.",
    "declaredAllergens": ["soy"],
    "servingSize": {
      "value": 100,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Sesame Product

**POST /labels/validate**

```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: sesame seeds, salt. Contains: sesame.",
    "declaredAllergens": ["sesame"],
    "servingSize": {
      "value": 15,
      "unit": "g"
    }
  }'
```

---

### Label Validation - Minimal Label Text Only

**POST /labels/validate**

Minimal validation with just label text.

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "labelText": "Ingredients: milk, sugar, vanilla."
  }'
```

#### Response
```json
{
  "valid": false,
  "issues": [
    {
      "id": "ALLERGEN_MISSING",
      "severity": "high",
      "category": "allergen",
      "message": "Detected undeclared allergen: milk",
      "hint": "Add a 'Contains:' statement listing all major allergens present in the product.",
      "regulationRef": "US 21 CFR 101.4; FALCPA"
    },
    {
      "id": "SERVING_SIZE_MISSING",
      "severity": "medium",
      "category": "serving",
      "message": "Serving size is missing.",
      "hint": "Provide serving size value and unit (e.g., 30 g). Required by US 21 CFR 101.9.",
      "regulationRef": "US 21 CFR 101.9"
    }
  ],
  "summary": {
    "allergensFound": ["milk"],
    "totalIssues": 2
  }
}
```

---

## Error Examples

### Missing Required Query Parameter

**GET /foods** (without `q` parameter)

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods"
```

#### Response (400 Bad Request)
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

---

### Invalid Limit Parameter

**GET /foods?q=pizza&limit=100** (limit exceeds maximum of 50)

#### cURL
```bash
curl "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=pizza&limit=100"
```

#### Response (400 Bad Request)
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
    "limit": "Number must be less than or equal to 50"
  }
}
```

---

### Missing Label Text

**POST /labels/validate** (without `labelText`)

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "declaredAllergens": ["milk"]
  }'
```

#### Response (400 Bad Request)
```json
{
  "type": "https://labelguard.api/errors/BAD_REQUEST",
  "title": "Validation failed",
  "status": 400,
  "detail": "Invalid request data",
  "instance": "/labels/validate",
  "code": "BAD_REQUEST",
  "traceId": "1234567890-abc123",
  "errors": {
    "labelText": "labelText is required"
  }
}
```

---

### Invalid JSON Body

**POST /labels/validate** (malformed JSON)

#### cURL
```bash
curl -X POST "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate" \
  -H "Content-Type: application/json" \
  -d '{ invalid json }'
```

#### Response (400 Bad Request)
```json
{
  "type": "https://labelguard.api/errors/BAD_REQUEST",
  "title": "Invalid JSON",
  "status": 400,
  "detail": "Request body contains invalid JSON",
  "instance": "/labels/validate",
  "code": "BAD_REQUEST"
}
```

---

### Rate Limit Exceeded

After exceeding the rate limit (100 requests per 15 minutes default).

#### Response (429 Too Many Requests)
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Code Examples

### JavaScript (Fetch API)

#### Search Foods
```javascript
async function searchFoods(query, limit = 10) {
  const response = await fetch(
    `https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Request failed');
  }
  
  return await response.json();
}

// Usage
const results = await searchFoods('greek yogurt', 5);
console.log(results);
```

#### Validate Label
```javascript
async function validateLabel(labelData) {
  const response = await fetch(
    'https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(labelData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Validation failed');
  }
  
  return await response.json();
}

// Usage
const report = await validateLabel({
  labelText: 'Ingredients: milk, cultures. Contains: milk.',
  declaredAllergens: ['milk'],
  servingSize: {
    value: 170,
    unit: 'g'
  }
});

console.log(report.valid ? 'Label is valid' : `Found ${report.summary.totalIssues} issues`);
```

---

### Python (requests library)

#### Search Foods
```python
import requests

def search_foods(query, limit=10):
    url = "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods"
    params = {
        "q": query,
        "limit": limit
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()

# Usage
results = search_foods("greek yogurt", limit=5)
print(results)
```

#### Validate Label
```python
import requests

def validate_label(label_data):
    url = "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate"
    
    response = requests.post(url, json=label_data)
    response.raise_for_status()
    return response.json()

# Usage
report = validate_label({
    "labelText": "Ingredients: milk, cultures. Contains: milk.",
    "declaredAllergens": ["milk"],
    "servingSize": {
        "value": 170,
        "unit": "g"
    }
})

print(f"Valid: {report['valid']}")
print(f"Issues: {report['summary']['totalIssues']}")
```

---

### Node.js (axios)

```javascript
const axios = require('axios');

const BASE_URL = 'https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app';

// Search foods
async function searchFoods(query, limit = 10) {
  try {
    const response = await axios.get(`${BASE_URL}/foods`, {
      params: { q: query, limit }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Request failed');
    }
    throw error;
  }
}

// Validate label
async function validateLabel(labelData) {
  try {
    const response = await axios.post(`${BASE_URL}/labels/validate`, labelData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Validation failed');
    }
    throw error;
  }
}

// Usage
(async () => {
  const foods = await searchFoods('pizza', 5);
  console.log(foods);
  
  const report = await validateLabel({
    labelText: 'Ingredients: wheat, cheese, tomatoes.',
    declaredAllergens: ['wheat', 'milk'],
    servingSize: { value: 100, unit: 'g' }
  });
  console.log(report);
})();
```

---

### PHP (cURL)

```php
<?php

function searchFoods($query, $limit = 10) {
    $url = 'https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/foods';
    $params = http_build_query([
        'q' => $query,
        'limit' => $limit
    ]);
    
    $ch = curl_init($url . '?' . $params);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Request failed');
    }
    
    return json_decode($response, true);
}

function validateLabel($labelData) {
    $url = 'https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app/labels/validate';
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($labelData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Validation failed');
    }
    
    return json_decode($response, true);
}

// Usage
$foods = searchFoods('greek yogurt', 5);
print_r($foods);

$report = validateLabel([
    'labelText' => 'Ingredients: milk, cultures. Contains: milk.',
    'declaredAllergens' => ['milk'],
    'servingSize' => [
        'value' => 170,
        'unit' => 'g'
    ]
]);
print_r($report);
?>
```

---

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
)

const BaseURL = "https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app"

type FoodSearchResult struct {
    Items []FoodItem `json:"items"`
    Meta  struct {
        TotalHits int `json:"totalHits"`
        Limit     int `json:"limit"`
    } `json:"meta"`
}

type FoodItem struct {
    FdcID           int     `json:"fdcId"`
    Description     string  `json:"description"`
    DataType        string  `json:"dataType"`
    ServingSize     *float64 `json:"servingSize"`
    ServingSizeUnit *string  `json:"servingSizeUnit"`
    CaloriesKcal    *float64 `json:"caloriesKcal"`
    Macros          struct {
        ProteinG *float64 `json:"proteinG"`
        FatG     *float64 `json:"fatG"`
        CarbsG   *float64 `json:"carbsG"`
    } `json:"macros"`
}

func SearchFoods(query string, limit int) (*FoodSearchResult, error) {
    params := url.Values{}
    params.Add("q", query)
    params.Add("limit", fmt.Sprintf("%d", limit))
    
    resp, err := http.Get(BaseURL + "/foods?" + params.Encode())
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }
    
    var result FoodSearchResult
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, err
    }
    
    return &result, nil
}

func ValidateLabel(labelData map[string]interface{}) (map[string]interface{}, error) {
    jsonData, err := json.Marshal(labelData)
    if err != nil {
        return nil, err
    }
    
    resp, err := http.Post(BaseURL+"/labels/validate", "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }
    
    var result map[string]interface{}
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, err
    }
    
    return result, nil
}

func main() {
    // Search foods
    foods, err := SearchFoods("greek yogurt", 5)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("Found %d foods\n", len(foods.Items))
    
    // Validate label
    labelData := map[string]interface{}{
        "labelText": "Ingredients: milk, cultures. Contains: milk.",
        "declaredAllergens": []string{"milk"},
        "servingSize": map[string]interface{}{
            "value": 170.0,
            "unit":  "g",
        },
    }
    
    report, err := ValidateLabel(labelData)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    fmt.Printf("Validation report: %+v\n", report)
}
```

---

## Postman Collection

You can import the Postman collection from `postman/LabelGuard.postman_collection.json` which includes pre-configured requests for all endpoints.

## Base URL

Replace the base URL in all examples:
```
https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app
```

With your actual deployment URL from Vercel.

## Notes

- All endpoints return JSON
- Error responses follow RFC 7807 Problem Details format
- Rate limits: 100 requests per 15 minutes (default), 50 for validation endpoint
- Maximum limit for food search: 50 results
- All timestamps are in ISO 8601 format (UTC)
