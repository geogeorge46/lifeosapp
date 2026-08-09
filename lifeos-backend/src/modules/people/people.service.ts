import { PeopleRepository } from "./people.repository";
import { prisma } from "../../infrastructure/database/prisma.client";
import { TriggerType } from "@prisma/client";

function getNextBirthdayNotificationDate(birthdayDate: Date): Date {
  const now = new Date();
  const bDate = new Date(birthdayDate);
  const currentYearBirthday = new Date(now.getFullYear(), bDate.getMonth(), bDate.getDate());
  
  const notificationDate = new Date(currentYearBirthday);
  notificationDate.setDate(notificationDate.getDate() - 1);
  notificationDate.setHours(9, 0, 0, 0); // 9:00 AM

  if (notificationDate < now) {
    notificationDate.setFullYear(now.getFullYear() + 1);
  }
  
  return notificationDate;
}

export class PeopleService {
  constructor(private peopleRepository: PeopleRepository) {}

  async addPerson(
    userId: string,
    data: { name: string; phone?: string; relationship?: string; birthday?: string; tags?: string[] }
  ) {
    const person = await this.peopleRepository.createPerson({
      userId,
      name: data.name,
      phone: data.phone,
      relationship: data.relationship,
      birthday: data.birthday,
    });

    // Process initial tag insertions if any
    if (data.tags && data.tags.length > 0) {
      for (const tag of data.tags) {
        await this.peopleRepository.addTag(person.id, tag);
      }
    }

    // Schedule birthday reminder trigger (1 day before)
    if (data.birthday) {
      const bdayDate = new Date(data.birthday);
      const notificationDate = getNextBirthdayNotificationDate(bdayDate);

      await prisma.trigger.create({
        data: {
          type: TriggerType.BIRTHDAY,
          scheduledTime: notificationDate,
          personId: person.id,
        },
      });
    }

    return this.peopleRepository.findById(person.id);
  }

  async getPeople(userId: string) {
    return this.peopleRepository.findAllByUserId(userId);
  }

  async removePerson(id: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Delete linked transactions/debts
      await tx.transaction.deleteMany({ where: { personId: id } });

      // 2. Delete linked tasks
      await tx.task.deleteMany({ where: { personId: id } });

      // 3. Delete linked brain dumps
      await tx.brainDump.deleteMany({ where: { personId: id } });

      // 4. Delete relationships
      await tx.relationship.deleteMany({
        where: {
          OR: [
            { personAId: id },
            { personBId: id },
          ],
        },
      });

      // 5. Delete the contact profile
      return tx.person.delete({ where: { id } });
    });
  }

  async linkPlaceToPerson(personId: string, placeId: string) {
    return this.peopleRepository.linkPlace(personId, placeId);
  }

  async unlinkPlaceFromPerson(personId: string, placeId: string) {
    return this.peopleRepository.unlinkPlace(personId, placeId);
  }

  async addTagToPerson(personId: string, tagName: string) {
    return this.peopleRepository.addTag(personId, tagName);
  }

  async removeTagFromPerson(personId: string, tagId: string) {
    return this.peopleRepository.removeTag(personId, tagId);
  }
}
