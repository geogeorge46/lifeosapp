import { IdeasRepository } from "./ideas.repository";

export class IdeasService {
  constructor(private ideasRepository: IdeasRepository) {}

  async createIdea(data: {
    userId: string;
    title: string;
    description?: string;
    notes?: string;
    category?: string;
    brainDumpId?: string | null;
    personId?: string | null;
    placeId?: string | null;
  }) {
    return this.ideasRepository.create(data);
  }

  async getIdeas(userId: string) {
    return this.ideasRepository.findAllByUserId(userId);
  }

  async getIdeaById(id: string) {
    return this.ideasRepository.findById(id);
  }

  async updateIdea(
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
    return this.ideasRepository.update(id, data);
  }

  async deleteIdea(id: string) {
    return this.ideasRepository.delete(id);
  }
}
