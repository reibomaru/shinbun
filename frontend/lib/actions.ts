"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db/client";

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
