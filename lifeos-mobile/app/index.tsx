import { Redirect } from "expo-router";
import React from "react";
import * as WebBrowser from "expo-web-browser";

// CRITICAL: This must be called on the page that receives the OAuth redirect
// so that the WebBrowser session knows to close itself and hand tokens back to the app.
WebBrowser.maybeCompleteAuthSession();

export default function Index() {
  return <Redirect href="/(tabs)/day" />;
}
