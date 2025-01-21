import React, { useState } from "react";
import { useRouter } from "next/router"; // For navigation

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // For registration
  const [isRegister, setIsRegister] = useState(false); // Toggle between Login/Register
  const [showPassword, setShowPassword] = useState(false); // Password visibility
  const router = useRouter(); // Navigation hook

  const handleAuth = async (e) => {
    e.preventDefault();

    const endpoint = isRegister
      ? "http://localhost:1337/api/auth/local/register"
      : "http://localhost:1337/api/auth/local";

    const userData = isRegister
      ? { // Registration data
          username,
          email,
          password,
        }
      : { // Login data
          identifier: email || username, // Email as the identifier for login
          password,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error:", error);
        alert(error.message || "An error occurred");
        return;
      }

      const data = await response.json();
      console.log("Success:", data);

      // Save JWT token to localStorage
      localStorage.setItem("token", data.jwt);

      // Navigate to the chat page after successful login/registration
      router.push("/chat");
    } catch (err) {
      console.error("Error:", err.message);
      alert("Something went wrong, please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h1>{isRegister ? "Register" : "Login"}</h1>
      <form onSubmit={handleAuth} style={styles.form}>
        {isRegister && (
          <label style={styles.label}>
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />
          </label>
        )}
        <label style={styles.label}>
          Email or Username:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
        </label>
        <label style={styles.label}>
          Password:
          <div style={styles.passwordContainer}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.toggleButton}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button type="submit" style={styles.submitButton}>
          {isRegister ? "Register" : "Login"}
        </button>
      </form>
      <p style={styles.toggleText}>
        {isRegister
          ? "Already have an account?"
          : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          style={styles.linkButton}
        >
          {isRegister ? "Login" : "Register"}
        </button>
      </p>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "400px",
    margin: "auto",
    padding: "2rem",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    fontFamily: "Arial, sans-serif",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  label: {
    fontSize: "1rem",
    marginBottom: "0.5rem",
  },
  input: {
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1rem",
    width: "100%",
  },
  passwordContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  toggleButton: {
    padding: "0.5rem",
    background: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  submitButton: {
    padding: "0.75rem",
    background: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
  },
  toggleText: {
    marginTop: "1rem",
    textAlign: "center",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#0070f3",
    textDecoration: "underline",
    cursor: "pointer",
  },
};

export default AuthPage;
