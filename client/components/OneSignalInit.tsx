import { useEffect } from "react";
import { setupOneSignal } from "../lib/onesignal";

export default function OneSignalInit() {
  useEffect(() => {
    setupOneSignal();
  }, []);
  return null;
}
