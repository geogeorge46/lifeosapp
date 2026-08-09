import { InboxRepository } from "./inbox.repository";
import { IStorageService } from "../../infrastructure/storage/storage.interface";
import { ITranscriptionService } from "./transcription/transcription.interface";

export class InboxService {
  constructor(
    private inboxRepository: InboxRepository,
    private storageService: IStorageService,
    private transcriptionService: ITranscriptionService
  ) {}

  async captureText(userId: string, content: string, type?: string | null, collectionId?: string | null) {
    return this.inboxRepository.create({
      userId,
      contentType: "TEXT",
      content,
      type,
      collectionId,
    });
  }

  async captureAudio(
    userId: string,
    audioBuffer: Buffer,
    fileName: string,
    mimeType: string,
    type?: string | null,
    collectionId?: string | null
  ) {
    // 1. Save audio to storage (e.g. local directory, S3)
    const fileUrl = await this.storageService.saveFile(audioBuffer, fileName, mimeType);

    // 2. Perform speech-to-text transcription
    let transcriptionText = "";
    try {
      transcriptionText = await this.transcriptionService.transcribe(audioBuffer, mimeType);
    } catch (error) {
      console.error("[InboxService] Transcription failed, logging fallback:", error);
      transcriptionText = "[Transcription Service Error: Could not parse text]";
    }

    // 3. Save record in database
    return this.inboxRepository.create({
      userId,
      contentType: "AUDIO",
      content: fileUrl,
      rawText: transcriptionText,
      type,
      collectionId,
    });
  }

  async getUserInbox(userId: string, collectionId?: string | null, type?: string | null) {
    return this.inboxRepository.findAllByUserId(userId, collectionId, type);
  }

  async processInboxItem(id: string) {
    return this.inboxRepository.updateStatus(id, "PROCESSED");
  }

  async archiveInboxItem(id: string) {
    return this.inboxRepository.setArchived(id, true);
  }

  async unarchiveInboxItem(id: string) {
    return this.inboxRepository.setArchived(id, false);
  }

  async updateType(id: string, type: string | null) {
    return this.inboxRepository.updateType(id, type);
  }

  async updateContent(id: string, content: string) {
    return this.inboxRepository.updateContent(id, content);
  }

  async moveToCollection(id: string, collectionId: string | null) {
    return this.inboxRepository.moveToCollection(id, collectionId);
  }

  async deleteInboxItem(id: string) {
    const item = await this.inboxRepository.findById(id);
    if (item && item.contentType === "AUDIO") {
      try {
        await this.storageService.deleteFile(item.content);
      } catch (err) {
        console.error("[InboxService] Failed to clear file during delete sequence:", err);
      }
    }
    return this.inboxRepository.delete(id);
  }

  // --- Collections ---
  async createCollection(userId: string, name: string) {
    return this.inboxRepository.createCollection(userId, name);
  }

  async getCollections(userId: string) {
    return this.inboxRepository.getCollections(userId);
  }

  async deleteCollection(id: string) {
    return this.inboxRepository.deleteCollection(id);
  }
}
