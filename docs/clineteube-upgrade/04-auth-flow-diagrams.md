# CineTube Authentication Flow Diagrams

> **Discovery date:** 2026-07-13  
> **Reference:** `docs/clineteube-upgrade/03-auth-authorization-subscription-audit.md`

All diagrams are based on verified source-code evidence. Only interactions confirmed in the repository are included.

---

## 1. Registration Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Next.js Frontend
    participant API as Express Backend
    participant DB as PostgreSQL

    U->>FE: Fills register form (name, email, password)
    FE->>FE: Validate with Zod (registerSchema)
    FE->>API: POST /api/auth/register {name, email, password}
    API->>API: authLimiter check
    API->>API: validate(registerSchema) — email lowercased+trimmed
    API->>DB: user.findUnique({where: {email}})
    DB-->>API: null (no existing user)
    API->>API: bcrypt.hash(password, 12)
    API->>DB: user.create({name, email, passwordHash, profile})
    DB-->>API: user {id, name, email, role: "USER", ...}
    API->>API: generateAccessToken(id, email, role)
    API->>API: generateRefreshToken() — 64 random bytes hex
    API->>API: hashToken(refreshToken) — SHA-256
    API->>DB: refreshToken.create({token: hash, userId, expiresAt: now+7d})
    API-->>FE: 201 {success, data: {user, accessToken}} + Set-Cookie: refreshToken (HttpOnly)
    FE->>FE: setAccessToken(token) — stored in module variable
    FE->>FE: setUser(user)
    FE->>U: Redirect to "/"
```

---

## 2. Login Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Next.js Frontend
    participant API as Express Backend
    participant DB as PostgreSQL

    U->>FE: Fills login form (email, password)
    FE->>FE: Validate with Zod (loginSchema)
    FE->>API: POST /api/auth/login {email, password}
    API->>API: authLimiter check
    API->>API: validate(loginSchema)
    API->>DB: user.findUnique({where: {email}})
    DB-->>API: user {id, email, passwordHash, role, isDeleted, ...}

    alt User not found or isDeleted
        API-->>FE: 401 "Invalid email or password" (INVALID_CREDENTIALS)
    end

    alt passwordHash is null (social account)
        API-->>FE: 401 "This account uses social login" (SOCIAL_ACCOUNT)
    end

    API->>API: bcrypt.compare(password, passwordHash)

    alt Password invalid
        API-->>FE: 401 "Invalid email or password" (INVALID_CREDENTIALS)
    end

    API->>API: generateAccessToken(id, email, role)
    API->>API: generateRefreshToken()
    API->>API: hashToken(refreshToken)
    API->>DB: refreshToken.create({token: hash, userId, expiresAt})
    API-->>FE: 200 {success, data: {user, accessToken}} + Set-Cookie: refreshToken
    FE->>FE: setAccessToken(token)
    FE->>FE: setUser(user)
    FE->>U: Redirect to "/" or searchParams.redirect
```

---

## 3. Access-Token API Request

```mermaid
sequenceDiagram
    participant FE as Frontend (apiClient)
    participant API as Express Backend
    participant DB as PostgreSQL

    FE->>FE: Request interceptor reads accessToken from module variable
    FE->>API: GET /api/media (Authorization: Bearer <accessToken>)
    API->>API: authenticate middleware
    API->>API: Extract Bearer token from Authorization header
    API->>API: jwt.verify(token, JWT_SECRET)
    API->>DB: user.findUnique({where: {id: decoded.sub}, select: {id, email, name, role, isDeleted}})
    DB-->>API: user record

    alt User not found or isDeleted
        API-->>FE: 401 "User not found or account deactivated"
    end

    API->>API: req.user = {id, email, name, role} — from DB (fresh)
    API->>API: Controller executes business logic
    API-->>FE: 200 {success, data: {...}}
```

---

## 4. Expired Access Token and Refresh

```mermaid
sequenceDiagram
    participant FE as Frontend (apiClient)
    participant API as Express Backend
    participant DB as PostgreSQL

    FE->>API: GET /api/media (Authorization: Bearer <expired-token>)
    API->>API: jwt.verify(token, JWT_SECRET) — throws TokenExpiredError
    API-->>FE: 401 "Access token expired" (TOKEN_EXPIRED)

    FE->>FE: 401 interceptor: !originalRequest._retry
    FE->>FE: isRefreshing = false → set isRefreshing = true
    FE->>FE: Mark originalRequest._retry = true

    FE->>API: POST /api/auth/refresh (Cookie: refreshToken=<token>)
    API->>API: Read refreshToken from req.cookies
    API->>API: hashToken(refreshToken)
    API->>DB: refreshToken.findUnique({where: {token: hash}, include: {user}})

    alt Token not found
        API-->>FE: 401 "Invalid refresh token"
        FE->>FE: setAccessToken(null), onSessionCleared()
    end

    alt Token expired
        API->>DB: refreshToken.delete({id})
        API-->>FE: 401 "Refresh token expired"
        FE->>FE: setAccessToken(null), onSessionCleared()
    end

    API->>DB: refreshToken.delete({id: oldToken}) — rotation
    API->>API: generateAccessToken(id, email, role)
    API->>API: generateRefreshToken() — new token
    API->>DB: refreshToken.create({token: newHash, userId, expiresAt})
    API-->>FE: 200 {user, accessToken} + Set-Cookie: new refresh token

    FE->>FE: setAccessToken(newAccessToken)
    FE->>FE: processQueue(null) — resolve all queued requests
    FE->>API: Retry original GET /api/media with new token
    API-->>FE: 200 {success, data: {...}}
```

---

## 5. Refresh-Token Rotation

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Express Backend
    participant DB as PostgreSQL

    Note over FE,DB: Refresh Token N (current)

    FE->>API: POST /api/auth/refresh (Cookie: refreshToken=N)
    API->>API: hashToken(N) → hash_N
    API->>DB: refreshToken.findUnique({token: hash_N})
    DB-->>API: Record {id: rec_N, userId, expiresAt}

    API->>API: Check expiresAt > now()
    API->>API: Check user exists and not deleted

    API->>DB: refreshToken.delete({id: rec_N}) — old token revoked
    API->>API: generateAccessToken(userId, email, role)
    API->>API: generateRefreshToken() → N+1
    API->>API: hashToken(N+1) → hash_N+1
    API->>DB: refreshToken.create({token: hash_N+1, userId, expiresAt: now+7d})

    API-->>FE: 200 {user, accessToken} + Set-Cookie: refreshToken=N+1

    Note over FE,DB: Token N is now invalid (deleted from DB)
    Note over FE,DB: Token N+1 is the only valid refresh token
```

---

## 6. Logout Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (AuthProvider)
    participant API as Express Backend
    participant DB as PostgreSQL

    U->>FE: Clicks "Sign Out"
    FE->>API: POST /api/auth/logout (Cookie: refreshToken=<token>)

    Note over API: No authenticate middleware — uses cookie only

    API->>API: Read refreshToken from req.cookies
    API->>API: hashToken(refreshToken)
    API->>DB: refreshToken.deleteMany({where: {token: hash}})
    API->>API: res.clearCookie("refreshToken", options)
    API-->>FE: 200 {message: "Logged out successfully"}

    FE->>FE: setAccessToken(null) — clears module variable
    FE->>FE: setUser(null)
    FE->>U: Redirect to "/login"

    Note over FE: TanStack Query cache is NOT cleared
```

---

## 7. Forgot/Reset Password Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Express Backend
    participant DB as PostgreSQL

    U->>FE: Enters email in forgot-password form
    FE->>API: POST /api/auth/forgot-password {email}
    API->>API: authLimiter check
    API->>DB: user.findUnique({where: {email}})

    alt User not found or deleted
        API-->>FE: 200 {message: "If an account with that email exists..."}
        Note over API: No token created — enumeration prevented
    end

    API->>DB: passwordResetToken.deleteMany({where: {userId}}) — invalidate old
    API->>API: Generate UUID v4 reset token
    API->>DB: passwordResetToken.create({token: plaintext UUID, userId, expiresAt: now+1h})
    API->>API: console.log(`[PASSWORD RESET] Token for ${email}: ${token}`)
    Note over API: No email sent — token logged to server console only
    API-->>FE: 200 {message: "If an account with that email exists..."}

    Note over U,DB: User obtains token (from server logs in dev)

    U->>FE: Navigates to /reset-password?token=<uuid>
    FE->>FE: Reads token from URL searchParams
    U->>FE: Enters new password
    FE->>API: POST /api/auth/reset-password {token, password, confirmPassword}
    API->>API: authLimiter check
    API->>DB: passwordResetToken.findUnique({where: {token}, include: {user}})

    alt Token not found
        API-->>FE: 400 "Invalid or expired reset token"
    end

    alt Token already used
        API-->>FE: 400 "This reset token has already been used"
    end

    alt Token expired
        API-->>FE: 400 "Reset token has expired"
    end

    API->>API: bcrypt.hash(newPassword, 12)
    API->>DB: Transaction:
    Note over DB: 1. user.update({passwordHash})
    Note over DB: 2. passwordResetToken.update({used: true})
    Note over DB: 3. refreshToken.deleteMany({where: {userId}}) — all sessions revoked
    API-->>FE: 200 {message: "Password reset successfully"}
    FE->>U: Redirect to /login after 3 seconds
```

---

## 8. Premium Media Access

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend (browse/[slug])
    participant API as Express Backend
    participant DB as PostgreSQL

    U->>FE: Navigates to /browse/some-movie
    FE->>API: GET /api/media/some-movie (optional auth via Bearer token)
    API->>API: optionalAuthenticate — attaches user if token valid
    API->>DB: media.findUnique({where: {slug}})
    DB-->>API: media {pricingType, streamingLink, ...}

    alt pricingType === "FREE"
        API-->>FE: 200 {media: {streamingLink: "https://...", accessRestricted: false}}
        FE->>U: Shows full media detail with streaming link
    end

    alt pricingType === "PREMIUM" + user has premium
        API->>DB: subscription.findUnique({where: {userId}})
        DB-->>API: {tier: "MONTHLY", status: "ACTIVE", currentPeriodEnd: future}
        API-->>FE: 200 {media: {streamingLink: "https://...", accessRestricted: false}}
        FE->>U: Shows full media detail with streaming link
    end

    alt pricingType === "PREMIUM" + user is FREE tier
        API->>DB: subscription.findUnique({where: {userId}})
        DB-->>API: {tier: "FREE", status: "ACTIVE", ...}
        API-->>FE: 200 {media: {streamingLink: null, accessRestricted: true}}
        FE->>U: Shows media detail with lock icon + upgrade CTA
    end

    alt pricingType === "PREMIUM" + no user (guest)
        API-->>FE: 200 {media: {streamingLink: null, accessRestricted: true}}
        FE->>U: Shows media detail with lock icon + sign-in CTA
    end
```

---

## 9. Admin API Request

```mermaid
sequenceDiagram
    participant A as Admin (Browser)
    participant FE as Frontend (Admin Dashboard)
    participant API as Express Backend
    participant DB as PostgreSQL

    A->>FE: Navigates to /admin
    FE->>FE: Admin layout checks isAuthenticated && user.role === "ADMIN"

    alt Not authenticated or not ADMIN
        FE->>A: Redirect to /login?redirect=/admin
    end

    FE->>API: GET /api/admin/dashboard (Authorization: Bearer <token>)
    API->>API: authenticate middleware
    API->>API: jwt.verify(token) → decoded.sub
    API->>DB: user.findUnique({where: {id: decoded.sub}})
    DB-->>API: user {role: "ADMIN", isDeleted: false}
    API->>API: req.user = {id, email, name, role: "ADMIN"}

    API->>API: authorize({roles: ["ADMIN"]}) middleware
    API->>API: Check req.user.role in ["ADMIN"] → passes

    API->>API: adminController.dashboard
    API->>DB: Multiple aggregate queries (users, media, reviews, etc.)
    DB-->>API: KPI data
    API-->>FE: 200 {success, data: {totalUsers, totalMedia, ...}}
    FE->>A: Renders dashboard with KPI cards
```

---

## Diagram Notes

### Authentication State Summary
| State | Access Token | Refresh Cookie | DB Refresh Record |
|---|---|---|---|
| Logged out | `null` | Absent | None |
| Logged in | JWT in memory | Present (HttpOnly) | Hashed token |
| Token expired | Expired JWT | Present | Hashed token |
| After refresh | New JWT | New cookie | New hashed token |
| After logout | `null` | Cleared | Deleted |
| After password reset | `null` (stale) | Cleared (stale) | All deleted |

### Token Flow Summary
```
Registration/Login → Generate access + refresh → Store hash in DB → Cookie + memory
API Request → Verify JWT → Re-fetch user from DB → Execute handler
401 Response → Refresh interceptor → POST /auth/refresh → Rotate → Retry
Logout → Delete DB record → Clear cookie → Clear memory
Password Reset → Delete ALL refresh records → Clear all sessions
```
