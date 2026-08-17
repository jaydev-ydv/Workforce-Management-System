const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

async function ensureShiftsSchema() {
  const [employeeIdColumn] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'shifts'
       AND COLUMN_NAME = 'employee_id'`
  );

  if (employeeIdColumn.length === 0) {
    await pool.execute(
      "ALTER TABLE shifts ADD COLUMN employee_id VARCHAR(255) NULL"
    );
  }

  const schemaUpdates = [
    {
      column: "attendance_status",
      sql: "ALTER TABLE shifts ADD COLUMN attendance_status VARCHAR(50) NOT NULL DEFAULT 'scheduled'"
    },
    {
      column: "leave_type",
      sql: "ALTER TABLE shifts ADD COLUMN leave_type VARCHAR(50) NULL"
    }
  ];

  for (const update of schemaUpdates) {
    const [columnRows] = await pool.execute(
      `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'shifts'
         AND COLUMN_NAME = ?`,
      [update.column]
    );

    if (columnRows.length === 0) {
      await pool.execute(update.sql);
    }
  }
}

function calculateShiftHours(startTime, endTime) {
  const [startHour, startMinute] = String(startTime).split(":").map(Number);
  const [endHour, endMinute] = String(endTime).split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const durationMinutes = Math.max(endTotal - startTotal, 0);

  return Number((durationMinutes / 60).toFixed(2));
}

router.post("/auth/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    await pool.execute(
      "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
      [username, hashed, email, "employee"]
    );

    res.json({ message: "Registered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/employees", auth, async (req, res) => {
  try {
    const { id, name, age, experience, role, phone } = req.body;

    await pool.execute(
      `INSERT INTO employees (id, name, age, experience, role, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, age, experience, role, phone]
    );

    res.json({ message: "Employee added" });
  } catch (err) {
    console.error("Error adding employee:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE username = ?",
    [username]
  );

  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET);
  res.json({ token });
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

router.get("/employees", auth, async (req, res) => {
  const [rows] = await pool.execute("SELECT * FROM employees");
  res.json(rows);
});

router.get("/users", auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, email, role FROM users ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    console.error("Error loading users:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id/password", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim().length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const [users] = await pool.execute(
      "SELECT id FROM users WHERE id = ?",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashed, id]
    );

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/shifts", auth, async (req, res) => {
  try {
    await ensureShiftsSchema();

    const { employee_id, date, start, end, title } = req.body;

    if (!employee_id || !date || !start || !end) {
      return res.status(400).json({ error: "Missing required shift fields" });
    }

    const [employees] = await pool.execute(
      "SELECT id, name FROM employees WHERE id = ?",
      [employee_id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = employees[0];
    const shiftTitle = title?.trim() || `${employee.name} Shift`;

    await pool.execute(
      `INSERT INTO shifts (title, employee_id, shift_date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [shiftTitle, employee_id, date, start, end]
    );

    res.json({ message: "Shift created" });
  } catch (err) {
    console.error("Error creating shift:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/shifts", auth, async (req, res) => {
  try {
    await ensureShiftsSchema();

    const [rows] = await pool.execute(
      `SELECT
         s.id,
         s.title,
         s.employee_id,
         e.name AS employee_name,
         s.shift_date,
         s.start_time,
         s.end_time,
         s.attendance_status,
         s.leave_type
       FROM shifts s
       LEFT JOIN employees e ON e.id = s.employee_id
       ORDER BY s.shift_date ASC, s.start_time ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error("Error loading shifts:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/shifts/:id", auth, async (req, res) => {
  try {
    await ensureShiftsSchema();

    const { id } = req.params;
    const { employee_id, date, start, end, title } = req.body;

    if (!employee_id || !date || !start || !end) {
      return res.status(400).json({ error: "Missing required shift fields" });
    }

    const [employees] = await pool.execute(
      "SELECT id, name FROM employees WHERE id = ?",
      [employee_id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const [existingShift] = await pool.execute(
      "SELECT id FROM shifts WHERE id = ?",
      [id]
    );

    if (existingShift.length === 0) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const employee = employees[0];
    const shiftTitle = title?.trim() || `${employee.name} Shift`;

    await pool.execute(
      `UPDATE shifts
       SET title = ?, employee_id = ?, shift_date = ?, start_time = ?, end_time = ?
       WHERE id = ?`,
      [shiftTitle, employee_id, date, start, end, id]
    );

    res.json({ message: "Shift updated" });
  } catch (err) {
    console.error("Error updating shift:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/shifts/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      "DELETE FROM shifts WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Shift not found" });
    }

    res.json({ message: "Shift deleted" });
  } catch (err) {
    console.error("Error deleting shift:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports", auth, async (req, res) => {
  try {
    await ensureShiftsSchema();

    const [rows] = await pool.execute(
      `SELECT
         s.employee_id,
         e.name,
         SUM(
           CASE
             WHEN s.attendance_status = 'completed'
             THEN TIMESTAMPDIFF(MINUTE,
               STR_TO_DATE(s.start_time, '%H:%i:%s'),
               STR_TO_DATE(s.end_time, '%H:%i:%s')
             )
             ELSE 0
           END
         ) AS completed_minutes,
         SUM(CASE WHEN s.attendance_status = 'leave' THEN 1 ELSE 0 END) AS leave_taken,
         SUM(CASE WHEN s.attendance_status = 'scheduled' THEN 1 ELSE 0 END) AS pending_shifts
       FROM shifts s
       LEFT JOIN employees e ON e.id = s.employee_id
       GROUP BY s.employee_id, e.name
       ORDER BY e.name ASC`
    );

    const reports = rows.map(row => ({
      employee_id: row.employee_id,
      name: row.name || row.employee_id,
      completed_hours: Number(((row.completed_minutes || 0) / 60).toFixed(2)),
      leave_taken: row.leave_taken || 0,
      pending_shifts: row.pending_shifts || 0
    }));

    res.json(reports);
  } catch (err) {
    console.error("Error loading reports:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/attendance", auth, async (req, res) => {
  try {
    await ensureShiftsSchema();

    const { shift_id, status, leave_type } = req.body;

    if (!shift_id || !status) {
      return res.status(400).json({ error: "Shift ID and attendance status are required" });
    }

    if (!["completed", "leave", "scheduled"].includes(status)) {
      return res.status(400).json({ error: "Invalid attendance status" });
    }

    if (status === "leave" && !leave_type) {
      return res.status(400).json({ error: "Leave type is required when marking leave" });
    }

    const [shifts] = await pool.execute(
      "SELECT id, start_time, end_time FROM shifts WHERE id = ?",
      [shift_id]
    );

    if (shifts.length === 0) {
      return res.status(404).json({ error: "Shift not found" });
    }

    await pool.execute(
      `UPDATE shifts
       SET attendance_status = ?, leave_type = ?
       WHERE id = ?`,
      [status, status === "leave" ? leave_type : null, shift_id]
    );

    const completedHours = status === "completed"
      ? calculateShiftHours(shifts[0].start_time, shifts[0].end_time)
      : 0;

    res.json({
      message: "Attendance updated",
      completed_hours: completedHours
    });
  } catch (err) {
    console.error("Error updating attendance:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
