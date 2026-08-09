export class ExpoPushService {
  private EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) {
      console.warn(`[ExpoPushService] Invalid Expo Push Token format received: ${expoPushToken}`);
      return false;
    }

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-encoding": "gzip, deflate",
        },
        body: JSON.stringify({
          to: expoPushToken,
          sound: "default",
          title,
          body,
          data,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[ExpoPushService] Expo Gateway rejected push request: ${errText}`);
        return false;
      }

      const result = await response.json();
      console.log("[ExpoPushService] Push notification successfully delivered:", result);
      return true;
    } catch (err) {
      console.error("[ExpoPushService] Network error during push dispatch:", err);
      return false;
    }
  }
}
