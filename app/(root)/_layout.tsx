import { Slot, router } from "expo-router";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";

import { useGlobalContext } from "@/lib/global-provider";
import { palette } from "@/constants/theme";

export default function AppLayout() {
  const { loading, isLogged } = useGlobalContext();
  const hasRedirected = useRef(false);
  const isMounted = useRef(false);
  const lastIsLogged = useRef(isLogged);

  // Ensure navigation context is available before redirecting
  useEffect(() => {
    isMounted.current = true;
  }, []);

  useEffect(() => {
    // Reset redirect flag when user logs out (isLogged changes from true to false)
    if (lastIsLogged.current === true && isLogged === false) {
      hasRedirected.current = false;
    }
    lastIsLogged.current = isLogged;

    // Only redirect after component is mounted and navigation context is ready
    // Redirect to sign-in page when user is not logged in
    if (isMounted.current && !loading && !isLogged && !hasRedirected.current) {
      hasRedirected.current = true;
      // Use setTimeout to ensure navigation context is fully initialized
      setTimeout(() => {
        try {
          router.replace("/sign-in");
        } catch {
          // Navigation context might not be ready yet, retry
          console.warn("Navigation not ready, retrying...");
          setTimeout(() => {
            try {
              router.replace("/sign-in");
            } catch {
              console.error("Failed to redirect");
            }
          }, 100);
        }
      }, 0);
    }
  }, [loading, isLogged]);

  // Always render Slot to establish navigation context
  // Don't show loading overlays that block navigation - let pages handle their own loading states
  return <Slot />;
}
