"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import apiClient from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, MessageSquare, HelpCircle } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  email: z.string().email("Valid email required").max(320),
  category: z.string().optional(),
  subject: z.string().min(1, "Subject is required").max(240),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setError(null);
    setSuccess(false);
    try {
      await apiClient.post("/contact", data);
      setSuccess(true);
      reset();
    } catch (err: unknown) {
      const apiError = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        apiError.response?.data?.error?.message ||
          "Failed to send message. Please try again.",
      );
    }
  };

  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Get in Touch
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Have a question, suggestion, or need help? We&apos;d love to hear from
          you.
        </p>
      </section>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          {
            icon: Mail,
            title: "Email Us",
            desc: "support@cinetube.com",
          },
          {
            icon: MessageSquare,
            title: "Response Time",
            desc: "We typically reply within 24 hours",
          },
          {
            icon: HelpCircle,
            title: "Help Center",
            desc: "Check our FAQ for quick answers",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="pt-6 text-center">
              <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Send a Message</CardTitle>
          <CardDescription>
            Fill out the form below and we&apos;ll get back to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
              <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                Your message has been sent successfully! We&apos;ll get back to
                you soon.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Your name"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  onValueChange={(v: string | null) => {
                    if (v) setValue("category", v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General Inquiry</SelectItem>
                    <SelectItem value="TECHNICAL">Technical Issue</SelectItem>
                    <SelectItem value="BILLING">Billing</SelectItem>
                    <SelectItem value="CONTENT">Content Question</SelectItem>
                    <SelectItem value="ABUSE">Report Abuse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  {...register("subject")}
                  placeholder="What is this about?"
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={5}
                  {...register("message")}
                  placeholder="Tell us more..."
                />
                {errors.message && (
                  <p className="text-sm text-destructive">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
