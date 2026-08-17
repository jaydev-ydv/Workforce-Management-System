// Protect dashboard
if (!localStorage.getItem("token")) {
  window.location.href = "index.html";
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

// Navigation
function showSection(section) {
  document.querySelectorAll("main section").forEach(sec => {
    sec.classList.add("hidden");
  });

  document.getElementById(section + "Section").classList.remove("hidden");

  if (section === "admin") {
    loadUsers();
  }

  if (section === "reports") {
    loadAttendanceShifts();
    loadReports();
  }
}

function showEmployeeDetails() {
  showSection("employees");
  const list = document.getElementById("employeeList");
  list.classList.remove("hidden");
  loadEmployees();
}

function openEmployeeRecords() {
  showEmployeeDetails();
}

function openShiftPlanning() {
  window.location.href = "schedule.html";
}

function openAttendanceReports() {
  showSection("reports");
}

document.addEventListener("DOMContentLoaded", () => {
  loadEmployees();
});

async function loadEmployees() {
  const data = await api("/employees");

  document.getElementById("employeeList").innerHTML = data.map(e => `
    <div class="employee-card">
      <h3>${e.name}</h3>
      <p><b>ID:</b> ${e.id}</p>
      <p><b>Age:</b> ${e.age || "-"}</p>
      <p><b>Experience:</b> ${e.experience || 0} yrs</p>
      <p><b>Role:</b> ${e.role}</p>
      <p><b>Phone:</b> ${e.phone || "-"}</p>
    </div>
  `).join("");
}

// Add Employee
async function addEmployee() {
  const id = document.getElementById("emp_id").value.trim();
  const name = document.getElementById("emp_name").value.trim();
  const age = document.getElementById("emp_age").value.trim();
  const experience = document.getElementById("emp_exp").value.trim();
  const role = document.getElementById("emp_role").value.trim();
  const phone = document.getElementById("emp_phone").value.trim();

  if (!id || !name || !role) {
    alert("Enter employee ID, name, and role");
    return;
  }

  const result = await api("/employees", "POST", {
    id,
    name,
    age,
    experience,
    role,
    phone
  });

  if (result.error) {
    alert(result.error);
    return;
  }

  alert("Employee added successfully");
  document.getElementById("emp_id").value = "";
  document.getElementById("emp_name").value = "";
  document.getElementById("emp_age").value = "";
  document.getElementById("emp_exp").value = "";
  document.getElementById("emp_role").value = "";
  document.getElementById("emp_phone").value = "";
  showEmployeeDetails();
}

// Load Reports
async function loadReports() {
  const data = await api("/reports");

  if (data.error) {
    document.getElementById("reportList").innerHTML = `<p>${data.error}</p>`;
    return;
  }

  document.getElementById("reportList").innerHTML = data.map(r => `
    <div class="card">
      <b>${r.name}</b><br>
      Employee ID: ${r.employee_id || "-"}<br>
      Completed Shift Hours: ${r.completed_hours || 0}<br>
      Leave Taken: ${r.leave_taken || 0}<br>
      Pending Shifts: ${r.pending_shifts || 0}
    </div>
  `).join("");
}

async function loadAttendanceShifts() {
  const data = await api("/shifts");

  if (data.error) {
    document.getElementById("attendanceList").innerHTML = `<p>${data.error}</p>`;
    return;
  }

  document.getElementById("attendanceList").innerHTML = data.map(shift => `
    <div class="employee-card">
      <h3>${shift.employee_name || shift.employee_id}</h3>
      <p><b>Shift:</b> ${shift.title}</p>
      <p><b>Date:</b> ${shift.shift_date}</p>
      <p><b>Time:</b> ${shift.start_time} - ${shift.end_time}</p>
      <p><b>Status:</b> ${shift.attendance_status || "scheduled"}</p>
      <div class="shift-actions-inline">
        <button onclick="markAttendance('${shift.id}', 'completed')">Mark Completed</button>
        <button onclick="markAttendance('${shift.id}', 'leave', 'Sick Leave')">Sick Leave</button>
        <button onclick="markAttendance('${shift.id}', 'leave', 'Casual Leave')">Casual Leave</button>
      </div>
    </div>
  `).join("");
}

async function markAttendance(shiftId, status, leaveType = "") {
  const result = await api("/attendance", "POST", {
    shift_id: shiftId,
    status,
    leave_type: leaveType
  });

  if (result.error) {
    alert(result.error);
    return;
  }

  const hoursMsg = status === "completed"
    ? ` Completed hours: ${result.completed_hours || 0}`
    : "";

  alert(`Attendance updated successfully.${hoursMsg}`);
  loadAttendanceShifts();
  loadReports();
}

async function loadUsers() {
  const data = await api("/users");

  if (data.error) {
    document.getElementById("userList").innerHTML = `<p>${data.error}</p>`;
    return;
  }

  document.getElementById("userList").innerHTML = data.map(user => `
    <div class="employee-card">
      <h3>${user.username}</h3>
      <p><b>User ID:</b> ${user.id}</p>
      <p><b>Email:</b> ${user.email || "-"}</p>
      <p><b>Role:</b> ${user.role || "-"}</p>
      <button onclick="prefillResetUser('${user.id}')">Reset This User</button>
    </div>
  `).join("");
}

function prefillResetUser(userId) {
  showSection("admin");
  document.getElementById("reset_user_id").value = userId;
  document.getElementById("reset_password").focus();
}

async function resetUserPassword() {
  const userId = document.getElementById("reset_user_id").value.trim();
  const password = document.getElementById("reset_password").value;
  const msg = document.getElementById("adminMsg");

  if (!userId || !password) {
    msg.style.color = "#ff6b6b";
    msg.innerText = "Enter user ID and new password";
    return;
  }

  const result = await api(`/users/${userId}/password`, "PUT", { password });

  if (result.error) {
    msg.style.color = "#ff6b6b";
    msg.innerText = result.error;
    return;
  }

  msg.style.color = "#7CFC98";
  msg.innerText = "Password reset successfully";
  document.getElementById("reset_password").value = "";
  loadUsers();
}

// Toggle Employee List
function toggleEmployeeList() {
  const list = document.getElementById("employeeList");

  if (list.classList.contains("hidden")) {
    showEmployeeDetails();
    return;
  }

  list.classList.add("hidden");
}
