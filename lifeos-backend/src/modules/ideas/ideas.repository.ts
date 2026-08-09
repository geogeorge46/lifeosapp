import { prisma } from "../../infrastructure/database/prisma.client";

export class IdeasRepository {
  async create(data: {
    userId: string;
    title: string;
    description?: string;
    notes?: string;
    category?: string;
    brainDumpId?: string | null;
    personId?: string | null;
    placeId?: string | null;
  }) {
    return prisma.idea.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description || null,
        notes: data.notes || null,
        category: data.category || "General",
        brainDumpId: data.brainDumpId || null,
        personId: data.personId || null,
        placeId: data.placeId || null,
      },
    });
  }

  async findAllByUserId(userId: string) {
    return prisma.idea.findMany({
      where: { userId },
      include: {
        brainDump: true,
        person: true,
        place: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.idea.findUnique({
      where: { id },
      include: {
        brainDump: true,
        person: true,
        place: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      notes?: string;
      category?: string;
      personId?: string | null;
      placeId?: string | null;
    }
  ) {
    return prisma.idea.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        notes: data.notes,
        category: data.category,
        personId: data.personId,
        placeId: data.placeId,
      },
    });
  }

  async delete(id: string) {
    return prisma.idea.delete({
      where: { id },
    });
  }
}
