import { z } from "zod";

// Form validation schemas shared across the app. They mirror the backend
// rules so client and server validation stay consistent.

// Auth Schemas

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Profile Schemas

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional()
    .nullable(),
  favoriteGenres: z.array(z.string()).optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  twitter: z.string().max(100).optional().nullable().or(z.literal("")),
  facebook: z.string().max(100).optional().nullable().or(z.literal("")),
  github: z.string().max(100).optional().nullable().or(z.literal("")),
});

// Review Schemas

export const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(10, "Rating must be at most 10"),
  content: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(5000, "Review must be less than 5000 characters"),
  tags: z.array(z.string().max(30)).max(5, "Maximum 5 tags allowed").optional(),
  spoilerWarning: z.boolean().default(false),
  mediaId: z.string().uuid("Invalid media ID"),
});

// Comment Schemas

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be less than 1000 characters"),
  parentId: z.string().uuid().optional().nullable(),
});

// Report Schemas

export const reportSchema = z.object({
  reason: z.enum(["SPAM", "SPOILER", "HARASSMENT", "INAPPROPRIATE", "OTHER"]),
  details: z
    .string()
    .max(500, "Details must be less than 500 characters")
    .optional(),
});

// Type Inference

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;
