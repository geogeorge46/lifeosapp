import { OccasionsRepository } from "./occasions.repository";
import { prisma } from "../../infrastructure/database/prisma.client";

export class OccasionsService {
  constructor(private repo: OccasionsRepository) {}

  async create(
    userId: string,
    data: {
      personId: string;
      title: string;
      date: string;
      type: string;
      offsets: number[];
    }
  ) {
    // Validate contact access
    const contact = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!contact || contact.userId !== userId) {
      throw new Error("Contact profile not found or access denied.");
    }

    const cleanDate = new Date(data.date);

    return this.repo.createOccasion({
      personId: data.personId,
      title: data.title.trim(),
      date: cleanDate,
      type: data.type.trim(),
      offsets: data.offsets && data.offsets.length > 0 ? data.offsets : [0], // default on the day
    });
  }

  async getForContact(userId: string, personId: string) {
    const contact = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!contact || contact.userId !== userId) {
      throw new Error("Contact profile not found or access denied.");
    }

    return this.repo.findByPersonId(personId);
  }

  async delete(userId: string, id: string) {
    const occasion = await this.repo.findById(id);
    if (!occasion) {
      throw new Error("Occasion not found.");
    }

    if (occasion.person.userId !== userId) {
      throw new Error("Access denied.");
    }

    await this.repo.delete(id);
  }
}
