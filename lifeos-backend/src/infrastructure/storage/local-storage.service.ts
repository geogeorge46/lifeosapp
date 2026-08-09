import { IStorageService } from "./storage.interface";
import * as fs from "fs";
import * as path from "path";

export class LocalStorageService implements IStorageService {
  private uploadDir: string;
  private serverUrl: string;

  constructor() {
    // Resolved relative to compiled js in dist/infrastructure/storage
    this.uploadDir = path.resolve(process.cwd(), "uploads");
    this.serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

    // Ensure uploads directory exists on start
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const ext = path.extname(fileName) || this.getExtensionFromMime(mimeType);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueName);

    await fs.promises.writeFile(filePath, fileBuffer);

    return `${this.serverUrl}/uploads/${uniqueName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const fileName = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, fileName);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  private getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case "audio/m4a":
      case "audio/x-m4a":
      case "audio/mp4":
        return ".m4a";
      case "audio/mpeg":
      case "audio/mp3":
        return ".mp3";
      case "audio/wav":
      case "audio/x-wav":
        return ".wav";
      default:
        return ".bin";
    }
  }
}
