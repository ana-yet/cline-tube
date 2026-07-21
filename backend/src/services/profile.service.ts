import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";
import { uploadImage, deleteImage } from "./cloudinary.service";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      imagePublicId: true,
      emailVerified: true,
      createdAt: true,
      profile: {
        select: {
          bio: true,
          favoriteGenres: true,
          website: true,
          twitter: true,
          facebook: true,
          github: true,
        },
      },
      _count: {
        select: {
          reviews: true,
          watchlist: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return user;
}

// Update Profile

export async function updateProfile(
  userId: string,
  input: {
    name?: string;
    bio?: string | null;
    favoriteGenres?: string[];
    website?: string | null;
    twitter?: string | null;
    facebook?: string | null;
    github?: string | null;
  },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  // Update user name if provided
  if (input.name !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
    });
  }

  // Update or create profile
  const profileData = {
    bio: input.bio,
    favoriteGenres: input.favoriteGenres,
    website: input.website,
    twitter: input.twitter,
    facebook: input.facebook,
    github: input.github,
  };

  // Remove undefined fields
  const cleaned = Object.fromEntries(
    Object.entries(profileData).filter(([, v]) => v !== undefined),
  );

  await prisma.userProfile.upsert({
    where: { userId },
    update: cleaned,
    create: { userId, ...cleaned },
  });

  return getProfile(userId);
}

// ── Upload Profile Image (ownership-safe) ─────────────────

export async function uploadProfileImage(userId: string, fileBuffer: Buffer) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, imagePublicId: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  // Delete old image from Cloudinary if it exists (ownership-safe)
  if (user.imagePublicId) {
    await deleteImage(user.imagePublicId).catch(() => {});
  }

  // Upload new image
  const result = await uploadImage(fileBuffer, "cinetube/avatars");

  // Update user with new image URL and public ID
  await prisma.user.update({
    where: { id: userId },
    data: {
      image: result.secure_url,
      imagePublicId: result.public_id,
    },
  });

  return getProfile(userId);
}

// ── Delete Profile Image (ownership-safe) ─────────────────

export async function deleteProfileImage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, imagePublicId: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (!user.imagePublicId) {
    throw new ApiError(400, "No profile image to delete", "NO_IMAGE");
  }

  // Delete from Cloudinary using stored public ID (ownership verified)
  await deleteImage(user.imagePublicId).catch(() => {});

  // Clear image fields
  await prisma.user.update({
    where: { id: userId },
    data: {
      image: null,
      imagePublicId: null,
    },
  });

  return getProfile(userId);
}
