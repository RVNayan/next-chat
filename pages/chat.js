import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const username = localStorage.getItem("username"); // Get username

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Redirecting to login...");
      window.location.href = "/";
      return;
    }

    const newSocket = io("http://localhost:1337", { query: { token } });
    setSocket(newSocket);

    fetchMessages(token);

    newSocket.on("message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => newSocket.disconnect();
  }, []);

  const fetchMessages = async (token) => {
    try {
      const response = await fetch(
        `http://localhost:1337/api/messages?filters[username][$eq]=${username}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const fetchedMessages = data.data.map((msg) => ({
          user: msg.username,
          text: msg.message,
        }));
        setMessages((prev) => [...prev, ...fetchedMessages]);
      } else {
        console.error("Error fetching messages:", response.statusText);
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const handleSendMessage = async () => {
    const token = localStorage.getItem("token");
    if (message.trim() && token && socket) {
      const response = await fetch("http://localhost:1337/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            username, // Use username from localStorage
            message,
          },
        }),
      });

      if (response.ok) {
        socket.emit("sendMessage", { user: username, message });
        setMessages((prev) => [...prev, { user: username, text: message }]);
        setMessage("");
      } else {
        console.error("Failed to send message.");
      }
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
