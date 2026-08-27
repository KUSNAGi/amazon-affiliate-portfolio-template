const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'data', 'audit-logs.json');
const MASTER_ARCHIVE_FILE = path.join(__dirname, '..', 'data', 'master-audit-archive.json');

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

    // Initialize master archive if not present
    try {
      if (!fs.existsSync(MASTER_ARCHIVE_FILE) && this.logs.length > 0) {
        fs.writeFileSync(MASTER_ARCHIVE_FILE, JSON.stringify(this.logs, null, 2), 'utf8');
      }
    } catch (e) {}
  }

  _persist(newEntry = null) {
    try {
      // Keep last 300 logs in active memory/file
      fs.writeFileSync(LOG_FILE, JSON.stringify(this.logs.slice(0, 300), null, 2), 'utf8');

      // Append to master archive efficiently without reading full file on every log
      if (newEntry && !this._isPersistingArchive) {
        this._isPersistingArchive = true;
        setImmediate(() => {
          try {
            let masterArchive = this.logs.slice(0, 500);
            fs.writeFileSync(MASTER_ARCHIVE_FILE, JSON.stringify(masterArchive, null, 2), 'utf8');
          } catch (e) {
          } finally {
            this._isPersistingArchive = false;
          }
        });
      }
    } catch (err) {
      console.error('Failed to persist audit log:', err.message);
    }
  }

  /**
   * Enhanced human-readable structured logging
   */
  logHumanReadable({ toolOrModule, actionPerformed, permissionUsed = 'READ_PUBLIC_METADATA', complianceStatus = '100%_COMPLIANT', details = {} }) {
    const now = new Date();
    const entry = {
      id: 'AUD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      timestamp: now.toISOString(),
      timestampIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      toolOrModule: toolOrModule || 'System Orchestrator',
      actionPerformed: actionPerformed || 'Operation executed',
      permissionUsed: permissionUsed,
      complianceStatus: complianceStatus, // 100%_COMPLIANT, CLEAN_PASS, VIOLATION_BLOCKED, EMERGENCY_HALT
      status: complianceStatus === 'EMERGENCY_HALT' || complianceStatus === 'VIOLATION_BLOCKED' ? 'FAIL' : 'SUCCESS',
      eventType: actionPerformed.substring(0, 40),
      details: details
    };

    this.logs.unshift(entry);
    if (this.logs.length > 300) {
      this.logs = this.logs.slice(0, 300);
    }
    this._persist(entry);
    return entry;
  }

  /**
   * Standard compatibility log method
   */
  log(eventType, details, status = 'SUCCESS') {
    const now = new Date();
    const entry = {
      id: 'AUD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
      timestamp: now.toISOString(),
      timestampIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      toolOrModule: details?.tool || 'System Module',
      actionPerformed: eventType.replace(/_/g, ' '),
      permissionUsed: details?.permission || 'STANDARD_EXECUTION',
      complianceStatus: status === 'SUCCESS' ? '100%_COMPLIANT' : 'VIOLATION_BLOCKED',
      status: status,
      eventType: eventType,
      details: details
    };

    this.logs.unshift(entry);
    if (this.logs.length > 300) {
      this.logs = this.logs.slice(0, 300);
    }
    this._persist(entry);
    return entry;
  }

  getLogs(limit = 100, filterType = null) {
    let result = this.logs;
    if (filterType) {
      result = result.filter(l => l.eventType === filterType || l.toolOrModule?.includes(filterType));
    }
    return result.slice(0, limit);
  }

  clear() {
    this.logs = [];
    this._persist();
  }
}

module.exports = new AuditLogger();
