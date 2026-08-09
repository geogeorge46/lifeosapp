export interface ITranscriptionService {
  /**
   * Transcribes an audio file from a buffer.
   * @param audioBuffer The binary file buffer.
   * @param mimeType The file's MIME type.
   * @returns The transcribed text.
   */
  transcribe(audioBuffer: Buffer, mimeType: string): Promise<string>;
}
