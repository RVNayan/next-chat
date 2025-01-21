import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState(""); // Unique session ID for the user

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Redirecting to login...");
      window.location.href = "/";
      return;
    }

    // Fetch user information from token
    const fetchUserData = async () => {
      const response = await fetch("http://localhost:1337/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsername(data.username);
      } else {
        alert("Failed to fetch user data");
        window.location.href = "/";
      }
    };

    fetchUserData();

    // Generate or retrieve the session ID
    const storedSessionId = localStorage.getItem("sessionId");
    if (!storedSessionId) {
      const newSessionId = `session_${Date.now()}`;
      localStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);
    } else {
      setSessionId(storedSessionId);
    }

    // Connect to WebSocket server
    const newSocket = io("http://localhost:1337", {
      query: { token },
    });

    // Listen for bot replies
    newSocket.on("botReply", (data) => {
      setMessages((prev) => [...prev, { user: "bot", text: data.message }]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Load chat history when the component mounts
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (sessionId) {
        const response = await fetch(
          `http://localhost:1337/api/messages?filters[sessionId][$eq]=${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const history = data.data.map((msg) => ({
            user: msg.username === username ? username : "bot",
            text: msg.message,
          }));
          setMessages(history);
        }
      }
    };

    fetchChatHistory();
  }, [sessionId, username]);

  const handleSendMessage = async () => {
    if (message.trim() && socket) {
      const token = localStorage.getItem("token");

      // Save the message to Strapi
      const response = await fetch("http://localhost:1337/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            username,
            sessionId,
            message,
          },
        }),
      });

      if (response.ok) {
        // Emit the message to the server
        socket.emit("sendMessage", { user: username, message });

        // Update local messages
        setMessages((prev) => [...prev, { user: username, text: message }]);
        setMessage(""); // Clear input field

        // Bot replies back
        const botResponse = await fetch(
          `http://localhost:1337/api/messages?filters[sessionId][$eq]=${sessionId}&sort[createdAt]=desc&pagination[page]=1&pagination[pageSize]=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (botResponse.ok) {
          const botMessage = await botResponse.json();
          const reply = botMessage?.data?.[0]?.message || "I couldn't find anything!";
          
          // Save the bot's reply to Strapi as well
          await fetch("http://localhost:1337/api/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              data: {
                username: "bot",
                sessionId,
                message: reply,
              },
            }),
          });

          // Update local messages
          setMessages((prev) => [...prev, { user: "bot", text: reply }]);
        }
      } else {
        console.error("Error saving message");
      }
    }
  };

  return (
    <div style={styles.container}>
      <h1>Chat with Bot</h1>
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
