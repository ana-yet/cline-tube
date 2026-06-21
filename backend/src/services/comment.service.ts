import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";
import type { CreateCommentInput } from "../validations/comment.validation";

const commentSelect = {
  id: true,
  content: true,
  userId: true,
  reviewId: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, name: true, image: true },
  },
  replies: {
    select: {
      id: true,
      content: true,
      userId: true,
      reviewId: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

async function getApprovedReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true },
  });

  if (!review || review.status !== "APPROVED") {
    throw new ApiError(404, "Review not found", "REVIEW_NOT_FOUND");
  }

  return review;
}

export async function getCommentsByReview(reviewId: string) {
  await getApprovedReview(reviewId);

  const comments = await prisma.comment.findMany({
    where: { reviewId, parentId: null },
    select: commentSelect,
    orderBy: { createdAt: "asc" },
  });

  return comments;
}

export async function createComment(
  userId: string,
  reviewId: string,
  input: CreateCommentInput,
) {
  await getApprovedReview(reviewId);

  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: input.parentId, reviewId },
    });

    if (!parent) {
      throw new ApiError(404, "Parent comment not found", "COMMENT_NOT_FOUND");
    }
  }

  const comment = await prisma.comment.create({
    data: {
      content: input.content,
      userId,
      reviewId,
      parentId: input.parentId ?? null,
    },
    select: {
      id: true,
      content: true,
      userId: true,
      reviewId: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return comment;
}

export async function deleteComment(
  userId: string,
  role: string,
  reviewId: string,
  commentId: string,
) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, reviewId: true },
  });

  if (!comment || comment.reviewId !== reviewId) {
    throw new ApiError(404, "Comment not found", "COMMENT_NOT_FOUND");
  }

  if (comment.userId !== userId && role !== "ADMIN") {
    throw new ApiError(
      403,
      "You can only delete your own comments",
      "FORBIDDEN",
    );
  }

  await prisma.comment.delete({ where: { id: commentId } });
}
