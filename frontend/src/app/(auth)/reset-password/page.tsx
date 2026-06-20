"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Film, Check, X, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read token from URL
  const tokenFromUrl = searchParams.get("token") || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password field for strength indicator
  const password = watch("password") || "";

  // Password requirements
  const requirements = [
    { label: "At least 8 characters", test: (val: string) => val.length >= 8 },
    { label: "At least one uppercase letter", test: (val: string) => /[A-Z]/.test(val) },
    { label: "At least one lowercase letter", test: (val: string) => /[a-z]/.test(val) },
    { label: "At least one number", test: (val: string) => /\d/.test(val) },
  ];

  // Set token value once URL search params are parsed
  useEffect(() => {
    if (tokenFromUrl) {
      setValue("token", tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/reset-password", {
        token: data.token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message ||
          "Failed to reset password. The token may be invalid or expired."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left Column: Visual Brand / Movie Backdrop */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-zinc-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/cinema_auth_bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-red-950/40" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-500 hover:text-red-400 transition-colors">
            <Film className="h-6 w-6 fill-red-500" />
            <span>CineTube</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-4 max-w-lg">
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Secure Your Access
          </h2>
          <p className="text-zinc-300 text-lg">
            Choose a strong, unique password to protect your review history, watchlist, and account settings.
          </p>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} CineTube. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex flex-col justify-center px-6 py-12 md:px-12 lg:px-20 relative bg-zinc-950">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2 text-left">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">Reset Password</h1>
            <p className="text-muted-foreground text-sm">
              Please enter your recovery token and new password.
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <Alert className="border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
                <AlertDescription>
                  Your password has been successfully reset! Redirecting to login page...
                </AlertDescription>
              </Alert>
              <Link href="/login" className="block w-full">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-500/20 bg-red-950/20">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Token field */}
              <div className="space-y-2">
                <Label htmlFor="token" className="text-zinc-300">Reset Token</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Enter the token received in email"
                  {...register("token")}
                  className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                />
                {errors.token && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.token.message}
                  </p>
                )}
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-300">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}

                {/* Password Strength Indicator */}
                {password && (
                  <div className="pt-2 space-y-1.5 border-t border-zinc-800/50 mt-2">
                    <p className="text-xs font-semibold text-zinc-400">Password strength requirements:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {requirements.map((req, index) => {
                        const isMet = req.test(password);
                        return (
                          <div key={index} className="flex items-center gap-1.5 text-xs">
                            {isMet ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                            )}
                            <span className={isMet ? "text-emerald-400" : "text-zinc-500"}>
                              {req.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg hover:shadow-red-600/20 transition-all duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
