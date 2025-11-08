# Guide de Configuration RapidAPI pour LabelGuard API

Ce guide explique comment configurer les endpoints de LabelGuard API sur RapidAPI.

## ⚠️ Format des Endpoints

Sur RapidAPI, **le path ne doit PAS contenir les query parameters**. Les query parameters sont configurés séparément dans l'interface.

### ❌ Format INCORRECT
```
/foods?q={query}
```

### ✅ Format CORRECT
```
/foods
```

Les query parameters (`q`, `limit`, `dataType`) sont ajoutés séparément dans la section "Query Parameters" de RapidAPI.

---

## 📋 Liste des Endpoints à Configurer

### 1. Recherche de Produits Alimentaires (Food Search)

**Method:** `GET`  
**Path:** `/foods`

#### Query Parameters (à ajouter séparément dans RapidAPI):

| Nom | Type | Requis | Description | Exemple |
|-----|------|--------|-------------|---------|
| `q` | string | ✅ Oui | Terme de recherche (nom d'aliment) | `greek yogurt` |
| `limit` | integer | ❌ Non | Nombre maximum de résultats (1-50) | `10` |
| `dataType` | string | ❌ Non | Filtrer par type de données (comma-separated): `Branded`, `SR Legacy`, `Survey (FNDDS)`, `Foundation` | `Branded` |

#### Exemple de Requête Complète:
```
GET /foods?q=greek%20yogurt&limit=10
```

---

### 2. Validation d'Étiquette (Label Validation)

**Method:** `POST`  
**Path:** `/labels/validate`

#### Headers:
- `Content-Type: application/json`

#### Body Parameters (JSON):

| Nom | Type | Requis | Description |
|-----|------|--------|-------------|
| `labelText` | string | ✅ Oui | Le texte de l'étiquette à valider |
| `declaredAllergens` | array[string] | ❌ Non | Liste des allergènes déclarés |
| `servingSize` | object | ❌ Non | Taille de portion (value, unit) |
| `productName` | string | ❌ Non | Nom du produit |
| `referenceFoodQuery` | string | ❌ Non | Requête pour rechercher des aliments de référence |
| `claimTexts` | array[string] | ❌ Non | Revendications à valider |
| `markets` | array[string] | ❌ Non | Marchés cibles (défaut: `["US"]`) |

#### Exemple de Body:
```json
{
  "labelText": "Ingredients: milk, cultures. Contains live cultures.",
  "declaredAllergens": ["milk"],
  "servingSize": {
    "value": 170,
    "unit": "g"
  }
}
```

---

### 3. Health Check (Santé de l'API)

**Method:** `GET`  
**Path:** `/health`

Aucun paramètre requis.

---

### 4. Liveness Probe

**Method:** `GET`  
**Path:** `/health/liveness`

Aucun paramètre requis.

---

### 5. Readiness Probe

**Method:** `GET`  
**Path:** `/health/readiness`

Aucun paramètre requis.

---

### 6. Metrics

**Method:** `GET`  
**Path:** `/health/metrics`

Aucun paramètre requis.

---

## 🔧 Étapes de Configuration dans RapidAPI

### Pour l'endpoint GET /foods:

1. **Créer l'endpoint:**
   - Method: `GET`
   - Path: `/foods` (sans `?q={query}`)

2. **Ajouter les Query Parameters:**
   - Cliquez sur "Add Query Parameter" ou "Add Parameter"
   - Ajoutez `q` (⚠️ **OBLIGATOIRE**):
     - Name: `q` (exactement comme ça, en minuscule)
     - Type: `string`
     - Required: ✅ **YES** (marquer comme obligatoire)
     - Description: `Search query (food name or type)`
     - **IMPORTANT:** Lors du test, vous DEVEZ remplir ce champ avec une valeur (ex: `greek yogurt`)
   
   - Ajoutez `limit` (optionnel):
     - Name: `limit`
     - Type: `integer`
     - Required: ❌ No
     - Description: `Maximum number of results (1-50)`
     - Default: `10`
   
   - Ajoutez `dataType` (optionnel):
     - Name: `dataType`
     - Type: `string`
     - Required: ❌ No
     - Description: `Filter by data type (comma-separated): Branded, SR Legacy, Survey (FNDDS), Foundation`

3. **Configurer les Headers:**
   - Généralement aucun header requis pour GET

4. **⚠️ IMPORTANT - Lors du test:**
   - Assurez-vous de **remplir le champ `q`** avec une valeur
   - Exemples de valeurs valides: `greek yogurt`, `pizza`, `chocolate`, `apple`
   - Ne laissez JAMAIS le champ `q` vide lors du test
   - L'URL générée devrait contenir `?q=...` dans l'URL finale

### Pour l'endpoint POST /labels/validate:

1. **Créer l'endpoint:**
   - Method: `POST`
   - Path: `/labels/validate`

2. **Configurer les Headers:**
   - `Content-Type: application/json`

3. **Ajouter le Body Schema:**
   - Content Type: `application/json`
   - Ajoutez un schéma JSON ou utilisez l'exemple ci-dessus

---

## 📝 Résumé des Endpoints Principaux

| Method | Path | Description | Query Params | Body |
|--------|------|-------------|--------------|------|
| GET | `/foods` | Recherche d'aliments | `q` (requis), `limit`, `dataType` | - |
| POST | `/labels/validate` | Validation d'étiquette | - | JSON (voir ci-dessus) |
| GET | `/health` | Statut de l'API | - | - |
| GET | `/health/liveness` | Liveness check | - | - |
| GET | `/health/readiness` | Readiness check | - | - |
| GET | `/health/metrics` | Métriques Prometheus | - | - |

---

## 🎯 Conseils pour RapidAPI

1. **Path Parameters vs Query Parameters:**
   - Les path parameters utilisent `{nom}` dans le path: `/foods/{id}`
   - Les query parameters sont configurés séparément dans l'interface
   - Ne jamais mettre `?` dans le path

2. **Caractères autorisés dans le Path:**
   - Alphanumériques: `a-z`, `A-Z`, `0-9`
   - Caractères spéciaux: `.`, `-`, `?`, `%`, `~`, `=`, `_`
   - Les query parameters ne font PAS partie du path

3. **Exemple de Path Parameter (si nécessaire):**
   ```
   /foods/{fdcId}
   ```
   Dans ce cas, `{fdcId}` est un path parameter et sera remplacé par une valeur réelle lors de l'appel.

---

## 🔗 Base URL

Utilisez votre URL de déploiement Vercel comme base URL:
```
https://label-guard-66ycrgamt-johanlieberttherealones-projects.vercel.app
```

Ou votre propre domaine si vous avez configuré un domaine personnalisé.

---

## 🔧 Dépannage - Erreur "q: Required"

### ❌ Erreur reçue:
```json
{
  "type": "https://labelguard.api/errors/BAD_REQUEST",
  "title": "Validation failed",
  "status": 400,
  "detail": "Invalid request data",
  "instance": "/foods",
  "code": "BAD_REQUEST",
  "errors": {
    "q": "Required"
  }
}
```

### ✅ Solution:

Cette erreur signifie que le paramètre `q` n'est **pas envoyé** dans votre requête de test. Voici comment le corriger :

#### Étape 1: Vérifier que le Query Parameter `q` est configuré

1. Dans l'interface RapidAPI, ouvrez votre endpoint `GET /foods`
2. Allez dans la section **"Query Parameters"** ou **"Parameters"**
3. Vérifiez que le paramètre `q` existe avec:
   - **Name:** `q` (exactement, en minuscule)
   - **Type:** `string`
   - **Required:** ✅ **OUI** (obligatoire)
   - **Description:** `Search query (food name or type)`

#### Étape 2: Remplir la valeur lors du test

1. Dans l'interface de test RapidAPI, trouvez le champ pour le paramètre `q`
2. **Entrez une valeur**, par exemple: `greek yogurt` ou `pizza`
3. ⚠️ **Ne laissez PAS le champ vide** - le paramètre `q` est obligatoire

#### Étape 3: Exemple de configuration correcte

**Dans l'interface RapidAPI:**

```
Endpoint: GET /foods

Query Parameters:
┌─────────────────────────────────────┐
│ Name: q                             │
│ Type: string                        │
│ Required: ✅ Yes                    │
│ Value: greek yogurt  ← REMPLIR ICI │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Name: limit                         │
│ Type: integer                       │
│ Required: ❌ No                     │
│ Value: 10 (optionnel)               │
└─────────────────────────────────────┘
```

#### Étape 4: Vérifier l'URL générée

L'URL finale devrait ressembler à:
```
GET /foods?q=greek%20yogurt&limit=10
```

Si vous voyez seulement:
```
GET /foods
```
ou
```
GET /foods?limit=10
```
→ Le paramètre `q` manque ! Ajoutez-le.

### 📸 Capture d'écran (référence visuelle)

Dans RapidAPI, vous devriez voir quelque chose comme:

```
┌─────────────────────────────────────────────┐
│ Method: GET                                 │
│ Endpoint: /foods                            │
│                                             │
│ Query Parameters:                           │
│ ┌───────────────────────────────────────┐   │
│ │ q: [greek yogurt] ← Champ à remplir   │   │
│ │ ☑ Required                            │   │
│ └───────────────────────────────────────┘   │
│ ┌───────────────────────────────────────┐   │
│ │ limit: [10] (optionnel)               │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ [Test Endpoint]                             │
└─────────────────────────────────────────────┘
```

### ✅ Test de vérification

Une fois configuré correctement, vous devriez recevoir une réponse comme:

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

## 💻 Exemples de Code - Utilisation Correcte

### ⚠️ Erreur Commune: Mauvais Nom de Paramètre

Beaucoup d'utilisateurs font cette erreur en utilisant `food` au lieu de `q`:

#### ❌ MAUVAIS (ne fonctionnera PAS):
```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://labelguard.p.rapidapi.com/foods',
  params: {
    food: 'greek yogurt'  // ❌ MAUVAIS - utilise 'food' au lieu de 'q'
  },
  headers: {
    'X-RapidAPI-Key': 'votre-cle-api',
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
  }
};
```

#### ✅ CORRECT:
```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://labelguard.p.rapidapi.com/foods',
  params: {
    q: 'greek yogurt'  // ✅ CORRECT - utilise 'q' comme nom de paramètre
  },
  headers: {
    'X-RapidAPI-Key': 'votre-cle-api',
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

### 📝 Exemples Complets pour Différents Langages

#### JavaScript (Axios) - ✅ CORRECT
```javascript
const axios = require('axios');

const options = {
  method: 'GET',
  url: 'https://labelguard.p.rapidapi.com/foods',
  params: {
    q: 'greek yogurt',      // ✅ 'q' est le nom correct
    limit: 10               // optionnel
  },
  headers: {
    'X-RapidAPI-Key': 'votre-cle-api',
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
  }
};

const response = await axios.request(options);
console.log(response.data);
```

#### JavaScript (Fetch API) - ✅ CORRECT
```javascript
const url = new URL('https://labelguard.p.rapidapi.com/foods');
url.searchParams.append('q', 'greek yogurt');  // ✅ 'q' est le nom correct
url.searchParams.append('limit', '10');

const response = await fetch(url, {
  headers: {
    'X-RapidAPI-Key': 'votre-cle-api',
    'X-RapidAPI-Host': 'labelguard.p.rapidapi.com'
  }
});

const data = await response.json();
console.log(data);
```

#### Python (requests) - ✅ CORRECT
```python
import requests

url = "https://labelguard.p.rapidapi.com/foods"

querystring = {
    "q": "greek yogurt",      # ✅ 'q' est le nom correct
    "limit": "10"             # optionnel
}

headers = {
    "X-RapidAPI-Key": "votre-cle-api",
    "X-RapidAPI-Host": "labelguard.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)
print(response.json())
```

#### cURL - ✅ CORRECT
```bash
curl 'https://labelguard.p.rapidapi.com/foods?q=greek%20yogurt&limit=10' \
  -H 'X-RapidAPI-Key: votre-cle-api' \
  -H 'X-RapidAPI-Host: labelguard.p.rapidapi.com'
```

### 🎯 Règle à Retenir

**Le paramètre de recherche s'appelle toujours `q` (lettre minuscule), jamais `food`, `query`, `search`, ou autre chose.**

---

## 📚 Documentation Complète

Pour plus d'exemples et de détails, consultez:
- `API_EXAMPLES.md` - Exemples complets de requêtes
- `openapi.json` - Spécification OpenAPI complète
- `README.md` - Documentation générale de l'API

