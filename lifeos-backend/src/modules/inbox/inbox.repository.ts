import { prisma } from "../../infrastructure/database/prisma.client";
import { BrainDumpStatus } from "@prisma/client";

export class InboxRepository {
  async create(data: {
    userId: string;
    contentType: "TEXT" | "AUDIO";
    content: string;
    rawText?: string;
    type?: string | null;
    collectionId?: string | null;
  }) {
    return prisma.brainDump.create({
      data: {
        userId: data.userId,
        contentType: data.contentType,
        content: data.content,
        rawText: data.rawText || null,
        type: data.type || null,
        collectionId: data.collectionId || null,
      },
    });
  }

  async findAllByUserId(userId: string, collectionId?: string | null, type?: string | null) {
    const where: any = {
      userId,
      archived: false,
    };

    if (collectionId !== undefined) {
      where.collectionId = collectionId === "null" ? null : collectionId;
    }

    if (type !== undefined && type !== null && type !== "All") {
      where.type = type;
    }

    return prisma.brainDump.findMany({
      where,
      include: {
        collection: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.brainDump.findUnique({
      where: { id },
      include: {
        collection: true,
      },
    });
  }

  async updateStatus(id: string, status: BrainDumpStatus) {
    return prisma.brainDump.update({
      where: { id },
      data: {
        status: status,
      },
    });
  }

  async updateType(id: string, type: string | null) {
    return prisma.brainDump.update({
      where: { id },
      data: {
        type: type,
      },
    });
  }

  async updateContent(id: string, content: string) {
    const item = await prisma.brainDump.findUnique({ where: { id } });
    if (item && item.contentType === "AUDIO") {
      return prisma.brainDump.update({
        where: { id },
        data: {
          rawText: content,
        },
      });
    }
    return prisma.brainDump.update({
      where: { id },
      data: {
        content: content,
      },
    });
  }

  async moveToCollection(id: string, collectionId: string | null) {
    return prisma.brainDump.update({
      where: { id },
      data: {
        collectionId: collectionId,
      },
    });
  }

  async setArchived(id: string, archived: boolean) {
    return prisma.brainDump.update({
      where: { id },
      data: {
        archived,
        status: archived ? "ARCHIVED" : "INBOX",
      },
    });
  }

  async delete(id: string) {
    return prisma.brainDump.delete({
      where: { id },
    });
  }

  // --- Collections Actions ---
  async createCollection(userId: string, name: string) {
    return prisma.brainDumpCollection.create({
      data: {
        userId,
        name,
      },
    });
  }

  async getCollections(userId: string) {
    return prisma.brainDumpCollection.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  }

  async deleteCollection(id: string) {
    return prisma.brainDumpCollection.delete({
      where: { id },
    });
  }
}
