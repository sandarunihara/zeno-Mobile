# Zeno Mobile App - Backend Integration Guide

## Overview

This guide explains the required API endpoints and response formats for the Zeno Mobile App to function correctly.

## Base Configuration

- **Base URL**: `http://localhost:8080`
- **Protocol**: HTTP/REST - **Note: Change to HTTPS in production**
- **Content-Type**: `application/json`
- **Authentication**: Bearer token in Authorization header

## Required Endpoints

### 1. POST /api/auth/signup

Register a new user account.

**Request Body:**
```json
{
  "fname": "John",
  "lname": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 - Success):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "User registered successfully"
}
```

**Response (400/409 - Error):**
```json
{
  "message": "Email already registered",
  "error": "DUPLICATE_EMAIL"
}
```

**Requirements:**
- [ ] Validate all fields are provided
- [ ] Validate email format
- [ ] Validate password strength (minimum 6 characters recommended)
- [ ] Hash password before storing
- [ ] Generate JWT accessToken (short-lived, recommend 15 minutes)
- [ ] Generate JWT refreshToken (long-lived, recommend 7 days)
- [ ] Return both tokens immediately
- [ ] Return consistent error messages

---

### 2. POST /api/auth/login

Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 - Success):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

**Response (401 - Error):**
```json
{
  "message": "Invalid email or password",
  "error": "INVALID_CREDENTIALS"
}
```

**Requirements:**
- [ ] Validate email and password are provided
- [ ] Verify password matches hash
- [ ] Return new JWT tokens
- [ ] Don't reveal whether email exists (security best practice)
- [ ] Rate limit login attempts (prevent brute force)

---

### 3. POST /api/auth/refresh

Refresh expired access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 - Success):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

**Response (401 - Error):**
```json
{
  "message": "Invalid or expired refresh token",
  "error": "INVALID_REFRESH_TOKEN"
}
```

**Requirements:**
- [ ] Validate refresh token is provided
- [ ] Verify token signature and expiration
- [ ] Generate new accessToken
- [ ] Optionally rotate refresh token (return new one)
- [ ] Return 401 for invalid/expired tokens
- [ ] **CRITICAL**: This endpoint is called by the mobile app on every 401 response

---

## CORS Configuration

The mobile app will request from `localhost:19000` and `localhost:19001` (Expo dev servers).

**Required CORS Headers:**

```
Access-Control-Allow-Origin: http://localhost:19000, http://localhost:19001
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**Spring Boot Configuration Example:**

```java
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins(
                "http://localhost:19000",
                "http://localhost:19001"
            )
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
```

---

## Authentication Flow

### Token Header Format

All authenticated requests from the mobile app will include:

```
Authorization: Bearer <accessToken>
```

Example:
```
GET /api/user/profile HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 401 Response Handling

When mobile app receives a `401 Unauthorized` response:

1. Interceptor catches the error
2. Grabs `refreshToken` from device secure storage
3. **Calls POST /api/auth/refresh** with refreshToken
4. Saves new `accessToken` from response
5. Automatically retries the original request with new token
6. If refresh returns 401 again, user is logged out

**This is CRITICAL** - The refresh endpoint must:
- Accept the refresh token passed by the mobile app
- Not require any other authentication
- Return a fresh access token

---

## JWT Token Guidelines

### Access Token (Short-lived)
- **TTL**: 15-30 minutes recommended
- **Used for**: API requests
- **Should include**: user ID, roles, permissions
- **Format**: Include expiration claim (`exp`)

Example JWT Payload:
```json
{
  "sub": "user123",
  "email": "john@example.com",
  "roles": ["user"],
  "iat": 1626873600,
  "exp": 1626877200
}
```

### Refresh Token (Long-lived)
- **TTL**: 7-30 days recommended
- **Used for**: Obtaining new access tokens
- **Should include**: user ID, token version
- **Format**: Include expiration claim (`exp`)
- **Storage**: Store securely on backend (no password reuse)

Example JWT Payload:
```json
{
  "sub": "user123",
  "type": "refresh",
  "version": 1,
  "iat": 1626873600,
  "exp": 1627478400
}
```

---

## Error Handling Standards

All error responses should follow this format:

```json
{
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/auth/login"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid credentials or expired token)
- `409` - Conflict (email already exists)
- `500` - Internal Server Error

---

## Security Best Practices

### 1. Password Security
```
✅ Hash passwords using bcrypt/Argon2
✅ Validate password strength
✅ Don't return password in responses
✅ Implement rate limiting on login attempts
❌ Don't store plain-text passwords
❌ Don't leak user existence status
```

### 2. Token Security
```
✅ Sign tokens with a strong secret
✅ Validate token signatures on every request
✅ Check token expiration
✅ Implement token rotation
✅ Use HTTPS in production
❌ Don't send tokens in URL parameters
❌ Don't expose token secrets
```

### 3. API Security
```
✅ Implement rate limiting
✅ Validate all inputs
✅ Use parameterized queries (prevent SQL injection)
✅ Implement CORS properly
✅ Use HTTPS/TLS in production
✅ Log authentication attempts
❌ Don't expose stack traces to clients
❌ Don't disable security features
```

---

## Testing the Endpoints

### Using cURL

**1. Sign Up:**
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "message": "User registered successfully"
}
```

**2. Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**3. Refresh Token:**
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJ..."
  }'
```

**4. Verify Token (if you have a protected endpoint):**
```bash
curl -X GET http://localhost:8080/api/user/profile \
  -H "Authorization: Bearer eyJ..."
```

---

## Mobile App Token Handling

### When Signing Up / Logging In
```typescript
const response = await axios.post('/api/auth/login', { email, password });
const { accessToken, refreshToken } = response.data;

// Mobile app immediately saves:
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);
```

### On Every API Request
```typescript
// Request interceptor adds token:
const token = await SecureStore.getItemAsync('accessToken');
config.headers.Authorization = `Bearer ${token}`;
```

### When Receiving 401
```typescript
// Response interceptor handles it:
if (error.response.status === 401) {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');
  const newTokens = await axios.post('/api/auth/refresh', { refreshToken });
  
  // Save new accessToken
  await SecureStore.setItemAsync('accessToken', newTokens.data.accessToken);
  
  // Retry original request
  return axios(originalRequest);
}
```

### On Logout
```typescript
// Mobile app clears tokens:
await SecureStore.deleteItemAsync('accessToken');
await SecureStore.deleteItemAsync('refreshToken');
```

---

## Deployment Considerations

### Environment Variables
```bash
# Development
API_BASE_URL=http://localhost:8080
JWT_SECRET=your-dev-secret

# Production
API_BASE_URL=https://api.zeno-app.com
JWT_SECRET=your-prod-secret-use-env-var
```

### HTTPS in Production
Change from `http://localhost:8080` to `https://api.zeno-app.com` in:
- Mobile app `.env` file
- All API calls

### Rate Limiting
Recommended limits:
- Signup: 5 attempts per hour per IP
- Login: 10 attempts per 15 minutes per IP
- Refresh token: 100 per hour per user

---

## Troubleshooting

### Issue: "CORS error" when Mobile App calls API
**Solution**: Ensure CORS config includes `http://localhost:19000` and `http://localhost:19001`

### Issue: "401 Unauthorized" on every request
**Solution**: Check that:
- Access token is valid (not expired)
- Token signature matches your secret
- Request includes `Authorization: Bearer` header

### Issue: Token refresh returns 401 (infinite redirect)
**Solution**: Ensure:
- Refresh token is valid
- `/api/auth/refresh` endpoint is implemented
- Endpoint returns `accessToken` in response

### Issue: "Email already registered" but can't login
**Solution**: Check user exists and password hash comparison works

---

## Validation Requirements

| Field | Rules | Example |
|-------|-------|---------|
| `fname` | Required, string, 1-50 chars | "John" |
| `lname` | Required, string, 1-50 chars | "Doe" |
| `email` | Required, valid email format | "john@example.com" |
| `password` | Required, min 6 chars | "MyPassword123!" |

---

## Sample Implementation (Spring Boot + JWT)

See the Zeno backend repository for full implementation examples of these endpoints with:
- Spring Security
- JWT tokens
- Password hashing
- Error handling
- CORS configuration

---

## Questions?

Refer to the mobile app documentation in [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) or the main [README.md](./README.md) for client-side details.
