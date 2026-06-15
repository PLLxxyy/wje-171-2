const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'attendance.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employee', 'supervisor', 'admin')),
      department TEXT,
      supervisor_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supervisor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      manager_id INTEGER,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in_time DATETIME,
      check_out_time DATETIME,
      check_in_location TEXT,
      check_out_location TEXT,
      check_in_lat REAL,
      check_in_lng REAL,
      check_out_lat REAL,
      check_out_lng REAL,
      status TEXT DEFAULT 'normal' CHECK(status IN ('normal', 'late', 'early_leave', 'absent', 'half_absent')),
      is_field_work INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS field_work (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      attendance_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('client_visit', 'site_survey', 'business_trip', 'other')),
      destination TEXT NOT NULL,
      work_content TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      location TEXT,
      lat REAL,
      lng REAL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (attendance_id) REFERENCES attendance(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    
    const adminPass = bcrypt.hashSync('admin123', salt);
    const supPass = bcrypt.hashSync('123456', salt);
    const empPass = bcrypt.hashSync('123456', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, role, department, supervisor_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const adminId = insertUser.run('admin', adminPass, '系统管理员', 'admin', null, null).lastInsertRowid;
    
    const sup1Id = insertUser.run('sup01', supPass, '张主管', 'supervisor', '销售部', null).lastInsertRowid;
    const sup2Id = insertUser.run('sup02', supPass, '李经理', 'supervisor', '技术部', null).lastInsertRowid;

    insertUser.run('emp01', empPass, '王小明', 'employee', '销售部', sup1Id);
    insertUser.run('emp02', empPass, '赵小红', 'employee', '销售部', sup1Id);
    insertUser.run('emp03', empPass, '刘强', 'employee', '销售部', sup1Id);
    insertUser.run('emp04', empPass, '陈伟', 'employee', '技术部', sup2Id);
    insertUser.run('emp05', empPass, '周芳', 'employee', '技术部', sup2Id);
    insertUser.run('emp06', empPass, '孙磊', 'employee', '技术部', sup2Id);

    db.prepare('INSERT OR IGNORE INTO departments (name, manager_id) VALUES (?, ?)').run('销售部', sup1Id);
    db.prepare('INSERT OR IGNORE INTO departments (name, manager_id) VALUES (?, ?)').run('技术部', sup2Id);
    db.prepare('INSERT OR IGNORE INTO departments (name, manager_id) VALUES (?, ?)').run('行政部', adminId);

    console.log('数据库初始化完成，已插入示例数据');
    console.log('管理员账号: admin / admin123');
    console.log('主管账号: sup01 / 123456, sup02 / 123456');
    console.log('员工账号: emp01-emp06 / 123456');
  }
}

initDB();

module.exports = db;
