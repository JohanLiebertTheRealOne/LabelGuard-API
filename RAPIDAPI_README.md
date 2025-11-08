# LabelGuard API

**Validate food labels and search USDA nutrition data with compliance checks**

LabelGuard API provides production-grade food label validation and USDA FoodData Central search capabilities. Perfect for food manufacturers, compliance teams, and developers building nutrition apps.

## ✨ Features

- 🔍 **USDA Food Search** - Search 300,000+ foods with clean nutrition data
- ✅ **Label Validation** - Automated compliance checking for allergens, serving sizes, and health claims
- 📊 **Clean Data** - Pre-processed nutrition data with serving sizes and macronutrients
- 🚀 **Fast & Reliable** - Built on USDA FoodData Central with caching and resilience
- 🔒 **Secure** - Rate limiting, input validation, and security headers

## 🚀 Quick Start

### Authentication

All requests require RapidAPI authentication headers:

```javascript
headers: {
  'X-RapidAPI-Key': 'YOUR_API_KEY',
  'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
}
```

Get your API key from your [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard).

---

## 📚 API Endpoints

### 1. Search Foods

Search the USDA FoodData Central database for foods and get clean nutrition data.

**Endpoint:** `GET /foods`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ Yes | Search query (food name or type) |
| `limit` | integer | ❌ No | Max results (1-50, default: 10) |
| `dataType` | string | ❌ No | Filter by type: `Branded`, `SR Legacy`, `Survey (FNDDS)`, `Foundation` |

**Example Request:**

```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://labelguard.p.rapidapi.com/foods',
  params: {
    q: 'greek yogurt',
    limit: '10'
  },
  headers: {
    'X-RapidAPI-Key': 'YOUR_API_KEY',
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
  }
};

try {
  const response = await axios.request(options);
  console.log(response.data);
} catch (error) {
  console.error(error);
}
```

**Example Response:**

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

**Search Examples:**

```bash
# Search for branded products only
/foods?q=chocolate&dataType=Branded&limit=20

# Search for foundation foods
/foods?q=chicken%20breast&dataType=Foundation

# Multiple data types
/foods?q=bread&dataType=Branded,SR%20Legacy&limit=15
```

---

### 2. Validate Label

Validate food labels for compliance issues including allergen declarations, serving size requirements, and claim plausibility.

**Endpoint:** `POST /labels/validate`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `labelText` | string | ✅ Yes | The label text to validate |
| `declaredAllergens` | array[string] | ❌ No | List of declared allergens |
| `servingSize` | object | ❌ No | `{value: number, unit: string}` |
| `productName` | string | ❌ No | Product name |
| `referenceFoodQuery` | string | ❌ No | Query to fetch USDA context foods |
| `claimTexts` | array[string] | ❌ No | Health/nutrition claims to validate |
| `markets` | array[string] | ❌ No | Target markets (default: `["US"]`) |

**Example Request:**

```javascript
const axios = require('axios');

const options = {
  method: 'POST',
  url: 'https://labelguard.p.rapidapi.com/labels/validate',
  headers: {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': 'YOUR_API_KEY',
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
  },
  data: {
    labelText: 'Ingredients: milk, cultures. Contains live cultures. High protein, low fat.',
    declaredAllergens: ['milk'],
    servingSize: {
      value: 170,
      unit: 'g'
    },
    referenceFoodQuery: 'greek yogurt',
    claimTexts: ['high protein', 'low fat'],
    markets: ['US']
  }
};

try {
  const response = await axios.request(options);
  console.log(response.data);
} catch (error) {
  console.error(error);
}
```

**Example Response:**

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

**Minimal Example:**

```json
{
  "labelText": "Ingredients: milk, cultures. Contains live cultures."
}
```

---

### 3. Health Check

Check API status and uptime.

**Endpoint:** `GET /health`

**Example Request:**

```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://labelguard.p.rapidapi.com/health',
  headers: {
    'X-RapidAPI-Key': 'YOUR_API_KEY',
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
  }
};

const response = await axios.request(options);
console.log(response.data);
```

**Response:**

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 💻 Code Examples

### JavaScript (Axios)

```javascript
const axios = require('axios');

// Search foods
async function searchFoods(query, limit = 10) {
  const options = {
    method: 'GET',
    url: 'https://labelguard.p.rapidapi.com/foods',
    params: {
      q: query,
      limit: limit.toString()
    },
    headers: {
      'X-RapidAPI-Key': 'YOUR_API_KEY',
      'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
    }
  };
  
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Validate label
async function validateLabel(labelData) {
  const options = {
    method: 'POST',
    url: 'https://labelguard.p.rapidapi.com/labels/validate',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': 'YOUR_API_KEY',
      'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
    },
    data: labelData
  };
  
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
(async () => {
  // Search for foods
  const foods = await searchFoods('greek yogurt', 5);
  console.log(`Found ${foods.items.length} foods`);
  
  // Validate a label
  const report = await validateLabel({
    labelText: 'Ingredients: milk, cultures. Contains: milk.',
    declaredAllergens: ['milk'],
    servingSize: { value: 170, unit: 'g' }
  });
  
  console.log(`Label valid: ${report.valid}`);
  console.log(`Issues found: ${report.summary.totalIssues}`);
})();
```

### Python (requests)

```python
import requests

API_KEY = 'YOUR_API_KEY'
BASE_URL = 'https://labelguard.p.rapidapi.com'
HEADERS = {
    'X-RapidAPI-Key': API_KEY,
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
}

def search_foods(query, limit=10):
    """Search for foods in USDA database"""
    url = f'{BASE_URL}/foods'
    params = {
        'q': query,
        'limit': limit
    }
    
    response = requests.get(url, headers=HEADERS, params=params)
    response.raise_for_status()
    return response.json()

def validate_label(label_data):
    """Validate a food label"""
    url = f'{BASE_URL}/labels/validate'
    headers = {
        **HEADERS,
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, headers=headers, json=label_data)
    response.raise_for_status()
    return response.json()

# Usage
if __name__ == '__main__':
    # Search foods
    foods = search_foods('greek yogurt', limit=5)
    print(f"Found {len(foods['items'])} foods")
    
    # Validate label
    report = validate_label({
        'labelText': 'Ingredients: milk, cultures. Contains: milk.',
        'declaredAllergens': ['milk'],
        'servingSize': {'value': 170, 'unit': 'g'}
    })
    
    print(f"Label valid: {report['valid']}")
    print(f"Issues found: {report['summary']['totalIssues']}")
```

### Node.js (Fetch API)

```javascript
const BASE_URL = 'https://labelguard.p.rapidapi.com';
const API_KEY = 'YOUR_API_KEY';

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
};

async function searchFoods(query, limit = 10) {
  const url = new URL(`${BASE_URL}/foods`);
  url.searchParams.append('q', query);
  url.searchParams.append('limit', limit.toString());
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function validateLabel(labelData) {
  const response = await fetch(`${BASE_URL}/labels/validate`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(labelData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// Usage
(async () => {
  try {
    const foods = await searchFoods('pizza', 5);
    console.log(`Found ${foods.items.length} foods`);
    
    const report = await validateLabel({
      labelText: 'Ingredients: wheat, cheese, tomatoes.',
      declaredAllergens: ['wheat', 'milk'],
      servingSize: { value: 100, unit: 'g' }
    });
    
    console.log(`Valid: ${report.valid}`);
    console.log(`Issues: ${report.summary.totalIssues}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
```

### cURL

```bash
# Search foods
curl -X GET 'https://labelguard.p.rapidapi.com/foods?q=greek%20yogurt&limit=10' \
  -H 'X-RapidAPI-Key: YOUR_API_KEY' \
  -H 'X-RapidAPI-Host: labelguard.p.rapidapi.com'

# Validate label
curl -X POST 'https://labelguard.p.rapidapi.com/labels/validate' \
  -H 'Content-Type: application/json' \
  -H 'X-RapidAPI-Key: YOUR_API_KEY' \
  -H 'X-RapidAPI-Host: labelguard.p.rapidapi.com' \
  -d '{
    "labelText": "Ingredients: milk, cultures. Contains: milk.",
    "declaredAllergens": ["milk"],
    "servingSize": {
      "value": 170,
      "unit": "g"
    }
  }'
```

---

## 🔍 Use Cases

### Food Manufacturers
- **Pre-production validation** - Check labels before printing
- **Compliance checking** - Ensure allergen declarations are correct
- **Claim verification** - Validate nutrition claims against USDA data

### Compliance Teams
- **Batch validation** - Validate multiple labels programmatically
- **Issue tracking** - Get detailed reports with regulatory references
- **Multi-market support** - Validate for US, EU, and FR markets

### Developers
- **Nutrition apps** - Search USDA database for food data
- **Recipe analyzers** - Get nutrition data for ingredients
- **Label scanners** - Integrate OCR with validation API

---

## 📊 Response Format

### Success Response

All successful responses return JSON with status `200 OK`.

### Error Response

Errors follow RFC 7807 Problem Details format:

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

**Common HTTP Status Codes:**

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Upstream service error
- `503 Service Unavailable` - Service temporarily unavailable

---

## ⚙️ Rate Limits

- **Default endpoints**: 100 requests per 15 minutes
- **Validation endpoint**: 50 requests per 15 minutes
- **Rate limit headers** included in all responses:
  - `ratelimit-limit`: Maximum requests allowed
  - `ratelimit-remaining`: Remaining requests
  - `ratelimit-reset`: Seconds until reset

---

## 🎯 Validation Features

### Allergen Detection
- Detects undeclared allergens in ingredients
- Validates allergen declarations against ingredients
- Supports major US allergens (FALCPA): milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soy, sesame

### Serving Size Validation
- Checks for missing serving size information
- Validates serving size format and units
- Required by US 21 CFR 101.9

### Claim Validation
- Validates nutrition claims (high protein, low fat, sugar-free)
- Compares claims against USDA nutrition data
- Provides context with reference foods

### Market-Specific Rules
- US regulations (21 CFR 101.4, FALCPA)
- EU regulations (EU 1169/2011)
- FR regulations (French labeling requirements)

---

## 🔒 Security

- **Rate limiting** - Prevents abuse and ensures fair usage
- **Input validation** - All inputs validated with strict schemas
- **Security headers** - Helmet.js configured with safe defaults
- **HTTPS only** - All requests encrypted in transit
- **No data storage** - Your data is not stored on our servers

---

## ⚠️ Important Notes

### Legal Disclaimer

⚠️ **This API provides heuristic-based validation and is NOT legal advice.**

- Validation rules are simplified heuristics for educational purposes
- Actual food labeling regulations are complex and jurisdiction-specific
- Always consult with regulatory experts for production compliance decisions
- USDA data may have limitations and should be verified independently

### Data Sources

- **USDA FoodData Central** - Official USDA nutrition database
- **300,000+ foods** - Branded products, foundation foods, and legacy data
- **Real-time access** - Direct integration with USDA API

### Limitations

- Maximum 50 results per search request
- Query parameter `q` must be 1-128 characters
- Label text validation limited to 10,000 characters
- Claims validation is heuristic-based, not legally binding

---

## 🆘 Troubleshooting

### Common Issues

**"q: Required" error**
- Make sure you're using the parameter name `q` (not `food`, `query`, etc.)
- Ensure the `q` parameter has a value

**Empty search results**
- Verify your search query spelling
- Try broader search terms
- Check that `dataType` filter isn't too restrictive

**Rate limit exceeded**
- Check the `ratelimit-remaining` header
- Wait for the reset time indicated in `ratelimit-reset`
- Consider upgrading your plan

**Validation returns no issues**
- The label may actually be compliant
- Try adding more context with `referenceFoodQuery`
- Check that `labelText` contains enough information

### Getting Help

- Check the [API Examples](API_EXAMPLES.md) for more detailed examples
- Review error responses - they include helpful hints
- Open an issue on GitHub for bugs or feature requests

---

## 📈 Pricing & Plans

Check your current plan and usage in the [RapidAPI Dashboard](https://rapidapi.com/developer/dashboard).

---

## 🔗 Additional Resources

- [Full API Documentation](API_EXAMPLES.md) - Comprehensive examples
- [OpenAPI Specification](openapi.json) - Machine-readable API spec
- [GitHub Repository](https://github.com/JohanLiebertTheRealOne/LabelGuard-API) - Source code and issues

---

## 📝 Changelog

### Version 1.0.0
- Initial release
- USDA food search endpoint
- Label validation endpoint
- Multi-market support (US, EU, FR)
- Health check endpoints

---

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for food safety and compliance**

For questions, issues, or feature requests, please visit our [GitHub repository](https://github.com/JohanLiebertTheRealOne/LabelGuard-API).

