import { pool } from './connection';

export async function createSchema() {
  const connection = await pool.getConnection();
  
  try {
    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user', 'technician') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Locations/Sites table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        type VARCHAR(50) DEFAULT 'urban',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Devices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        device_id VARCHAR(100) UNIQUE NOT NULL,
        location_id INT NOT NULL,
        device_type ENUM('acoustic', 'environmental', 'hybrid') DEFAULT 'acoustic',
        status ENUM('active', 'inactive', 'maintenance', 'offline') DEFAULT 'active',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        calibration_date DATETIME,
        last_heartbeat DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        INDEX idx_location (location_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Monitoring Data table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS monitoring_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        device_id INT NOT NULL,
        sound_level DECIMAL(6, 2),
        frequency_range VARCHAR(50),
        timestamp DATETIME NOT NULL,
        duration INT,
        location_name VARCHAR(255),
        coordinates JSON,
        data_quality ENUM('good', 'fair', 'poor') DEFAULT 'good',
        raw_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        INDEX idx_device (device_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_location (location_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Thresholds table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS thresholds (
        id INT PRIMARY KEY AUTO_INCREMENT,
        device_id INT NOT NULL,
        threshold_type ENUM('warning', 'critical', 'info') DEFAULT 'warning',
        sound_level_min DECIMAL(6, 2),
        sound_level_max DECIMAL(6, 2),
        frequency_range VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        INDEX idx_device (device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Alarms/Alerts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS alarms (
        id INT PRIMARY KEY AUTO_INCREMENT,
        device_id INT NOT NULL,
        location_id INT,
        threshold_id INT,
        alarm_type ENUM('sound_level', 'frequency', 'device_offline', 'maintenance') DEFAULT 'sound_level',
        severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
        message TEXT NOT NULL,
        measured_value DECIMAL(6,2),
        threshold_value DECIMAL(6,2),
        is_active BOOLEAN DEFAULT TRUE,
        status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
        triggered_at DATETIME NOT NULL,
        acknowledged_at DATETIME,
        acknowledged_by VARCHAR(255),
        resolved_at DATETIME,
        resolved_by INT,
        resolution_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        FOREIGN KEY (threshold_id) REFERENCES thresholds(id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_device (device_id),
        INDEX idx_severity (severity),
        INDEX idx_status (is_active),
        INDEX idx_triggered_at (triggered_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Device Events table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS device_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        device_id INT NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
        description TEXT,
        metadata_json JSON,
        event_time DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        INDEX idx_device (device_id),
        INDEX idx_event_type (event_type),
        INDEX idx_event_time (event_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Reports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        report_type ENUM('daily', 'weekly', 'monthly', 'custom') DEFAULT 'daily',
        device_ids JSON,
        date_range_start DATE,
        date_range_end DATE,
        summary TEXT,
        generated_by INT,
        file_path VARCHAR(255),
        status ENUM('draft', 'completed', 'archived') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_type (report_type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        alarm_id INT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        notification_type ENUM('alarm', 'maintenance', 'system', 'report') DEFAULT 'alarm',
        action_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (alarm_id) REFERENCES alarms(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_read (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Maintenance Log table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        device_id INT NOT NULL,
        technician_id INT,
        maintenance_type ENUM('calibration', 'cleaning', 'repair', 'replacement') DEFAULT 'calibration',
        description TEXT,
        duration INT COMMENT 'Duration in minutes',
        next_maintenance_date DATE,
        status ENUM('scheduled', 'in_progress', 'completed') DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
        FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_device (device_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Audit Log table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INT,
        changes JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Database schema created successfully');
    connection.release();
  } catch (error) {
    console.error('✗ Error creating schema:', error);
    connection.release();
    throw error;
  }
}

// Run schema creation
if (require.main === module) {
  createSchema().catch(console.error);
}
