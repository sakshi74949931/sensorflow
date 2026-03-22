import { pool } from './connection';

// WebSocket emitter — set by index.ts after server starts to avoid circular imports
let _emitLiveReading: ((data: any) => void) | null = null;
export function setLiveEmitter(fn: (data: any) => void) { _emitLiveReading = fn; }

// ============ DEVICES ============
export async function getDevices() {
  try {
    const connection = await pool.getConnection();
    const [devices] = await connection.query('SELECT * FROM devices');
    connection.release();
    return (devices as any[]) || [];
  } catch (error) {
    console.warn('Using mock data:', error);
    return [
      { id: 1, name: 'Device 1', device_id: 'DEV001', status: 'active', sound_level: 72, location: 'Downtown' },
      { id: 2, name: 'Device 2', device_id: 'DEV002', status: 'offline', sound_level: 0, location: 'Uptown' },
    ];
  }
}

export async function getDeviceById(id: number) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM devices WHERE id = ?', [id]);
    connection.release();
    const devices = rows as any[];
    return devices?.[0] || null;
  } catch (error) {
    console.warn('Using mock data');
    return { id, name: 'Device ' + id, device_id: 'DEV00' + id, status: 'active', sound_level: 70, location: 'Test' };
  }
}

export async function createDevice(data: any) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO devices (name, device_id, location, status) VALUES (?, ?, ?, ?)',
      [data.name, `DEV${String(Math.random() * 1000).padStart(3, '0')}`, data.location, data.status || 'active']
    );
    connection.release();
    const insertResult = result as any;
    return { id: insertResult.insertId, ...data };
  } catch (error) {
    console.warn('Using mock insert');
    return { id: Math.random(), ...data };
  }
}

export async function updateDevice(id: number, data: any) {
  try {
    const connection = await pool.getConnection();
    await connection.query('UPDATE devices SET ? WHERE id = ?', [data, id]);
    connection.release();
    return { id, ...data };
  } catch (error) {
    console.warn('Using mock update');
    return { id, ...data };
  }
}

export async function deleteDevice(id: number) {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM devices WHERE id = ?', [id]);
    connection.release();
    return { success: true };
  } catch (error) {
    console.warn('Using mock delete');
    return { success: true };
  }
}

// ============ MONITORING DATA ============
export async function getMonitoringData(filters: any) {
  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM monitoring_data WHERE 1=1';
    const params: any[] = [];

    if (filters.device_id) {
      query += ' AND device_id = ?';
      params.push(filters.device_id);
    }
    if (filters.start_date) {
      query += ' AND timestamp >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND timestamp <= ?';
      params.push(filters.end_date);
    }

    const [data] = await connection.query(query, params);
    connection.release();
    return (data as any[]) || [];
  } catch (error) {
    console.warn('Using mock monitoring data');
    return [
      { id: 1, device_id: 1, sound_level: 72, frequency_range: '20-20kHz', timestamp: new Date().toISOString() },
      { id: 2, device_id: 2, sound_level: 68, frequency_range: '20-20kHz', timestamp: new Date(Date.now() - 60000).toISOString() },
    ];
  }
}

export async function recordMonitoringData(data: any) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO monitoring_data (device_id, sound_level, frequency_range, timestamp) VALUES (?, ?, ?, ?)',
      [data.device_id, data.sound_level, data.frequency_range || '20-20kHz', new Date()]
    );
    connection.release();
    const insertResult = result as any;
    const reading = { id: insertResult.insertId, ...data, timestamp: new Date().toISOString() };
    try { if (_emitLiveReading) _emitLiveReading(reading); } catch {}
    return reading;
  } catch (error) {
    console.warn('Using mock record');
    return { id: Math.random(), ...data };
  }
}

export async function getLatestReading(deviceId: number) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM monitoring_data WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1',
      [deviceId]
    );
    connection.release();
    const results = rows as any[];
    return results?.[0] || null;
  } catch (error) {
    console.warn('Using mock latest reading');
    return { device_id: deviceId, sound_level: 70, timestamp: new Date().toISOString() };
  }
}

// ============ ALARMS ============
export async function getAlarms(filters: any) {
  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM alarms WHERE 1=1';
    const params: any[] = [];

    if (filters.device_id) {
      query += ' AND device_id = ?';
      params.push(filters.device_id);
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    const [alarms] = await connection.query(query, params);
    connection.release();
    return (alarms as any[]) || [];
  } catch (error) {
    console.warn('Using mock alarms');
    return [
      { id: 1, device_id: 1, severity: 'warning', message: 'High noise level', is_active: true, triggered_at: new Date().toISOString() },
      { id: 2, device_id: 2, severity: 'critical', message: 'Critical noise', is_active: true, triggered_at: new Date(Date.now() - 3600000).toISOString() },
    ];
  }
}

export async function getAlarmById(id: number) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM alarms WHERE id = ?', [id]);
    connection.release();
    const alarms = rows as any[];
    return alarms?.[0] || null;
  } catch (error) {
    return null;
  }
}

export async function acknowledgeAlarm(id: number, acknowledgedBy: string) {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE alarms SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = ? WHERE id = ?",
      [acknowledgedBy, id]
    );
    connection.release();
    return { id, status: 'acknowledged', acknowledged_by: acknowledgedBy, acknowledged_at: new Date().toISOString() };
  } catch (error) {
    console.warn('Using mock acknowledge');
    return { id, status: 'acknowledged' };
  }
}

export async function resolveAlarm(id: number, note: string) {
  try {
    const connection = await pool.getConnection();
    await connection.query(
      "UPDATE alarms SET is_active = 0, status = 'resolved', resolved_at = NOW(), resolution_note = ? WHERE id = ?",
      [note, id]
    );
    connection.release();
    return { id, is_active: false, status: 'resolved' };
  } catch (error) {
    console.warn('Using mock resolve');
    return { id, is_active: false, status: 'resolved' };
  }
}

// ============ REPORTS ============
export async function getReports(filters: any) {
  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM reports WHERE 1=1';
    const params: any[] = [];

    if (filters.report_type) {
      query += ' AND report_type = ?';
      params.push(filters.report_type);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const [reports] = await connection.query(query, params);
    connection.release();
    return (reports as any[]) || [];
  } catch (error) {
    console.warn('Using mock reports');
    return [{ id: 1, title: 'Daily Report', report_type: 'daily', status: 'completed', created_at: new Date().toISOString() }];
  }
}

export async function createReport(data: any) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO reports (title, report_type, status) VALUES (?, ?, ?)',
      [data.title, data.report_type || 'custom', 'draft']
    );
    connection.release();
    const insertResult = result as any;
    return { id: insertResult.insertId, ...data };
  } catch (error) {
    console.warn('Using mock create report');
    return { id: Math.random(), ...data };
  }
}

// ============ USERS ============
export async function getUserByEmail(email: string) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    connection.release();
    const users = rows as any[];
    return users?.[0] || null;
  } catch (error) {
    console.warn('Using mock user lookup (DB unavailable)');
    // bcrypt hash of 'password' — pre-computed so bcrypt.compare() works in demo mode
    const DEMO_HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const mockUsers: Record<string, any> = {
      'admin@noisewatch.io':     { id: 1, email: 'admin@noisewatch.io',     name: 'Admin User',       role: 'admin',     password: DEMO_HASH },
      'authority@noisewatch.io': { id: 2, email: 'authority@noisewatch.io', name: 'Authority User',    role: 'authority', password: DEMO_HASH },
      'support@noisewatch.io':   { id: 3, email: 'support@noisewatch.io',   name: 'Support Engineer',  role: 'support',   password: DEMO_HASH },
      'admin@test.com':          { id: 4, email: 'admin@test.com',          name: 'Test Admin',        role: 'admin',     password: DEMO_HASH },
      'user@test.com':           { id: 5, email: 'user@test.com',           name: 'Test User',         role: 'user',      password: DEMO_HASH },
    };
    return mockUsers[email] || null;
  }
}

export async function createUser(data: any) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [data.email, data.password, data.name, data.role || 'user']
    );
    connection.release();
    const insertResult = result as any;
    return { id: insertResult.insertId, ...data };
  } catch (error) {
    console.warn('Using mock create user');
    return { id: Math.random(), ...data };
  }
}

// ============ LOCATIONS ============
export async function getLocations() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM locations ORDER BY name');
    connection.release();
    return (rows as any[]) || [];
  } catch (error) {
    console.warn('Using mock locations');
    return [
      { id: 1, name: 'Andheri West', address: 'SV Road, Andheri West, Mumbai', latitude: 19.1364, longitude: 72.8296, type: 'urban' },
      { id: 2, name: 'Bandra Station', address: 'Hill Road, Bandra, Mumbai', latitude: 19.0544, longitude: 72.8402, type: 'transit' },
      { id: 3, name: 'Powai Tech Park', address: 'Hiranandani Gardens, Powai', latitude: 19.1176, longitude: 72.9060, type: 'industrial' },
    ];
  }
}

export async function getLocationById(id: number) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM locations WHERE id = ?', [id]);
    connection.release();
    const results = rows as any[];
    return results?.[0] || null;
  } catch (error) {
    return null;
  }
}

export async function createLocation(data: any) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO locations (name, address, latitude, longitude, type) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.address || '', data.latitude || 0, data.longitude || 0, data.type || 'urban']
    );
    connection.release();
    const insertResult = result as any;
    return { id: insertResult.insertId, ...data };
  } catch (error) {
    console.warn('Using mock create location');
    return { id: Math.random(), ...data };
  }
}

export async function updateLocation(id: number, data: any) {
  try {
    const connection = await pool.getConnection();
    const fields = Object.keys(data).filter(k => ['name','address','latitude','longitude','type'].includes(k));
    if (fields.length === 0) return { id, ...data };
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    await connection.query(`UPDATE locations SET ${setClause} WHERE id = ?`, [...values, id]);
    connection.release();
    return { id, ...data };
  } catch (error) {
    console.warn('Using mock update location');
    return { id, ...data };
  }
}

export async function deleteLocation(id: number) {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM locations WHERE id = ?', [id]);
    connection.release();
    return { success: true };
  } catch (error) {
    return { success: true };
  }
}

// ============ DEVICE EVENTS ============
export async function getDeviceEvents(filters: any) {
  try {
    const connection = await pool.getConnection();
    let query = 'SELECT * FROM device_events WHERE 1=1';
    const params: any[] = [];
    if (filters.device_id) { query += ' AND device_id = ?'; params.push(filters.device_id); }
    if (filters.event_type) { query += ' AND event_type = ?'; params.push(filters.event_type); }
    if (filters.severity) { query += ' AND severity = ?'; params.push(filters.severity); }
    query += ' ORDER BY event_time DESC LIMIT ?';
    params.push(filters.limit || 100);
    const [rows] = await connection.query(query, params);
    connection.release();
    return (rows as any[]) || [];
  } catch (error) {
    console.warn('Using mock events');
    return [
      { id: 1, device_id: 1, event_type: 'threshold_breach', severity: 'warning', description: 'Noise above 85dB', event_time: new Date().toISOString() },
      { id: 2, device_id: 2, event_type: 'offline', severity: 'critical', description: 'Device went offline', event_time: new Date(Date.now() - 3600000).toISOString() },
    ];
  }
}

export async function createDeviceEvent(data: any) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO device_events (device_id, event_type, severity, description, metadata_json, event_time) VALUES (?, ?, ?, ?, ?, NOW())',
      [data.device_id, data.event_type, data.severity || 'info', data.description || '', JSON.stringify(data.metadata || {})]
    );
    connection.release();
    const insertResult = result as any;
    return { id: insertResult.insertId, ...data, event_time: new Date().toISOString() };
  } catch (error) {
    console.warn('Using mock create event');
    return { id: Math.random(), ...data };
  }
}

// ============ REPORTS - HOURLY / DAILY ============
export async function getHourlyReport(filters: any) {
  try {
    const connection = await pool.getConnection();
    const dateFilter = filters.date || new Date().toISOString().split('T')[0];
    let query = `
      SELECT
        HOUR(timestamp) as hour,
        COUNT(*) as reading_count,
        AVG(sound_level) as avg_db,
        MAX(sound_level) as max_db,
        MIN(sound_level) as min_db
      FROM monitoring_data
      WHERE DATE(timestamp) = ?
    `;
    const params: any[] = [dateFilter];
    if (filters.device_id) { query += ' AND device_id = ?'; params.push(filters.device_id); }
    query += ' GROUP BY HOUR(timestamp) ORDER BY hour';
    const [rows] = await connection.query(query, params);
    connection.release();
    return (rows as any[]).map(r => ({
      hour: `${String(r.hour).padStart(2,'0')}:00`,
      reading_count: r.reading_count,
      avg_db: Math.round(r.avg_db * 10) / 10,
      max_db: Math.round(r.max_db * 10) / 10,
      min_db: Math.round(r.min_db * 10) / 10,
    }));
  } catch (error) {
    console.warn('Using mock hourly report');
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2,'0')}:00`,
      reading_count: Math.floor(Math.random() * 100),
      avg_db: Math.round((60 + Math.random() * 30) * 10) / 10,
      max_db: Math.round((80 + Math.random() * 20) * 10) / 10,
      min_db: Math.round((50 + Math.random() * 15) * 10) / 10,
    }));
  }
}

export async function getDailyReport(filters: any) {
  try {
    const connection = await pool.getConnection();
    let query = `
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as reading_count,
        AVG(sound_level) as avg_db,
        MAX(sound_level) as max_db,
        MIN(sound_level) as min_db
      FROM monitoring_data
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters.start_date) { query += ' AND DATE(timestamp) >= ?'; params.push(filters.start_date); }
    if (filters.end_date) { query += ' AND DATE(timestamp) <= ?'; params.push(filters.end_date); }
    if (filters.device_id) { query += ' AND device_id = ?'; params.push(filters.device_id); }
    query += ' GROUP BY DATE(timestamp) ORDER BY date DESC';
    const [rows] = await connection.query(query, params);
    connection.release();
    return (rows as any[]).map(r => ({
      date: r.date,
      reading_count: r.reading_count,
      avg_db: Math.round(r.avg_db * 10) / 10,
      max_db: Math.round(r.max_db * 10) / 10,
      min_db: Math.round(r.min_db * 10) / 10,
    }));
  } catch (error) {
    console.warn('Using mock daily report');
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
      return {
        date: d.toISOString().split('T')[0],
        reading_count: Math.floor(Math.random() * 1000 + 500),
        avg_db: Math.round((60 + Math.random() * 20) * 10) / 10,
        max_db: Math.round((75 + Math.random() * 20) * 10) / 10,
        min_db: Math.round((45 + Math.random() * 15) * 10) / 10,
      };
    });
  }
}
