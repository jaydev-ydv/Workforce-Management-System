// While testing on your own computer, this points to your local backend.
// After you deploy the backend to Vercel, replace the line below with
// your real backend URL, e.g. "https://your-backend-name.vercel.app/api"
const API = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000/api"
  : "https://REPLACE-WITH-YOUR-BACKEND-URL.vercel.app/api";

function getToken() {
  return localStorage.getItem("token");
}

async function api(endpoint, method = "GET", data = null) {
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken()
    },
    body: data ? JSON.stringify(data) : null
  });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = "index.html";
    return { error: "Unauthorized" };
  }

  const payload = await res.json();

  if (!res.ok) {
    return {
      error: payload.error || "Request failed"
    };
  }

  return payload;
}
