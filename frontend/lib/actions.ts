"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db/client";
import {
  getAllArticlesSortedPaginated,
  getArchiveAllArticlesSortedPaginated,
} from "./db/queries";
import type { PaginatedArticles } from "./types";

export async function markAsRead(itemId: string) {
  await prisma.readStatus.upsert({
    where: { itemId },
    update: {},
    create: { itemId },
  });
  revalidatePath("/");
}

export async function toggleSave(itemId: string) {
  const existing = await prisma.savedItem.findFirst({
    where: { itemId },
  });
  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedItem.create({ data: { itemId } });
  }
  revalidatePath("/");
  revalidatePath("/saved");
}

export async function submitFeedback(
  itemId: string,
  type: "helpful" | "not_helpful",
) {
  await prisma.feedback.create({
    data: { itemId, feedbackType: type },
  });
  revalidatePath("/");
}

export async function removeSavedItem(savedItemId: string) {
  await prisma.savedItem.delete({ where: { id: savedItemId } });
  revalidatePath("/saved");
}

export async function loadMoreArticles(cursor: string): Promise<PaginatedArticles> {
  return getAllArticlesSortedPaginated(cursor);
}

export async function loadMoreArchiveArticles(
  date: string,
  cursor: string,
): Promise<PaginatedArticles> {
  return getArchiveAllArticlesSortedPaginated(date, cursor);
}
