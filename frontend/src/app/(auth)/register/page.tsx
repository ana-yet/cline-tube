"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Film, Check, X } from "lucide-react";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      router.push("/");
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message ||
          "Registration failed. Please try again.",
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
            Create Your CinePass
          </h2>
          <p className="text-zinc-300 text-lg">
            Create an account to build custom watchlists, rate your favorite media, write reviews, and receive recommendations based on your tastes.
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
            <h1 className="text-3xl font-bold tracking-tight text-white">Get Started</h1>
            <p className="text-muted-foreground text-sm">
              Create an account to join the community.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-red-500/20 bg-red-950/20">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                {...register("name")}
                className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-red-500 focus-visible:ring-red-500/50"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
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
                  <p className="text-xs font-semibold text-zinc-400">Password requirements:</p>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
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
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-red-500 hover:text-red-400 hover:underline font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
