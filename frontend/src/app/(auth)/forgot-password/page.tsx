"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Film, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await apiClient.post("/auth/forgot-password", { email: data.email });
      setSuccess(true);
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message ||
          "Failed to send reset link. Please try again later."
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
            Lost your way in the Cineverse?
          </h2>
          <p className="text-zinc-300 text-lg">
            No worries. Enter your email address and we'll send you a ticket to get back in.
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
            <h1 className="text-3xl font-bold tracking-tight text-white">Forgot Password</h1>
            <p className="text-muted-foreground text-sm">
              We will send you a password reset link to your email.
            </p>
          </div>

          {success ? (
            <div className="space-y-4">
              <Alert className="border-emerald-500/30 bg-emerald-950/20 text-emerald-400">
                <AlertDescription className="flex items-center gap-2">
                  <Mail className="h-5 w-5 shrink-0 text-emerald-400" />
                  <span>Check your inbox for password reset instructions.</span>
                </AlertDescription>
              </Alert>
              <Link href="/login" className="block w-full">
                <Button className="w-full">Return to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-500/20 bg-red-950/20">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register("email")}
                  className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/50"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg hover:shadow-red-600/20 transition-all duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending Reset Link..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
