"use client";

import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      const socketInstance = io("http://localhost:5000", {
        auth: {
          token: token,
          userId: user.id,
        },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on("connect", () => {
        setConnected(true);
        socketInstance.emit("join-user-room", user.id);
      });

      socketInstance.on("disconnect", (reason) => {
        setConnected(false);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setConnected(false);
      });

      setSocket(socketInstance);
      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
          setSocket(null);
          setConnected(false);
        }
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user, token]);

  const joinCandidateRoom = (candidateId) => {
    if (socket && connected) {
      socket.emit("join-candidate-room", candidateId);
    }
  };

  const leaveCandidateRoom = (candidateId) => {
    if (socket && connected) {
      socket.emit("leave-candidate-room", candidateId);
    }
  };

  const value = {
    socket,
    connected,
    joinCandidateRoom,
    leaveCandidateRoom,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
