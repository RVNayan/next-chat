import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const backurl = process.env.NEXT_PUBLIC_BACKEND_HOST;

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [sessionId, setSessionId] = useState(""); // Current active session ID
  const [sessions, setSessions] = useState([]); // List of all sessions
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // User menu dropdown state

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Redirecting to login...");
      window.location.href = "/";
      return;
    }

    // Fetch user information from token
    const fetchUserData = async () => {
      const response = await fetch(`${backurl}/api/users/me`, {
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

    // Connect to WebSocket server
    const newSocket = io(`${backurl}`, {
      query: { token },
    });

    // Listen for bot replies
    newSocket.on("botReply", (data) => {
      setMessages((prev) => [...prev, { user: "bot", text: data.message }]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Load available sessions and messages when the component mounts
  useEffect(() => {
    const fetchSessions = async () => {
      const token = localStorage.getItem("token");
      if (username && token) {
        try {
          // Fetch all sessions from Strapi
          const response = await fetch(`${backurl}/api/messages?distinct=sessionId`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            const sessionNumbers = data.data.map((msg) => msg.sessionId);
            setSessions([...new Set(sessionNumbers)]); // Remove duplicates and set sessions
          } else {
            console.error("Failed to fetch sessions.");
          }
        } catch (error) {
          console.error("Error fetching sessions:", error);
        }
      }
    };

    fetchSessions();
  }, [username]);

  // Load chat history for the selected session
  useEffect(() => {
    const fetchChatHistory = async () => {
      const token = localStorage.getItem("token");
      if (sessionId && username && token) {
        try {
          // Fetch messages for the selected session
          const response = await fetch(
            `${backurl}/api/messages?filters[sessionId][$eq]=${sessionId}&sort[createdAt]=asc`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const filteredMessages = data.data
              .filter(
                (msg) =>
                  msg.username === username || // Messages sent by the user
                  (msg.sentby === username && msg.username === "bot") // Bot messages for the user
              )
              .map((msg) => ({
                user: msg.username,
                text: msg.message,
              }));

            setMessages(filteredMessages);
          } else {
            console.error("Failed to fetch chat history.");
          }
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    fetchChatHistory();
  }, [sessionId, username]);

  const handleSendMessage = async () => {
    if (message.trim() && socket) {
      const token = localStorage.getItem("token");

      // Save the message to Strapi
      const response = await fetch(`${backurl}/api/messages`, {
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
          `${backurl}/api/messages?filters[sessionId][$eq]=${sessionId}&sort[createdAt]=desc&pagination[page]=1&pagination[pageSize]=1`,
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
          await fetch(`${backurl}/api/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              data: {
                username: "bot",
                sentby: username,
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

  const handleSessionSelect = (selectedSessionId) => {
    setSessionId(selectedSessionId);
    setMessages([]); // Clear messages when switching sessions
  };

  const createNewSession = () => {
    const newSessionId = (sessions.length + 1).toString();
    setSessions((prevSessions) => [...prevSessions, newSessionId]);
    setSessionId(newSessionId);
    setMessages([]); // Clear current messages when creating a new session
  };
  console.log(sessionId);
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    
    <div style={styles.container}>
      
      <div style={styles.sidebar}>
      <img src="/logo.jpg" style={styles.logoMain} />

        <button onClick={createNewSession} style={styles.newSessionButton}>
          New Session
        </button>
        <h2>Previous</h2>
        <ul style={styles.sessionsList}>
          {sessions.map((session) => (
            <li
              key={session}
              onClick={() => handleSessionSelect(session)}
              style={styles.sessionItem}
            >
              Session {session}
            </li>
          ))}
        </ul>
      </div>
      <div style={styles.chatContainer}>
        <div style={styles.userIcon} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
        {`Current user - ${username}`}
        {isDropdownOpen && (
            <div style={styles.dropdownMenu}>
              <button onClick={handleLogout} style={styles.dropdownItem}>Logout</button>
              <button onClick={() => setIsDropdownOpen(false)} style={styles.dropdownItem}>Close</button>
            </div>
          )}
        </div>
        <h1 style={{ marginBottom: "30px" }}>Create a New Session and start Typing</h1>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            style={styles.input}
          />
          <button onClick={handleSendMessage} style={styles.sendButton}>
          <img src="/send.jpeg" alt="Send" style={styles.sendIcon} />
        </button>
        </div>
      </div>
    </div>
  );

};

const styles = {
  logoMain: {
    marginTop: "10px",
    marginBottom: "30px"
  },
  container: {
    display: "flex",
    maxWidth: "1200px",
    margin: "auto",
    fontFamily: "Roboto, Arial, sans-serif",
    flexDirection: "row",
    padding: "0 1rem",
  },
  sidebar: {
    width: "170px",
    padding: "1rem",
    borderRight: "1px solid #ccc",
    display: "flex",
    flexDirection: "column",
    marginTop: "10%",
  },
  newSessionButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  sessionsList: {
    listStyleType: "none",
    padding: "0",
  },
  sessionItem: {
    cursor: "pointer",
    padding: "0.5rem",
    backgroundColor: "#0070f3",
    marginBottom: "0.5rem",
    borderRadius: "4px",
    transition: "background-color 0.3s",
  },
  chatContainer: {
    flex: 1,
    padding: "1rem",
    marginTop: "30px",
  },
  chatBox: {
    height: "400px", // Default height for desktop
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
    backgroundSize: "contain",              // Make the image fit the button
    backgroundRepeat: "no-repeat",          // Prevent image repetition
    backgroundPosition: "center",           // Center the image in the button
    border: "none",                         // Remove button border
    width: "40px",                          // Adjust button width
    height: "40px",                         // Adjust button height
    cursor: "pointer",                      // Pointer cursor on hover
  },
  sendIcon: {
    width: "20px",      // Set image width
    height: "20px",     // Set image height
  },
  userIcon: {
    fontSize: "1.2rem",
    cursor: "pointer",
    marginBottom: "1rem",
    color: "#0070f3"
  },
  dropdownMenu: {
    border: "1px solid #ccc",
    position: "absolute",
    top: "20px",
    right: "10px",
    width: "148px",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  dropdownItem: {
    padding: "1rem",
    borderBottom: "1px solid #ccc",
    cursor: "pointer",
    color: "black",
    textAlign: "center",
    backgroundColor: "red",
  },

  "@media (max-width: 8000px)": {
    container: {
      flexDirection: "column", // Stack sidebar and chat vertically
      alignItems: "center", // Center content horizontally
    },
    sidebar: {
      width: "70%", // Make sidebar almost full-width
      borderRight: "none", // Remove right border
      borderBottom: "1px solid #ccc", // Add bottom border
      marginBottom: "1rem",
      marginTop: "10px",
      alignItems:"center"
    },
    chatContainer: {
      width: "90%",
      marginTop: "10px",
    },
    chatBox: {
      height: "30vh", // Use viewport height for dynamic sizing
      maxHeight: "400px", // Set a maximum height
      overflowY: "auto",
    },
    message: {
      maxWidth: "90%", // Adjust message width
    },
    inputContainer: {
      flexDirection: "row", // Keep input and button in a row
      width: "100%",
    },
    input: {
      flex: 1, // Allow input to take up available space
    },
    logoMain: {
        width: "100px",
        height: "100px"
    },
    newSessionButton: {
        width: "100%",
        marginBottom: "10px"
    },
    sessionsList: {
        width: "100%",
    },
    sessionItem: {
        width: "100%",
        textAlign: "center"
    }

  },

  // Very small screen sizes (e.g., mobile portrait)
  "@media (max-width: 400px)": {
    chatBox: {
      height: "40vh", // Adjust height for smaller screens
    },
    input: {
      fontSize: "0.8rem", // Further reduce input font size
    },
     message: { 
       width: "90%", 
     }, 
  },
};

export default Chat;
