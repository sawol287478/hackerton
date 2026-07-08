# API Specification

Base URL:

```text
http://localhost:3000/api
```

Authenticated APIs require:

```http
Authorization: Bearer {accessToken}
```

## 1. Auth

### 1.1 Google Login

```http
POST /auth/login
```

Request:

```json
{
  "idToken": "google_id_token"
}
```

Response:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "isNewUser": true,
  "onboardingCompleted": false
}
```

### 1.2 Refresh Token

```http
POST /auth/refresh
```

Request:

```json
{
  "refreshToken": "..."
}
```

### 1.3 Logout

```http
POST /auth/logout
```

## 2. User

### 2.1 Register Profile

```http
POST /users/profile
```

Request:

```json
{
  "nickname": "JungTem",
  "factionId": 1
}
```

Response:

```json
{
  "message": "프로필 등록 완료"
}
```

### 2.2 My Profile

```http
GET /users/me
```

Response:

```json
{
  "userId": 10,
  "email": "user@example.com",
  "name": "User",
  "nickname": "JungTem",
  "exp": 120,
  "onboardingCompleted": true,
  "faction": {
    "factionId": 1,
    "name": "Blue",
    "color": "#2196F3"
  },
  "ranking": {
    "rankPosition": 18,
    "totalBooks": 3,
    "totalSessions": 5
  }
}
```

### 2.3 Check Nickname

```http
GET /users/check-nickname?nickname=JungTem
```

### 2.4 My Books, Sessions, Libraries

```http
GET /users/me/books?page=1&size=20
GET /users/me/sessions?page=1&size=20
GET /users/me/libraries
```

## 3. Faction

### 3.1 List Factions

```http
GET /factions
```

Each item includes `factionId`, `name`, `color`, `joinType`, `description`, `totalScore`, and `memberCount`.

### 3.2 Create Faction

```http
POST /factions
```

Request:

```json
{
  "name": "BlueDragon",
  "color": "#2196F3",
  "joinType": "FREE",
  "description": "독서를 사랑하는 진영"
}
```

Response:

```json
{
  "factionId": 3,
  "message": "진영 생성 완료"
}
```

## 4. Library

### 4.1 Nearby Libraries

```http
GET /libraries?latitude=37.5665&longitude=126.9780&radius=5000
```

Response:

```json
[
  {
    "libraryId": 1,
    "name": "중앙도서관",
    "address": "서울특별시 중구 ...",
    "latitude": 37.5665,
    "longitude": 126.978,
    "distance": 320,
    "occupiedFaction": {
      "factionId": 1,
      "name": "Blue",
      "color": "#2196F3"
    }
  }
]
```

### 4.2 Library Detail

```http
GET /libraries/{libraryId}
```

Response:

```json
{
  "libraryId": 1,
  "libraryName": "중앙도서관",
  "address": "서울특별시 중구 ...",
  "latitude": 37.5665,
  "longitude": 126.978,
  "operatingHours": "09:00-18:00",
  "closedDays": "월요일",
  "currentOccupiedFaction": {
    "factionId": 1,
    "name": "Blue",
    "color": "#2196F3"
  },
  "influences": [
    { "factionId": 1, "faction": "Blue", "color": "#2196F3", "score": 55 },
    { "factionId": 2, "faction": "Red", "color": "#F44336", "score": 30 }
  ],
  "canStartReading": false
}
```

### 4.3 External Library APIs

```http
GET /libraries/nationwide?pageNo=1&pageSize=100
GET /libraries/nearby/search?latitude=37.5665&longitude=126.9780&radius=5000
GET /libraries/geocode?address=서울특별시 중구 세종대로 110
POST /libraries/sync?pageNo=1&pageSize=50
```

## 5. Books

```http
GET /books?keyword=문학&pageNo=1&pageSize=20
GET /books/isbn/{isbn}
GET /books/isbn/{isbn}/exist?libCode=111000
GET /books/recommendations?keyword=문학&pageNo=1&pageSize=20
```

## 6. Session

### 6.1 Start Reading

```http
POST /sessions/start
```

Request:

```json
{
  "libraryId": 1,
  "isbn": "9788968481901",
  "latitude": 37.5665,
  "longitude": 126.978
}
```

Response:

```json
{
  "sessionId": 31,
  "bookId": 9,
  "startTime": "2026-07-07T15:30:00.000Z",
  "status": "IN_PROGRESS"
}
```

### 6.2 Location Ping

```http
POST /sessions/ping
```

Request:

```json
{
  "sessionId": 31,
  "latitude": 37.566,
  "longitude": 126.978,
  "accuracyMeters": 15
}
```

### 6.3 Submit Verification Material

```http
POST /sessions/{sessionId}/submit
```

Request:

```json
{
  "startPage": 15,
  "endPage": 72,
  "submittedCoverImageUrl": "https://example.com/cover.jpg",
  "reviewText": "책을 읽고..."
}
```

### 6.4 Complete and Grant Reward

```http
POST /sessions/{sessionId}/complete
```

Compatibility route:

```http
POST /sessions/complete
```

Response:

```json
{
  "sessionId": 31,
  "status": "VERIFICATION_PASSED",
  "reward": {
    "exp": 120,
    "influence": 25
  },
  "occupation": {
    "previousFaction": "Red",
    "currentFaction": "Blue",
    "changed": true
  },
  "ranking": {
    "userRank": 18
  }
}
```

## 7. AI Verification

### 7.1 Cover Verification

```http
POST /verify/vision
```

Request:

```json
{
  "sessionId": 31,
  "submittedCoverImageUrl": "https://example.com/cover.jpg"
}
```

### 7.2 Review Verification

```http
POST /verify/llm
```

Request:

```json
{
  "sessionId": 31,
  "reviewText": "책을 읽고..."
}
```

### 7.3 Verification Result

```http
GET /verify/{sessionId}
```

## 8. Ranking

### 8.1 User Ranking

```http
GET /ranking/users?limit=50
```

### 8.2 Faction Ranking

```http
GET /ranking/factions
```
