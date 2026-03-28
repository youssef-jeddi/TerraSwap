"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { NETWORKS } from "../../lib/networks";

const XrplClientContext = createContext(undefined);

export function XrplClientProvider({ children }) {
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const xrpl = await import("xrpl");
        const client = new xrpl.Client(NETWORKS.DEVNET.wss);

        client.on("connected", () => {
          if (mounted) {
            setIsConnected(true);
            setError(null);
          }
        });

        client.on("disconnected", () => {
          if (mounted) {
            setIsConnected(false);
          }
        });

        await client.connect();
        clientRef.current = client;
      } catch (err) {
        console.error("Failed to connect XRPL client:", err);
        if (mounted) {
          setError(err.message);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (clientRef.current) {
        clientRef.current.disconnect().catch(() => {});
        clientRef.current = null;
      }
    };
  }, []);

  const getClient = useCallback(() => clientRef.current, []);

  return (
    <XrplClientContext.Provider value={{ getClient, isConnected, error }}>
      {children}
    </XrplClientContext.Provider>
  );
}

export function useXrplClient() {
  const context = useContext(XrplClientContext);
  if (context === undefined) {
    throw new Error("useXrplClient must be used within an XrplClientProvider");
  }
  return context;
}
