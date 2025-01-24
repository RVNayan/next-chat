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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true); // Sidebar visibility
  const [isMobile, setIsMobile] = useState(false); // Check if the device is mobile

  
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth <= 768; // Threshold for mobile devices
      setIsMobile(isMobileView);
      setIsSidebarVisible(!isMobileView); // Hide sidebar if mobile
    };

    handleResize(); // Run on component mount
    window.addEventListener("resize", handleResize); // Add resize listener

    return () => {
      window.removeEventListener("resize", handleResize); // Clean up listener
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Redirecting to login...");
      window.location.href = "/";
      return;
    }

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

    const newSocket = io(`${backurl}`, {
      query: { token },
    });

    newSocket.on("botReply", (data) => {
      setMessages((prev) => [...prev, { user: "bot", text: data.message }]);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      const token = localStorage.getItem("token");
      if (username && token) {
        try {
          const response = await fetch(`${backurl}/api/messages?distinct=sessionId`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
  
          if (response.ok) {
            const data = await response.json();
            const sessionNumbers = data.data.map((msg) => msg.sessionId);
            const uniqueSessions = [...new Set(sessionNumbers)];
  
            // Ensure "Session 1" exists and set it as the active session
            if (!uniqueSessions.includes("1")) {
              setSessions((prevSessions) => ["1", ...prevSessions]);
              setSessionId("1"); // Set "Session 1" as the active session
            } else {
              setSessionId(uniqueSessions[0]); // Default to the first available session if "Session 1" exists
            }
  
            setSessions(uniqueSessions);
          } else {
            console.error("Failed to fetch sessions.");
          }
        } catch (error) {
          console.error("Error fetching sessions:", error);
        }
      }
    };
  
    fetchSessions();
  }, [username]);  // Fetch sessions when the username changes (on login)
  
  
  
  
  useEffect(() => {
    const fetchChatHistory = async () => {
      const token = localStorage.getItem("token");
      if (sessionId && username && token) {
        try {
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
                  msg.username === username ||
                  (msg.sentby === username && msg.username === "bot")
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

      // Instead of adding a 'bot is typing...' message, we just send the message directly.
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
        socket.emit("sendMessage", { user: username, message });

        setMessages((prev) => [
          ...prev,
          { user: username, text: message },
        ]);
        setMessage("");

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

          setMessages((prev) => [...prev, { user: "bot", text: reply }]);
        }
      } else {
        console.error("Error saving message");
      }
    }
  };

  const handleSessionSelect = (selectedSessionId) => {
    setSessionId(selectedSessionId);
    setMessages([]);
    alert(`You will switched to session ${selectedSessionId}`); // Show popup.
  };

  const createNewSession = () => {
    // Generate a new session ID based on the largest existing ID
    const newSessionId = (Math.max(...sessions.map(Number)) + 1).toString();
  
    // Add the new session only if it's not already in the list
    if (!sessions.includes(newSessionId)) {
      setSessions((prevSessions) => [newSessionId, ...prevSessions]);
      setSessionId(newSessionId);
      setMessages([]); // Clear messages for the new session
    }
  };
  


    const handleLogout = () => { //fixes logout ptoblem
      // Remove the token from localStorage
      localStorage.removeItem("token");
    
      // Clear user-related state
      setUsername(null);
      setSessionId(null);
      setMessages([]);
      setSessions([]);
    
    window.location.href = "/";
  };

  return (
    <div style={styles.container}>
      {isSidebarVisible && (
        <div style={styles.sidebar}>
          <button
            style={styles.toggleButton}
            onClick={() => setIsSidebarVisible(false)}
          >
            &lt;
          </button>
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
            style={{
              ...styles.sessionItem,
              backgroundColor: sessionId === session ? "green" : "#0070f3", // Green for active, blue for others
              color: "white",
            }}
          >
            Session {session}
          </li>
        ))}
      </ul>

        </div>
      )}
      {!isSidebarVisible && (
        <button
          style={styles.expandButton}
          onClick={() => setIsSidebarVisible(true)}
        >
          &gt;
        </button>
      )}
      <div style={styles.chatContainer}>
        <div
          style={styles.userIcon}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {`Current user - ${username}`}
          {isDropdownOpen && (
            <div style={styles.dropdownMenu}>
              <button onClick={handleLogout} style={styles.dropdownItem}>
                Logout
              </button>
              <button
                onClick={() => setIsDropdownOpen(false)}
                style={styles.dropdownItem}
              >
                Close
              </button>
            </div>
          )}
        </div>
        <h1 style={{ marginBottom: "30px" }}>
          Start a New Chat or select an existing Session
        </h1>
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
  container: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center", // Center-align the content horizontally
    alignItems: "center", // Center-align the content vertically
    padding: "0 1rem",
    fontFamily: "Roboto, Arial, sans-serif",
    marginTop: "10px",
  },
  sidebar: {
    width: "250px",
    padding: "1rem",
    borderRight: "1px solid #ccc",
    display: "flex",
    flexDirection: "column",
    marginTop: "-50px"
  },
  logoMain: {
    marginTop: "10px",
    marginBottom: "30px",
    marginLeft: "30px",
    width:"200px"
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
    display: "flex", // Enable flexbox
    flexDirection: "column", // Stack the chat vertically
    justifyContent: "center", // Center-align vertically
    alignItems: "center", // Center-align horizontally
    flex: 1,
    padding: "1rem",
    marginTop: "30px",
    maxWidth: "800px", // Lock maximum width for desktop
    maxHeight: "600px", // Lock maximum height for desktop
    overflow: "hidden", // Prevent content from spilling out
    boxSizing: "border-box",
  },
  chatBox: {
    width: "100%", // Ensure it stretches across the container width
    height: "500px", // Default height for desktop
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
    width:"100%",

  },
  input: {
    flex: 1,
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  sendButton: {
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    border: "none",
    width: "40px",
    height: "40px",
    cursor: "pointer",
  },
  sendIcon: {
    width: "20px",
    height: "20px",
  },
  userIcon: {
    fontSize: "1rem",
    cursor: "pointer",
    color: "white",
    backgroundColor: "#0070f3", // Button background
    padding: "0.5rem", // Padding for button-like appearance
    borderRadius: "2px", // Rounded corners
    border: "none",
    display: "inline-block", // Keep it inline
    textAlign: "center", // Center text alignment
    transition: "background-color 0.3s", // Smooth hover effect
    marginBottom: "10px"
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
};

export default Chat;
