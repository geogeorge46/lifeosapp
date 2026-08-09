import { HabitsRepository } from "./habits.repository";

export class HabitsService {
  constructor(private habitsRepository: HabitsRepository) {}

  async getHabits(userId: string) {
    return this.habitsRepository.findAllByUserId(userId);
  }

  async addHabit(userId: string, title: string) {
    if (!title || !title.trim()) {
      throw new Error("Habit title is required.");
    }
    return this.habitsRepository.createHabit(userId, title.trim());
  }

  async removeHabit(id: string) {
    return this.habitsRepository.deleteHabit(id);
  }

  async toggleHabitCompletion(id: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    return this.habitsRepository.toggleCompletion(id, targetDate);
  }
}
