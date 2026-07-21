export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiAccess = "public" | "optional-auth" | "user" | "admin" | "webhook";

export type ApiRouteContract = {
  method: HttpMethod;
  path: string;
  owner: string;
  access: ApiAccess;
  summary: string;
  validation: string[];
  policy: string[];
  responseDto: string;
  cache: "public" | "private" | "no-store" | "none";
};

const paginatedQuery = ["page>=1", "limit<=50", "sort/filter allowlist"];
const uuidParam = ["uuid path param"];
const csrfMutation = ["exact Origin", "CSRF token"];
const adminPolicy = ["authenticated", "ADMIN role"];
const userPolicy = ["authenticated"];

export const apiRouteContracts: ApiRouteContract[] = [
  { method: "GET", path: "/api/health", owner: "ops", access: "public", summary: "Health probe", validation: [], policy: [], responseDto: "HealthDto", cache: "none" },
  { method: "GET", path: "/api/ready", owner: "ops", access: "public", summary: "Readiness probe", validation: [], policy: [], responseDto: "ReadyDto", cache: "none" },
  { method: "GET", path: "/api/openapi.json", owner: "contracts", access: "public", summary: "OpenAPI contract", validation: [], policy: [], responseDto: "OpenApiDocumentDto", cache: "public" },
  { method: "POST", path: "/api/auth/register", owner: "auth", access: "public", summary: "Register account", validation: ["registerSchema"], policy: ["trusted origin", "auth rate limit"], responseDto: "AuthSessionDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/login", owner: "auth", access: "public", summary: "Login", validation: ["loginSchema"], policy: ["trusted origin", "auth rate limit"], responseDto: "AuthSessionDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/forgot-password", owner: "auth", access: "public", summary: "Request password reset", validation: ["forgotPasswordSchema"], policy: ["trusted origin", "auth rate limit"], responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/reset-password", owner: "auth", access: "public", summary: "Reset password", validation: ["resetPasswordSchema"], policy: ["trusted origin", "auth rate limit"], responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/refresh", owner: "auth", access: "public", summary: "Refresh session", validation: csrfMutation, policy: ["refresh cookie family rotation"], responseDto: "AuthSessionDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/logout", owner: "auth", access: "public", summary: "Logout current session", validation: csrfMutation, policy: ["refresh cookie family revoke"], responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/auth/me", owner: "auth", access: "user", summary: "Current user", validation: [], policy: userPolicy, responseDto: "SafeUserDto", cache: "private" },
  { method: "GET", path: "/api/auth/sessions", owner: "auth", access: "user", summary: "List sessions", validation: [], policy: userPolicy, responseDto: "SessionListDto", cache: "private" },
  { method: "DELETE", path: "/api/auth/sessions/{sessionId}", owner: "auth", access: "user", summary: "Revoke session", validation: ["sessionIdParamsSchema", ...csrfMutation], policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/logout-all", owner: "auth", access: "user", summary: "Logout all sessions", validation: csrfMutation, policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/auth/change-password", owner: "auth", access: "user", summary: "Change password", validation: ["changePasswordSchema", ...csrfMutation], policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/media", owner: "media", access: "admin", summary: "Create media", validation: ["multipart image", "createMediaSchema"], policy: adminPolicy, responseDto: "MediaDetailDto", cache: "no-store" },
  { method: "GET", path: "/api/media/by-id/{id}", owner: "media", access: "admin", summary: "Admin media by id", validation: uuidParam, policy: adminPolicy, responseDto: "MediaDetailDto", cache: "private" },
  { method: "PUT", path: "/api/media/{id}", owner: "media", access: "admin", summary: "Update media", validation: ["multipart image", "updateMediaSchema", ...uuidParam], policy: adminPolicy, responseDto: "MediaDetailDto", cache: "no-store" },
  { method: "DELETE", path: "/api/media/{id}", owner: "media", access: "admin", summary: "Delete media", validation: uuidParam, policy: adminPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/media", owner: "media", access: "public", summary: "List media", validation: ["mediaQuerySchema", ...paginatedQuery], policy: [], responseDto: "MediaListDto", cache: "public" },
  { method: "GET", path: "/api/media/genres", owner: "media", access: "public", summary: "List genres", validation: [], policy: [], responseDto: "GenreListDto", cache: "public" },
  { method: "GET", path: "/api/media/{slug}/related", owner: "media", access: "public", summary: "Related media", validation: ["slug", "limit<=20"], policy: [], responseDto: "MediaSummaryListDto", cache: "public" },
  { method: "GET", path: "/api/media/{slug}/stream", owner: "media", access: "user", summary: "Stream URL", validation: ["slug"], policy: ["authenticated", "premium entitlement"], responseDto: "StreamDto", cache: "private" },
  { method: "GET", path: "/api/media/{slug}", owner: "media", access: "optional-auth", summary: "Media detail", validation: ["slug"], policy: ["hide premium link unless entitled"], responseDto: "MediaDetailDto", cache: "private" },
  { method: "POST", path: "/api/media/{slug}/view", owner: "media", access: "optional-auth", summary: "Record media view", validation: ["slug"], policy: ["deduplicated by bounded key"], responseDto: "ViewRecordDto", cache: "no-store" },
  { method: "GET", path: "/api/reviews/media/{slug}", owner: "reviews", access: "public", summary: "Approved media reviews", validation: ["reviewQuerySchema", ...paginatedQuery], policy: ["approved visibility"], responseDto: "ReviewListDto", cache: "public" },
  { method: "GET", path: "/api/reviews/media/{slug}/mine", owner: "reviews", access: "user", summary: "My review for media", validation: ["slug"], policy: userPolicy, responseDto: "ReviewNullableDto", cache: "private" },
  { method: "POST", path: "/api/reviews", owner: "reviews", access: "user", summary: "Create review", validation: ["createReviewSchema"], policy: ["authenticated", "one review per user/media"], responseDto: "ReviewDto", cache: "no-store" },
  { method: "PUT", path: "/api/reviews/{id}", owner: "reviews", access: "user", summary: "Update review", validation: ["updateReviewSchema", ...uuidParam], policy: ["owner or admin"], responseDto: "ReviewDto", cache: "no-store" },
  { method: "DELETE", path: "/api/reviews/{id}", owner: "reviews", access: "user", summary: "Delete review", validation: uuidParam, policy: ["owner or admin"], responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/reviews/mine", owner: "reviews", access: "user", summary: "My reviews", validation: ["reviewQuerySchema", ...paginatedQuery], policy: userPolicy, responseDto: "ReviewListDto", cache: "private" },
  { method: "GET", path: "/api/reviews/{id}/comments", owner: "comments", access: "public", summary: "Review comments", validation: uuidParam, policy: ["approved parent visibility"], responseDto: "CommentListDto", cache: "public" },
  { method: "POST", path: "/api/reviews/{id}/comments", owner: "comments", access: "user", summary: "Create comment", validation: ["createCommentSchema", ...uuidParam], policy: userPolicy, responseDto: "CommentDto", cache: "no-store" },
  { method: "DELETE", path: "/api/reviews/{id}/comments/{commentId}", owner: "comments", access: "user", summary: "Delete comment", validation: uuidParam, policy: ["owner or admin"], responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/reviews/{id}/like", owner: "reviews", access: "user", summary: "Toggle like", validation: uuidParam, policy: userPolicy, responseDto: "ReviewLikeDto", cache: "no-store" },
  { method: "POST", path: "/api/reviews/{id}/report", owner: "reviews", access: "user", summary: "Report review", validation: ["createReviewReportSchema", ...uuidParam], policy: userPolicy, responseDto: "ReviewReportDto", cache: "no-store" },
  { method: "GET", path: "/api/reviews/pending", owner: "reviews", access: "admin", summary: "Pending reviews", validation: ["reviewQuerySchema", ...paginatedQuery], policy: adminPolicy, responseDto: "ReviewListDto", cache: "private" },
  { method: "GET", path: "/api/reviews/reports", owner: "reviews", access: "admin", summary: "Review reports", validation: ["reviewReportQuerySchema", ...paginatedQuery], policy: adminPolicy, responseDto: "ReviewReportListDto", cache: "private" },
  { method: "POST", path: "/api/reviews/reports/{reportId}/resolve", owner: "reviews", access: "admin", summary: "Resolve report", validation: ["resolveReviewReportSchema", ...uuidParam], policy: adminPolicy, responseDto: "ReviewReportDto", cache: "no-store" },
  { method: "POST", path: "/api/reviews/{id}/approve", owner: "reviews", access: "admin", summary: "Approve review", validation: uuidParam, policy: adminPolicy, responseDto: "ReviewDto", cache: "no-store" },
  { method: "POST", path: "/api/reviews/{id}/reject", owner: "reviews", access: "admin", summary: "Reject review", validation: uuidParam, policy: adminPolicy, responseDto: "ReviewDto", cache: "no-store" },
  { method: "POST", path: "/api/upload/image", owner: "upload", access: "admin", summary: "Upload image", validation: ["multipart image"], policy: adminPolicy, responseDto: "AssetDto", cache: "no-store" },
  { method: "DELETE", path: "/api/upload/{publicId}", owner: "upload", access: "admin", summary: "Delete uploaded image", validation: ["publicId path"], policy: adminPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/watchlist", owner: "watchlist", access: "user", summary: "My watchlist", validation: [], policy: userPolicy, responseDto: "WatchlistDto", cache: "private" },
  { method: "POST", path: "/api/watchlist", owner: "watchlist", access: "user", summary: "Add to watchlist", validation: ["mediaId uuid body"], policy: userPolicy, responseDto: "WatchlistItemDto", cache: "no-store" },
  { method: "DELETE", path: "/api/watchlist/{mediaId}", owner: "watchlist", access: "user", summary: "Remove from watchlist", validation: ["mediaId uuid param"], policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/dashboard", owner: "dashboard", access: "user", summary: "User dashboard overview", validation: [], policy: userPolicy, responseDto: "DashboardDto", cache: "private" },
  { method: "GET", path: "/api/profile", owner: "profile", access: "user", summary: "My profile", validation: [], policy: userPolicy, responseDto: "ProfileDto", cache: "private" },
  { method: "PUT", path: "/api/profile", owner: "profile", access: "user", summary: "Update my profile", validation: ["updateProfileSchema"], policy: userPolicy, responseDto: "ProfileDto", cache: "no-store" },
  { method: "POST", path: "/api/profile/image", owner: "profile", access: "user", summary: "Upload profile image", validation: ["multipart image"], policy: userPolicy, responseDto: "ProfileImageDto", cache: "no-store" },
  { method: "DELETE", path: "/api/profile/image", owner: "profile", access: "user", summary: "Delete profile image", validation: [], policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/admin/dashboard", owner: "admin", access: "admin", summary: "Admin dashboard", validation: [], policy: adminPolicy, responseDto: "AdminDashboardDto", cache: "private" },
  { method: "GET", path: "/api/admin/users", owner: "admin-users", access: "admin", summary: "List users", validation: paginatedQuery, policy: adminPolicy, responseDto: "AdminUserListDto", cache: "private" },
  { method: "GET", path: "/api/admin/users/{id}", owner: "admin-users", access: "admin", summary: "User detail", validation: uuidParam, policy: adminPolicy, responseDto: "AdminUserDetailDto", cache: "private" },
  { method: "POST", path: "/api/admin/users/{id}/deactivate", owner: "admin-users", access: "admin", summary: "Deactivate user", validation: uuidParam, policy: adminPolicy, responseDto: "AdminUserDetailDto", cache: "no-store" },
  { method: "POST", path: "/api/admin/users/{id}/reactivate", owner: "admin-users", access: "admin", summary: "Reactivate user", validation: uuidParam, policy: adminPolicy, responseDto: "AdminUserDetailDto", cache: "no-store" },
  { method: "POST", path: "/api/cleanup", owner: "ops", access: "admin", summary: "Run cleanup job", validation: [], policy: adminPolicy, responseDto: "CleanupResultDto", cache: "no-store" },
  { method: "GET", path: "/api/payments/plans", owner: "payments", access: "public", summary: "Plan facts", validation: [], policy: [], responseDto: "PlanListDto", cache: "public" },
  { method: "POST", path: "/api/payments/checkout", owner: "payments", access: "user", summary: "Create checkout", validation: ["plan allowlist", "returnPath allowlist", ...csrfMutation], policy: userPolicy, responseDto: "CheckoutAttemptDto", cache: "no-store" },
  { method: "GET", path: "/api/payments/checkout/outcome", owner: "payments", access: "user", summary: "Checkout outcome", validation: ["sessionId"], policy: ["owned checkout attempt"], responseDto: "CheckoutOutcomeDto", cache: "private" },
  { method: "GET", path: "/api/payments/subscription", owner: "payments", access: "user", summary: "Current subscription", validation: [], policy: userPolicy, responseDto: "SubscriptionDto", cache: "private" },
  { method: "POST", path: "/api/payments/cancel", owner: "payments", access: "user", summary: "Cancel at period end", validation: csrfMutation, policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/payments/resume", owner: "payments", access: "user", summary: "Resume renewal", validation: csrfMutation, policy: userPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "GET", path: "/api/payments/reconcile", owner: "payments", access: "admin", summary: "Dry-run reconciliation", validation: ["days 1-90"], policy: adminPolicy, responseDto: "ReconciliationReportDto", cache: "private" },
  { method: "POST", path: "/api/contact", owner: "contact", access: "public", summary: "Submit contact", validation: ["submitContactSchema"], policy: ["rate limited by global policy"], responseDto: "ContactSubmissionDto", cache: "no-store" },
  { method: "GET", path: "/api/contact", owner: "contact", access: "admin", summary: "List contacts", validation: paginatedQuery, policy: adminPolicy, responseDto: "ContactListDto", cache: "private" },
  { method: "PATCH", path: "/api/contact/{id}", owner: "contact", access: "admin", summary: "Update contact status", validation: ["updateContactSchema", ...uuidParam], policy: adminPolicy, responseDto: "ContactDto", cache: "no-store" },
  { method: "GET", path: "/api/content", owner: "content", access: "public", summary: "Published content", validation: [], policy: ["published only"], responseDto: "ContentListDto", cache: "public" },
  { method: "GET", path: "/api/content/admin/all", owner: "content", access: "admin", summary: "All content", validation: [], policy: adminPolicy, responseDto: "ContentListDto", cache: "private" },
  { method: "GET", path: "/api/content/{slug}", owner: "content", access: "public", summary: "Published content detail", validation: ["slug"], policy: ["published only"], responseDto: "ContentDto", cache: "public" },
  { method: "POST", path: "/api/content", owner: "content", access: "admin", summary: "Create content", validation: ["createContentSchema"], policy: adminPolicy, responseDto: "ContentDto", cache: "no-store" },
  { method: "PUT", path: "/api/content/{id}", owner: "content", access: "admin", summary: "Update content", validation: ["updateContentSchema", ...uuidParam], policy: adminPolicy, responseDto: "ContentDto", cache: "no-store" },
  { method: "DELETE", path: "/api/content/{id}", owner: "content", access: "admin", summary: "Delete content", validation: uuidParam, policy: adminPolicy, responseDto: "GenericMessageDto", cache: "no-store" },
  { method: "POST", path: "/api/webhooks/stripe", owner: "payments", access: "webhook", summary: "Stripe webhook", validation: ["raw body", "Stripe signature"], policy: ["provider signed event"], responseDto: "WebhookAckDto", cache: "none" },
];

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of apiRouteContracts) {
    const path = route.path.replace(/\{([^}]+)\}/g, "{$1}");
    paths[path] ??= {};
    paths[path][route.method.toLowerCase()] = {
      summary: route.summary,
      tags: [route.owner],
      "x-access": route.access,
      "x-validation": route.validation,
      "x-policy": route.policy,
      "x-response-dto": route.responseDto,
      responses: {
        "200": { description: `Success envelope containing ${route.responseDto}` },
        "400": { description: "Validation error envelope" },
        "401": { description: "Authentication error envelope" },
        "403": { description: "Policy error envelope" },
        "404": { description: "Not found error envelope" },
        "409": { description: "Conflict error envelope" },
        "500": { description: "Internal error envelope" },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "CineTube API",
      version: "phase-2-contract",
      description:
        "Source-owned API route baseline. Responses use { success, requestId, data|error, meta? } envelopes.",
    },
    servers: [{ url: "/api" }],
    paths,
    components: {
      schemas: {
        SuccessEnvelope: {
          type: "object",
          required: ["success", "requestId", "data"],
          properties: {
            success: { const: true },
            requestId: { type: "string" },
            data: {},
            meta: { type: "object" },
          },
        },
        ErrorEnvelope: {
          type: "object",
          required: ["success", "requestId", "error"],
          properties: {
            success: { const: false },
            requestId: { type: "string" },
            error: {
              type: "object",
              required: ["message", "code"],
              properties: {
                message: { type: "string" },
                code: { type: "string" },
                details: {},
              },
            },
          },
        },
      },
    },
  };
}
