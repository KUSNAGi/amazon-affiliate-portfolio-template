const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'audit-logs.json');

class AuditLogger {
  constructor() {
    this.logs = [];
    this._ensureDataDir();
    this._loadLogs();
  }

  _ensureDataDir() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  _loadLogs() {
    try {
      if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, 'utf8');
        this.logs = JSON.parse(raw);
      }
    } catch (err) {
      this.logs = [];
    }
  }

  _persist() {
    try {
      // Keep last 1000 logs in file to maintain high performance
      const trimmed = this.logs.slice(-1000);
      fs.writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist audit log:', err.message);
    }
  }

  log(eventType, details, status = 'SUCCESS') {
    const entry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      eventType: eventType,
      status: status, // SUCCESS, WARNING, FAILURE, BLOCKED, APPROVAL_REQUIRED
      details: details
    };

    this.logs.unshift(entry);
    this._persist();
    return entry;
  }

  getLogs(limit = 100, filterType = null) {
    let result = this.logs;
    if (filterType) {
      result = result.filter(l => l.eventType === filterType);
    }
    return result.slice(0, limit);
  }

  clear() {
    this.logs = [];
    this._persist();
  }
}

module.exports = new AuditLogger();
