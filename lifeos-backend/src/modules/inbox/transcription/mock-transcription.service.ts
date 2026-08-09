import { ITranscriptionService } from "./transcription.interface";

export class MockTranscriptionService implements ITranscriptionService {
  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    // Simulate slight processing latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    const fileSizeKb = (audioBuffer.length / 1024).toFixed(1);
    return `[Mock Transcription: Processed voice capture (${fileSizeKb} KB, MIME: ${mimeType}) successfully at ${new Date().toLocaleTimeString()}]`;
  }
}
