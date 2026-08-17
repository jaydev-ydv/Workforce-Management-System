const API = "http://localhost:5000/api";
let isLogin = true;

function toggleForm() {
  isLogin = !isLogin;
  renderAuthMode();
}

function renderAuthMode() {
  document.getElementById("formTitle").innerText = isLogin ? "Login" : "Register";
  document.getElementById("submitBtn").innerText = isLogin ? "Login" : "Register";
  document.getElementById("email").classList.toggle("hidden", isLogin);
  document.getElementById("toggleText").innerText = isLogin ? "New user?" : "Already registered?";
  document.getElementById("toggleLink").innerText = isLogin ? "Register here" : "Login here";
}

// 🔐 MAIN
async function handleAuth() {
  document.getElementById("msg").innerText = "";

  if (isLogin) await login();
  else await register();
}

// 🔑 LOGIN
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(API + "/auth/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);

      // ✅ REDIRECT
      window.location.href = "dashboard.html";
    } else {
      document.getElementById("msg").innerText = data.error || "Login failed";
    }
  } catch {
    document.getElementById("msg").innerText = "Server error";
  }
}

// 📝 REGISTER
async function register() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const email = document.getElementById("email").value;

  try {
    const res = await fetch(API + "/auth/register", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ username, password, email })
    });

    if (res.ok) {
      if (!isLogin) {
        isLogin = true;
        renderAuthMode();
      }

      document.getElementById("password").value = "";
      document.getElementById("msg").style.color = "green";
      document.getElementById("msg").innerText = "Registered successfully. Please login.";
    } else {
      document.getElementById("msg").innerText = "Registration failed";
    }
  } catch {
    document.getElementById("msg").innerText = "Server error";
  }
}

renderAuthMode();
