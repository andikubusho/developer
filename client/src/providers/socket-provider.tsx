import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user) {
      const socketInstance = io(window.location.origin, {
        path: "/socket.io",
        query: { userId: user.id.toString() },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
      });

      socketInstance.on("connect", () => {
        setIsConnected(true);
        console.log("[Socket] Connected to server for user:", user.id, "socketId:", socketInstance.id);
      });

      socketInstance.on("disconnect", (reason) => {
        setIsConnected(false);
        console.log("[Socket] Disconnected from server, reason:", reason);
      });

      socketInstance.on("connect_error", (err) => {
        console.error("[Socket] Connection error:", err.message);
      });

      // Global data sync: when server broadcasts data changes, invalidate relevant queries
      socketInstance.on("data_updated", (data: { type: string }) => {
        console.log("[Socket] Data updated:", data.type);
        queryClient.invalidateQueries({ queryKey: [data.type] });
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
