export type Role = "USER" | "ADMIN";
export type MediaType = "MOVIE" | "SERIES";
export type PricingType = "FREE" | "PREMIUM";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SubscriptionTier = "FREE" | "MONTHLY" | "YEARLY";
export type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "INCOMPLETE"
  | "PAST_DUE"
  | "TRIALING";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type ReportReason =
  | "SPAM"
  | "SPOILER"
  | "HARASSMENT"
  | "INAPPROPRIATE"
  | "OTHER";
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";

// User

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  image: string | null;
  emailVerified: string | null;
  createdAt: string;
}

export interface UserProfile extends User {
  profile: {
    bio: string | null;
    favoriteGenres: string[];
    website: string | null;
    twitter: string | null;
    facebook: string | null;
    github: string | null;
  } | null;
}

// Auth

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Media

export interface Media {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  type: MediaType;
  pricingType: PricingType;
  streamingLink: string | null;
  accessRestricted?: boolean;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number;
  director: string;
  cast: string[];
  averageRating: string; // Decimal as string from Prisma
  reviewsCount: number;
  viewCount: number;
  genres: { genre: { id: string; name: string } }[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaSummary {
  id: string;
  title: string;
  slug: string;
  type: MediaType;
  pricingType: PricingType;
  posterUrl: string | null;
  releaseYear: number;
  averageRating: string;
  reviewsCount: number;
  genres: { genre: { name: string } }[];
}

// Review

export interface Review {
  id: string;
  rating: number;
  content: string;
  tags: string[];
  spoilerWarning: boolean;
  status: ReviewStatus;
  publishedAt: string | null;
  userId: string;
  mediaId: string;
  user: Pick<User, "id" | "name" | "image">;
  _count?: { likes: number; comments: number };
  createdAt: string;
}

// Comment

export interface Comment {
  id: string;
  content: string;
  userId: string;
  reviewId: string;
  parentId: string | null;
  user: Pick<User, "id" | "name" | "image">;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

// Subscription

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
}

// API Response Envelope

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Query Parameters

export interface MediaQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  genre?: string;
  year?: number;
  type?: MediaType;
  pricingType?: PricingType;
  sortBy?: "latest" | "top-rated" | "popular" | "most-reviewed";
}

export interface ReviewQueryParams {
  page?: number;
  limit?: number;
  mediaId?: string;
  userId?: string;
  status?: ReviewStatus;
}
