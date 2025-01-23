import React, { useState } from "react";
import { useRouter } from "next/router"; // For navigation

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // For registration
  const [isRegister, setIsRegister] = useState(false); // Toggle between Login/Register
  const [showPassword, setShowPassword] = useState(false); // Password visibility
  const [errorMessage, setErrorMessage] = useState(""); // Error message state
  const router = useRouter(); // Navigation hook

  const backurl = process.env.NEXT_PUBLIC_BACKEND_HOST;

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous error messages

    const endpoint = isRegister
      ? `${backurl}/api/auth/local/register`
      : `${backurl}/api/auth/local`;

    const userData = isRegister
      ? { username, email, password }
      : { identifier: username || email, password };

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
        setErrorMessage(error.message || "An error occurred");
        return;
      }

      const data = await response.json();
      console.log("Success:", data);

      // Save JWT token and username to localStorage
      localStorage.setItem("token", data.jwt);
      localStorage.setItem("username", data.user?.username || username);

      // Navigate to the chat page after successful login/registration
      router.push("/chat");
    } catch (err) {
      console.error("Error:", err.message);
      setErrorMessage("Something went wrong, please try again.");
    }
  };

  return (
    <div style={styles.container}>
      {/* Welcome Text */}
      <div style={styles.welcomeText}>Welcome to MirrorBot</div>

      <div style={styles.log}>{isRegister ? "Register" : "Login"}</div>

      {/* Error Message */}
      {errorMessage && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

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
          {isRegister ? "Email" : "Enter your MirrorBot Username"}
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder={isRegister ? "example@bot.com" : ""}
            required
          />
        </label>
        <label style={styles.label}>
          {isRegister ? "Password" : "MirrorBot Password"}
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
    marginTop: "20%",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    fontFamily: "Arial, sans-serif",
    width: "100%",
    boxSizing: "border-box",
  },
  welcomeText: {
    fontSize: "3rem",
    fontWeight: "bold",
    marginBottom: "1rem",
    textAlign: "center",
    color: "Black",
    padding: "0.5rem",
    backgroundColor: "#f0f8ff",
    borderRadius: "8px",
  },
  log: {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: "2rem",
  },
  errorBox: {
    backgroundColor: "#ffefef",
    color: "#d9534f",
    padding: "0.75rem",
    borderRadius: "4px",
    marginBottom: "1rem",
    textAlign: "center",
    border: "1px solid #d9534f",
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
    padding: "0.75rem",
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

  // Responsive Design
  "@media (max-width: 480px)": {
    container: {
      marginTop: "10%",
      padding: "1.5rem",
    },
    welcomeText: {
      fontSize: "2rem",
    },
    log: {
      fontSize: "1.5rem",
    },
    input: {
      fontSize: "0.9rem",
      padding: "0.6rem",
    },
    submitButton: {
      fontSize: "0.9rem",
      padding: "0.6rem",
    },
    toggleButton: {
      fontSize: "0.8rem",
      padding: "0.4rem",
    },
    errorBox: {
      fontSize: "0.9rem",
    },
  },
};

export default AuthPage;
