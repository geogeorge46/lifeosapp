export interface IStorageService {
  /**
   * Saves a file to the storage provider and returns its access URL.
   * @param fileBuffer The raw file buffer.
   * @param fileName The target name of the file.
   * @param mimeType The file's MIME type.
   */
  saveFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;

  /**
   * Deletes a file from the storage provider using its access URL.
   * @param fileUrl The full access URL of the file.
   */
  deleteFile(fileUrl: string): Promise<void>;
}
