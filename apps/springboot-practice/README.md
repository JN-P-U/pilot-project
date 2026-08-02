# Spring Boot Practice

Spring Boot 3.5.0 + Java 21 기반 연습 프로젝트입니다.

## 기술 스택

| 항목 | 버전 |
|---|---|
| Spring Boot | 3.5.0 |
| Java | 21 (LTS) |
| Gradle | 8.12.1 |
| JPA / Hibernate | Spring Boot 기본 내장 |
| H2 | 인메모리 DB (연습용) |
| Lombok | 최신 |
| springdoc-openapi | 2.8.3 |

## 실행 방법

```bash
cd apps/springboot-practice
./gradlew bootRun
```

서버가 뜨면 `http://localhost:8080` 으로 접근 가능합니다.

### Swagger UI (API 문서 & 테스트)

- URL: `http://localhost:8080/swagger-ui/index.html`
- 브라우저에서 바로 API 호출 테스트 가능

### H2 콘솔 (DB 직접 조회)

- URL: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:practicedb`
- 사용자명: `sa` / 비밀번호: (빈칸)

---

## 회원 관리 API

### 기본 URL

```
http://localhost:8080/api/members
```

---

### 1. 회원 등록

```http
POST /api/members
Content-Type: application/json

{
  "email": "hong@example.com",
  "name": "홍길동",
  "password": "1234"
}
```

**응답 (201 Created)**

```json
{
  "id": 1,
  "email": "hong@example.com",
  "name": "홍길동",
  "role": "USER",
  "createdAt": "2026-05-17T10:00:00",
  "updatedAt": "2026-05-17T10:00:00"
}
```

**유효성 검사**
- `email`: 필수, 이메일 형식
- `name`: 필수, 2~20자
- `password`: 필수, 최소 4자

---

### 2. 회원 단건 조회

```http
GET /api/members/{id}
```

**예시**

```http
GET /api/members/1
```

**응답 (200 OK)**

```json
{
  "id": 1,
  "email": "hong@example.com",
  "name": "홍길동",
  "role": "USER",
  "createdAt": "2026-05-17T10:00:00",
  "updatedAt": "2026-05-17T10:00:00"
}
```

---

### 3. 회원 전체 조회

```http
GET /api/members
```

**응답 (200 OK)**

```json
[
  {
    "id": 1,
    "email": "hong@example.com",
    "name": "홍길동",
    "role": "USER",
    "createdAt": "2026-05-17T10:00:00",
    "updatedAt": "2026-05-17T10:00:00"
  }
]
```

---

### 4. 회원 정보 수정

```http
PUT /api/members/{id}
Content-Type: application/json

{
  "name": "홍길순",
  "password": "5678"
}
```

> `name`, `password` 중 원하는 항목만 포함해도 됩니다.

**응답 (200 OK)**

```json
{
  "id": 1,
  "email": "hong@example.com",
  "name": "홍길순",
  "role": "USER",
  "createdAt": "2026-05-17T10:00:00",
  "updatedAt": "2026-05-17T10:05:00"
}
```

---

### 5. 회원 삭제

```http
DELETE /api/members/{id}
```

**응답 (204 No Content)**

---

## curl 예시

```bash
# 회원 등록
curl -X POST http://localhost:8080/api/members \
  -H "Content-Type: application/json" \
  -d '{"email":"hong@example.com","name":"홍길동","password":"1234"}'

# 전체 조회
curl http://localhost:8080/api/members

# 단건 조회
curl http://localhost:8080/api/members/1

# 수정
curl -X PUT http://localhost:8080/api/members/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"홍길순"}'

# 삭제
curl -X DELETE http://localhost:8080/api/members/1
```

---

## 패키지 구조

```
src/main/java/com/practice/
├── SpringbootPracticeApplication.java
├── common/
│   ├── GlobalExceptionHandler.java   # 전역 예외 처리
│   └── OpenApiConfig.java            # Swagger 설정
└── member/
    ├── Member.java                    # 엔티티
    ├── MemberRole.java                # 권한 enum (ADMIN, USER)
    ├── MemberRepository.java          # JPA Repository
    ├── MemberService.java             # 비즈니스 로직
    ├── MemberController.java          # REST API
    └── dto/
        ├── MemberCreateRequest.java
        ├── MemberUpdateRequest.java
        └── MemberResponse.java
```
