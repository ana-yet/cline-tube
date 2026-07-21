import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";

/**
 * Contact Service
 *
 * Handles public contact form submissions and admin management.
 */

// ── Submit Contact Form (Public) ──────────────────────────

export async function submitContact(input: {
  category?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const emailNormalized = input.email.toLowerCase().trim();

  const submission = await prisma.contactSubmission.create({
    data: {
      category:
        (input.category?.toUpperCase() as
          | "GENERAL"
          | "BILLING"
          | "TECHNICAL"
          | "CONTENT"
          | "ABUSE"
          | "OTHER") || "GENERAL",
      name: input.name.trim(),
      email: input.email.trim(),
      emailNormalized,
      subject: input.subject.trim(),
      message: input.message.trim(),
    },
  });

  return submission;
}

// ── List Contact Submissions (Admin) ──────────────────────

export async function listContacts(query: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const { page = 1, limit = 20, status } = query;
  const skip = (page - 1) * limit;

  const where = status
    ? { status: status as "NEW" | "ASSIGNED" | "RESOLVED" | "DISMISSED" }
    : {};

  const [items, total] = await Promise.all([
    prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        category: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        assignedToId: true,
        resolvedAt: true,
        resolutionNote: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.contactSubmission.count({ where }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Update Contact Status (Admin) ─────────────────────────

export async function updateContactStatus(
  id: string,
  input: {
    status?: string;
    assignedToId?: string;
    resolutionNote?: string;
  },
) {
  const existing = await prisma.contactSubmission.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new ApiError(404, "Contact submission not found", "NOT_FOUND");
  }

  const data: Record<string, unknown> = {};

  if (input.status) {
    data.status = input.status;
  }

  if (input.assignedToId !== undefined) {
    data.assignedToId = input.assignedToId;
  }

  if (input.resolutionNote !== undefined) {
    data.resolutionNote = input.resolutionNote;
  }

  if (input.status === "RESOLVED") {
    data.resolvedAt = new Date();
  }

  const updated = await prisma.contactSubmission.update({
    where: { id },
    data,
    select: {
      id: true,
      category: true,
      name: true,
      email: true,
      subject: true,
      message: true,
      status: true,
      assignedToId: true,
      resolvedAt: true,
      resolutionNote: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
}
