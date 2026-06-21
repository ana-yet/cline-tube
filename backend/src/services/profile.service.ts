import prisma from "../config/prisma";
import { ApiError } from "../utils/errors";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
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
