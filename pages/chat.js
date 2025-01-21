import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Get JWT token from localStorage
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Redirecting to login...");
      window.location.href = "/";
      return;
    }

    // Connect to the WebSocket server
    const newSocket = io("http://localhost:1337", {
      query: { token },
    });

    // Listen for welcome messages
    newSocket.on("welcome", (data) => {
      setUsername(data.userData);
      setMessages((prev) => [...prev, { user: "bot", text: data.text }]);
    });

    // Listen for incoming messages
    newSocket.on("message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  const handleSendMessage = () => {
    if (message.trim() && socket) {
      // Emit message to the server
      socket.emit("sendMessage", { user: username, message });
      setMessages((prev) => [...prev, { user: username, text: message }]);
      setMessage("");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Welcome to the Chat Room</h1>
      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf: msg.user === username ? "flex-end" : "flex-start",
              backgroundColor: msg.user === username ? "#0070f3" : "#eaeaea",
              color: msg.user === username ? "white" : "black",
            }}
          >
            <strong>{msg.user}: </strong>
            {msg.text}
          </div>
        ))}
      </div>
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={styles.input}
        />
        <button onClick={handleSendMessage} style={styles.sendButton}>
          Send
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "600px",
    margin: "auto",
    padding: "1rem",
    fontFamily: "Arial, sans-serif",
  },
  chatBox: {
    height: "400px",
    overflowY: "scroll",
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    backgroundColor: "#f9f9f9",
  },
  message: {
    padding: "0.5rem",
    borderRadius: "8px",
    maxWidth: "70%",
    wordWrap: "break-word",
  },
  inputContainer: {
    display: "flex",
    gap: "0.5rem",
  },
  input: {
    flex: 1,
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  sendButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default Chat;
