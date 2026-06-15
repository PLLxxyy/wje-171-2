const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'attendance-secret-key-2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未提供认证令牌' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: '无效的认证令牌' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: '用户名或密码错误' });
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department
    }
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role, department, supervisor_id FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

function calcAttendanceStatus(checkIn, checkOut) {
  const standardStart = 9 * 60;
  const standardEnd = 18 * 60;
  let status = 'normal';
  if (checkIn) {
    const ci = new Date(checkIn);
    const ciMin = ci.getHours() * 60 + ci.getMinutes();
    if (ciMin > standardStart + 30) status = 'late';
  }
  if (checkOut) {
    const co = new Date(checkOut);
    const coMin = co.getHours() * 60 + co.getMinutes();
    if (coMin < standardEnd - 30) {
      status = status === 'late' ? 'half_absent' : 'early_leave';
    }
  }
  if (!checkIn && !checkOut) status = 'absent';
  if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
    if (status === 'normal') status = 'half_absent';
  }
  return status;
}

app.post('/api/attendance/check-in', authMiddleware, (req, res) => {
  const { location, lat, lng } = req.body;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString();

  let record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, dateStr);
  if (record && record.check_in_time) {
    return res.status(400).json({ error: '今日已打卡上班' });
  }

  const status = calcAttendanceStatus(timeStr, record?.check_out_time);

  if (record) {
    db.prepare(`
      UPDATE attendance SET check_in_time = ?, check_in_location = ?, check_in_lat = ?, check_in_lng = ?, status = ?
      WHERE id = ?
    `).run(timeStr, location, lat, lng, status, record.id);
  } else {
    const info = db.prepare(`
      INSERT INTO attendance (user_id, date, check_in_time, check_in_location, check_in_lat, check_in_lng, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, dateStr, timeStr, location, lat, lng, status);
    record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(info.lastInsertRowid);
  }

  res.json(record);
});

app.post('/api/attendance/check-out', authMiddleware, (req, res) => {
  const { location, lat, lng } = req.body;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toISOString();

  let record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, dateStr);
  if (!record || !record.check_in_time) {
    return res.status(400).json({ error: '请先打卡上班' });
  }
  if (record.check_out_time) {
    return res.status(400).json({ error: '今日已打卡下班' });
  }

  const status = calcAttendanceStatus(record.check_in_time, timeStr);
  db.prepare(`
    UPDATE attendance SET check_out_time = ?, check_out_location = ?, check_out_lat = ?, check_out_lng = ?, status = ?
    WHERE id = ?
  `).run(timeStr, location, lat, lng, status, record.id);

  record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(record.id);
  res.json(record);
});

app.get('/api/attendance/today', authMiddleware, (req, res) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, dateStr);
  res.json(record || null);
});

app.get('/api/attendance/my', authMiddleware, (req, res) => {
  const { month } = req.query;
  let records;
  if (month) {
    records = db.prepare(`
      SELECT * FROM attendance 
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
      ORDER BY date DESC
    `).all(req.user.id, month);
  } else {
    records = db.prepare(`
      SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 30
    `).all(req.user.id);
  }
  res.json(records);
});

app.post('/api/field-work', authMiddleware, (req, res) => {
  const { type, destination, work_content, start_time, end_time, location, lat, lng } = req.body;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const tx = db.transaction(() => {
    let attendance = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, dateStr);
    if (!attendance) {
      const info = db.prepare(`
        INSERT INTO attendance (user_id, date, is_field_work, status) VALUES (?, ?, 1, 'normal')
      `).run(req.user.id, dateStr);
      attendance = { id: info.lastInsertRowid };
    } else {
      db.prepare('UPDATE attendance SET is_field_work = 1 WHERE id = ?').run(attendance.id);
    }

    const info = db.prepare(`
      INSERT INTO field_work (user_id, attendance_id, type, destination, work_content, start_time, end_time, location, lat, lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, attendance.id, type, destination, work_content, start_time, end_time, location, lat, lng);

    return db.prepare('SELECT * FROM field_work WHERE id = ?').get(info.lastInsertRowid);
  });

  const record = tx();
  res.json(record);
});

app.get('/api/field-work/my', authMiddleware, (req, res) => {
  const records = db.prepare(`
    SELECT fw.*, u.name as user_name 
    FROM field_work fw 
    LEFT JOIN users u ON fw.user_id = u.id 
    WHERE fw.user_id = ? 
    ORDER BY fw.created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(records);
});

app.get('/api/field-work/team', authMiddleware, requireRole('supervisor', 'admin'), (req, res) => {
  const { status, start_date, end_date } = req.query;
  let sql = `
    SELECT fw.*, u.name as user_name, u.department 
    FROM field_work fw 
    LEFT JOIN users u ON fw.user_id = u.id 
  `;
  const conditions = [];
  const params = [];

  if (req.user.role === 'supervisor') {
    conditions.push('u.supervisor_id = ?');
    params.push(req.user.id);
  }
  if (status) {
    conditions.push('fw.status = ?');
    params.push(status);
  }
  if (start_date) {
    conditions.push('date(fw.start_time) >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(fw.start_time) <= ?');
    params.push(end_date);
  }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY fw.created_at DESC LIMIT 100';

  const records = db.prepare(sql).all(...params);
  res.json(records);
});

app.put('/api/field-work/:id/review', authMiddleware, requireRole('supervisor', 'admin'), (req, res) => {
  const { status } = req.body;
  const id = req.params.id;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE field_work SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?
  `).run(status, req.user.id, now, id);
  const record = db.prepare('SELECT * FROM field_work WHERE id = ?').get(id);
  res.json(record);
});

app.get('/api/supervisor/team-today', authMiddleware, requireRole('supervisor', 'admin'), (req, res) => {
  const dateStr = new Date().toISOString().split('T')[0];
  let teamMembers;
  if (req.user.role === 'supervisor') {
    teamMembers = db.prepare('SELECT * FROM users WHERE supervisor_id = ? OR id = ?').all(req.user.id, req.user.id);
  } else {
    teamMembers = db.prepare("SELECT * FROM users WHERE role != 'admin'").all();
  }
  const userIds = teamMembers.map(u => u.id);
  const attendanceMap = {};
  if (userIds.length) {
    const records = db.prepare(`
      SELECT a.*, 
        (SELECT COUNT(*) FROM field_work fw WHERE fw.attendance_id = a.id) as field_count
      FROM attendance a WHERE a.user_id IN (${userIds.map(() => '?').join(',')}) AND a.date = ?
    `).all(...userIds, dateStr);
    records.forEach(r => { attendanceMap[r.user_id] = r; });
  }
  const result = teamMembers.map(u => {
    const att = attendanceMap[u.id];
    let state = 'absent';
    if (att) {
      if (att.is_field_work || att.field_count > 0) state = 'field';
      else if (att.check_in_time && att.check_out_time) state = 'on_duty';
      else if (att.check_in_time) state = 'working';
      else state = att.status;
    }
    return {
      ...u,
      password: undefined,
      attendance: att,
      state
    };
  });
  res.json(result);
});

app.get('/api/supervisor/team-stats', authMiddleware, requireRole('supervisor', 'admin'), (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  let userSql = "SELECT id, name, username, department FROM users WHERE 1=1";
  let params = [];
  if (req.user.role === 'supervisor') {
    userSql += ' AND (supervisor_id = ? OR id = ?)';
    params.push(req.user.id, req.user.id);
  } else {
    userSql += " AND role != 'admin'";
  }
  const users = db.prepare(userSql).all(...params);
  const userIds = users.map(u => u.id);

  let stats = [];
  if (userIds.length) {
    stats = db.prepare(`
      SELECT 
        user_id,
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal_days,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END) as early_leave_count,
        SUM(CASE WHEN status IN ('absent', 'half_absent') THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN is_field_work = 1 THEN 1 ELSE 0 END) as field_days
      FROM attendance 
      WHERE user_id IN (${userIds.map(() => '?').join(',')}) AND strftime('%Y-%m', date) = ?
      GROUP BY user_id
    `).all(...userIds, targetMonth);
  }
  const statsMap = {};
  stats.forEach(s => { statsMap[s.user_id] = s; });

  const result = users.map(u => ({
    ...u,
    stats: statsMap[u.id] || { total_days: 0, normal_days: 0, late_count: 0, early_leave_count: 0, absent_days: 0, field_days: 0 }
  }));
  res.json(result);
});

app.get('/api/supervisor/field-stats', authMiddleware, requireRole('supervisor', 'admin'), (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  let userCondition = '';
  let params = [targetMonth];
  if (req.user.role === 'supervisor') {
    userCondition = 'AND u.supervisor_id = ?';
    params.push(req.user.id);
  }

  const byType = db.prepare(`
    SELECT fw.type, COUNT(*) as count, 
      SUM((julianday(COALESCE(fw.end_time, fw.start_time)) - julianday(fw.start_time)) * 24) as total_hours
    FROM field_work fw 
    LEFT JOIN users u ON fw.user_id = u.id 
    WHERE strftime('%Y-%m', fw.start_time) = ? ${userCondition}
    GROUP BY fw.type
  `).all(...params);

  const byDest = db.prepare(`
    SELECT fw.destination, COUNT(*) as count,
      SUM((julianday(COALESCE(fw.end_time, fw.start_time)) - julianday(fw.start_time)) * 24) as total_hours
    FROM field_work fw 
    LEFT JOIN users u ON fw.user_id = u.id 
    WHERE strftime('%Y-%m', fw.start_time) = ? ${userCondition}
    GROUP BY fw.destination
    ORDER BY count DESC LIMIT 20
  `).all(...params);

  res.json({ byType, byDest });
});

app.get('/api/admin/department-ranking', authMiddleware, requireRole('admin'), (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const ranking = db.prepare(`
    SELECT 
      u.department,
      COUNT(DISTINCT u.id) as total_employees,
      COUNT(DISTINCT a.date) as total_attendance_records,
      SUM(CASE WHEN a.status = 'normal' THEN 1 ELSE 0 END) as normal_count,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      SUM(CASE WHEN a.status = 'early_leave' THEN 1 ELSE 0 END) as early_leave_count,
      SUM(CASE WHEN a.status IN ('absent', 'half_absent') THEN 1 ELSE 0 END) as absent_count,
      SUM(CASE WHEN a.is_field_work = 1 THEN 1 ELSE 0 END) as field_count
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND strftime('%Y-%m', a.date) = ?
    WHERE u.department IS NOT NULL
    GROUP BY u.department
    ORDER BY normal_count DESC
  `).all(targetMonth);

  const result = ranking.map(r => ({
    ...r,
    attendance_rate: r.total_attendance_records > 0 
      ? Math.round((r.normal_count / r.total_attendance_records) * 100) 
      : 0
  }));
  res.json(result);
});

app.get('/api/admin/late-trend', authMiddleware, requireRole('admin'), (req, res) => {
  const trend = db.prepare(`
    SELECT 
      strftime('%Y-%m', date) as month,
      COUNT(*) as total_records,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count
    FROM attendance 
    WHERE date >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `).all();

  const result = trend.map(t => ({
    ...t,
    late_rate: t.total_records > 0 ? Math.round((t.late_count / t.total_records) * 100 * 10) / 10 : 0
  }));
  res.json(result);
});

app.get('/api/admin/field-distribution', authMiddleware, requireRole('admin'), (req, res) => {
  const { month } = req.query;
  const params = [];
  let dateCond = '';
  if (month) {
    dateCond = "WHERE strftime('%Y-%m', start_time) = ?";
    params.push(month);
  }

  const byDept = db.prepare(`
    SELECT u.department, fw.type, COUNT(*) as count
    FROM field_work fw
    LEFT JOIN users u ON fw.user_id = u.id
    ${dateCond}
    GROUP BY u.department, fw.type
    ORDER BY u.department
  `).all(...params);

  const byType = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM field_work fw
    ${dateCond}
    GROUP BY type
  `).all(...params);

  res.json({ byDept, byType });
});

app.get('/api/admin/export/monthly', authMiddleware, requireRole('admin'), (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const data = db.prepare(`
    SELECT 
      u.username, u.name, u.department,
      a.date, a.check_in_time, a.check_out_time, a.status, a.is_field_work
    FROM attendance a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE strftime('%Y-%m', a.date) = ?
    ORDER BY u.department, u.name, a.date
  `).all(targetMonth);

  res.json(data);
});

app.get('/api/admin/export/field', authMiddleware, requireRole('admin'), (req, res) => {
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const data = db.prepare(`
    SELECT 
      u.username, u.name, u.department,
      fw.type, fw.destination, fw.work_content, fw.start_time, fw.end_time, fw.location, fw.status,
      reviewer.name as reviewer_name, fw.reviewed_at
    FROM field_work fw
    LEFT JOIN users u ON fw.user_id = u.id
    LEFT JOIN users reviewer ON fw.reviewed_by = reviewer.id
    WHERE strftime('%Y-%m', fw.start_time) = ?
    ORDER BY fw.created_at DESC
  `).all(targetMonth);

  res.json(data);
});

app.get('/api/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
  const users = db.prepare(`
    SELECT u.*, s.name as supervisor_name 
    FROM users u 
    LEFT JOIN users s ON u.supervisor_id = s.id 
    ORDER BY u.department, u.role
  `).all();
  users.forEach(u => { delete u.password; });
  res.json(users);
});

app.get('/api/admin/departments', authMiddleware, requireRole('admin'), (req, res) => {
  const depts = db.prepare(`
    SELECT d.*, u.name as manager_name,
      (SELECT COUNT(*) FROM users WHERE department = d.name) as member_count
    FROM departments d
    LEFT JOIN users u ON d.manager_id = u.id
  `).all();
  res.json(depts);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`考勤系统服务已启动: http://localhost:${PORT}`);
});
