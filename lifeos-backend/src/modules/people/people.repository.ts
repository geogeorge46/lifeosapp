import { prisma } from "../../infrastructure/database/prisma.client";

export class PeopleRepository {
  async createPerson(data: {
    userId: string;
    name: string;
    phone?: string;
    relationship?: string;
    birthday?: string;
  }) {
    return prisma.person.create({
      data: {
        userId: data.userId,
        name: data.name,
        phone: data.phone,
        relationship: data.relationship,
        birthday: data.birthday ? new Date(data.birthday) : null,
      },
    });
  }

  async findAllByUserId(userId: string) {
    return prisma.person.findMany({
      where: { userId },
      include: {
        tags: {
          include: { tag: true },
        },
        linkedPlaces: {
          include: { place: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
        },
        brainDumps: {
          where: { archived: false },
          orderBy: { createdAt: "desc" },
        },
        ideas: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.person.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        linkedPlaces: { include: { place: true } },
      },
    });
  }

  async delete(id: string) {
    return prisma.person.delete({
      where: { id },
    });
  }

  async linkPlace(personId: string, placeId: string) {
    return prisma.personPlace.create({
      data: { personId, placeId },
    });
  }

  async unlinkPlace(personId: string, placeId: string) {
    return prisma.personPlace.delete({
      where: {
        personId_placeId: { personId, placeId },
      },
    });
  }

  async addTag(personId: string, tagName: string) {
    const cleanTagName = tagName.trim().toLowerCase();

    // Find or create Tag
    const tag = await prisma.tag.upsert({
      where: { name: cleanTagName },
      update: {},
      create: { name: cleanTagName },
    });

    // Link tag to person
    return prisma.personTag.upsert({
      where: {
        personId_tagId: { personId, tagId: tag.id },
      },
      update: {},
      create: { personId, tagId: tag.id },
    });
  }

  async removeTag(personId: string, tagId: string) {
    return prisma.personTag.delete({
      where: {
        personId_tagId: { personId, tagId },
      },
    });
  }
}
