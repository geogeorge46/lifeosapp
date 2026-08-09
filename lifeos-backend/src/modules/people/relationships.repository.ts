import { prisma } from "../../infrastructure/database/prisma.client";

export class RelationshipsRepository {
  async createRelationship(personAId: string, personBId: string, type: string) {
    return prisma.relationship.upsert({
      where: {
        personAId_personBId_type: {
          personAId,
          personBId,
          type,
        },
      },
      update: {},
      create: {
        personAId,
        personBId,
        type,
      },
      include: {
        personA: true,
        personB: true,
      },
    });
  }

  async findAllByUserId(userId: string) {
    return prisma.relationship.findMany({
      where: {
        personA: {
          userId,
        },
      },
      include: {
        personA: true,
        personB: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.relationship.findUnique({
      where: { id },
      include: {
        personA: true,
        personB: true,
      },
    });
  }

  async findLink(personAId: string, personBId: string, type: string) {
    return prisma.relationship.findUnique({
      where: {
        personAId_personBId_type: {
          personAId,
          personBId,
          type,
        },
      },
    });
  }

  async delete(id: string) {
    return prisma.relationship.delete({
      where: { id },
    });
  }

  async deleteLink(personAId: string, personBId: string, type: string) {
    try {
      await prisma.relationship.delete({
        where: {
          personAId_personBId_type: {
            personAId,
            personBId,
            type,
          },
        },
      });
    } catch (err) {
      // Ignore if already deleted
    }
  }
}
