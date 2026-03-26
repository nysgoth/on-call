# API Документация

## Базов URL

```
http://localhost:8000
```

## Автентикация

Всички защитени endpoints изискват JWT токен в header:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Автентикация

#### POST /auth/login
Вход в системата и получаване на токен.

**Request Body:**
```json
{
  "username": "engineer1",
  "password": "engineer123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "engineer1",
    "email": "engineer1@company.com",
    "role": "engineer",
    "created_at": "2024-01-15T10:00:00"
  }
}
```

#### GET /auth/me
Получаване на информация за текущия потребител.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "username": "engineer1",
  "email": "engineer1@company.com",
  "role": "engineer",
  "created_at": "2024-01-15T10:00:00"
}
```

---

### 2. Инциденти

#### POST /incidents
Създаване на нов инцидент.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "incident_start": "2024-01-15T10:00:00",
  "incident_end": "2024-01-15T12:00:00",
  "on_call_engineer": "engineer1",
  "incident_type": "outage",
  "severity": 3,
  "description": "Service outage occurred",
  "resolution": "Restarted service"
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "incident_start": "2024-01-15T10:00:00",
  "incident_end": "2024-01-15T12:00:00",
  "on_call_engineer": "engineer1",
  "incident_type": "outage",
  "severity": 3,
  "description": "Service outage occurred",
  "resolution": "Restarted service",
  "manager_reviewed": false,
  "manager_reviewed_at": null,
  "manager_name": null,
  "created_at": "2024-01-15T10:05:00",
  "updated_at": "2024-01-15T10:05:00"
}
```

#### GET /incidents
Списък с инциденти с филтри и пагинация.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `skip` (int, default: 0) - Брой пропуснати записи
- `limit` (int, default: 100, max: 1000) - Брой записи на страница
- `date_from` (date, optional) - Филтър от дата (YYYY-MM-DD)
- `date_to` (date, optional) - Филтър до дата (YYYY-MM-DD)
- `on_call_engineer` (string, optional) - Филтър по инженер
- `manager_reviewed` (boolean, optional) - Филтър по статус
- `severity` (int, optional, 1-5) - Филтър по сериозност
- `sort_by` (string, default: "incident_start") - Поле за сортиране: `incident_start`, `created_at`, `severity`
- `sort_order` (string, default: "desc") - Посока: `asc` или `desc`

**Пример:**
```
GET /incidents?manager_reviewed=false&severity=3&skip=0&limit=20
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "incident_start": "2024-01-15T10:00:00",
      ...
    }
  ],
  "total": 50,
  "skip": 0,
  "limit": 20
}
```

#### GET /incidents/{id}
Получаване на детайли за конкретен инцидент.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "incident_start": "2024-01-15T10:00:00",
  "incident_end": "2024-01-15T12:00:00",
  "on_call_engineer": "engineer1",
  "incident_type": "outage",
  "severity": 3,
  "description": "Service outage occurred",
  "resolution": "Restarted service",
  "manager_reviewed": true,
  "manager_reviewed_at": "2024-01-15T14:00:00",
  "manager_name": "manager1",
  "created_at": "2024-01-15T10:05:00",
  "updated_at": "2024-01-15T14:00:00"
}
```

#### PUT /incidents/{id}
Обновяване на инцидент (само автор или admin).

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (всички полета са опционални)
```json
{
  "incident_start": "2024-01-15T10:00:00",
  "incident_end": "2024-01-15T12:00:00",
  "incident_type": "alert",
  "severity": 2,
  "description": "Updated description",
  "resolution": "Updated resolution"
}
```

**Response:** Обновеният инцидент

#### PATCH /incidents/{id}/review
Маркиране на инцидент като прегледан (само manager/admin).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "reviewed": true
}
```

**Response:** Обновеният инцидент с `manager_reviewed=true`, `manager_reviewed_at` и `manager_name`

#### DELETE /incidents/{id}
Изтриване на инцидент (само admin).

**Headers:** `Authorization: Bearer <token>`

**Response:** 204 No Content

#### GET /incidents/{id}/audit
Получаване на audit log за инцидент.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "uuid",
    "incident_id": "uuid",
    "action": "CREATE",
    "changed_by": "engineer1",
    "changed_at": "2024-01-15T10:05:00",
    "old_values": null,
    "new_values": {
      "incident_start": "2024-01-15T10:00:00",
      "on_call_engineer": "engineer1",
      ...
    }
  },
  {
    "id": "uuid",
    "incident_id": "uuid",
    "action": "REVIEW",
    "changed_by": "manager1",
    "changed_at": "2024-01-15T14:00:00",
    "old_values": {
      "manager_reviewed": false
    },
    "new_values": {
      "manager_reviewed": true,
      "manager_reviewed_at": "2024-01-15T14:00:00",
      "manager_name": "manager1"
    }
  }
]
```

---

## Кодове на грешки

- `200 OK` - Успешна заявка
- `201 Created` - Успешно създаване
- `204 No Content` - Успешно изтриване
- `400 Bad Request` - Невалидни данни
- `401 Unauthorized` - Липсва или невалиден токен
- `403 Forbidden` - Нямате права за това действие
- `404 Not Found` - Ресурсът не е намерен
- `500 Internal Server Error` - Сървърна грешка

---

## Примери с curl

### Вход
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "engineer1", "password": "engineer123"}'
```

### Създаване на инцидент
```bash
curl -X POST http://localhost:8000/incidents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_start": "2024-01-15T10:00:00",
    "on_call_engineer": "engineer1",
    "incident_type": "outage",
    "severity": 3,
    "description": "Service outage"
  }'
```

### Списък с филтри
```bash
curl "http://localhost:8000/incidents?manager_reviewed=false&severity=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Маркиране като прегледан
```bash
curl -X PATCH http://localhost:8000/incidents/UUID/review \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewed": true}'
```

---

## Интерактивна документация

След стартиране на backend, отворете:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Там можете да тествате всички endpoints интерактивно.

