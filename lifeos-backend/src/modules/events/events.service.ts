import { EventsRepository } from "./events.repository";
import { prisma } from "../../infrastructure/database/prisma.client";

export class EventsService {
  constructor(private eventsRepository: EventsRepository) {}

  async createEvent(data: {
    userId: string;
    title: string;
    description?: string;
    startDateStr: string;
    endDateStr: string;
    recurrenceRule?: string | null;
    placeId?: string | null;
    brainDumpId?: string | null;
  }) {
    const event = await (data.brainDumpId
      ? prisma.$transaction(async (tx) => {
          const created = await tx.event.create({
            data: {
              userId: data.userId,
              title: data.title,
              description: data.description || null,
              startDate: new Date(data.startDateStr),
              endDate: new Date(data.endDateStr),
              recurrenceRule: data.recurrenceRule || null,
              placeId: data.placeId || null,
              brainDumpId: data.brainDumpId || null,
            },
          });

          await tx.brainDump.update({
            where: { id: data.brainDumpId! },
            data: { status: "PROCESSED" },
          });

          return created;
        })
      : this.eventsRepository.create({
          userId: data.userId,
          title: data.title,
          description: data.description,
          startDate: new Date(data.startDateStr),
          endDate: new Date(data.endDateStr),
          recurrenceRule: data.recurrenceRule,
          placeId: data.placeId,
          brainDumpId: data.brainDumpId,
        }));

    // Create BEFORE_EVENT trigger (15 minutes prior to start date)
    const eventStart = new Date(event.startDate);
    const triggerTime = new Date(eventStart.getTime() - 15 * 60 * 1000);

    await prisma.trigger.create({
      data: {
        type: "BEFORE_EVENT",
        scheduledTime: triggerTime,
        eventId: event.id,
      },
    });

    return event;
  }

  async getEventsForRange(userId: string, startStr: string, endStr: string) {
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T23:59:59.999Z`);

    return this.eventsRepository.findByDateRange(userId, start, end);
  }

  async deleteEvent(id: string) {
    return this.eventsRepository.delete(id);
  }
}
