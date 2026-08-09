import { Audio } from "expo-av";

export class AudioRecordingService {
  private recordingInstance: Audio.Recording | null = null;

  /**
   * Request microphone hardware permissions.
   */
  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === "granted";
  }

  /**
   * Configures the audio session and starts a new recording.
   */
  async startRecording(): Promise<void> {
    try {
      // 1. Assert hardware permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error("Microphone permission was not granted by user.");
      }

      // 2. Set audio environment configurations
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 3. Clear previous dangling records if any
      if (this.recordingInstance) {
        await this.recordingInstance.stopAndUnloadAsync().catch(() => {});
        this.recordingInstance = null;
      }

      // 4. Load the preset recording configuration (High Quality M4A / AAC)
      const options = Audio.RecordingOptionsPresets.HIGH_QUALITY;

      // 5. Instanciate and initiate hardware recorder
      const { recording } = await Audio.Recording.createAsync(options);
      this.recordingInstance = recording;
      console.log("[AudioService] Hardware recorder active.");
    } catch (error) {
      console.error("[AudioService] Failed to start audio capture session:", error);
      throw error;
    }
  }

  /**
   * Stops the current recording and returns the path to the local M4A file.
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recordingInstance) return null;

    try {
      console.log("[AudioService] Terminating audio capture session...");
      await this.recordingInstance.stopAndUnloadAsync();

      const fileUri = this.recordingInstance.getURI();
      this.recordingInstance = null;

      // Reset system audio mode to restore playback profiles
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      return fileUri;
    } catch (error) {
      console.error("[AudioService] Failed to gracefully close recording:", error);
      this.recordingInstance = null;
      throw error;
    }
  }

  /**
   * Checks if a recording session is currently active.
   */
  isRecording(): boolean {
    return this.recordingInstance !== null;
  }
}

export const audioRecordingService = new AudioRecordingService();
