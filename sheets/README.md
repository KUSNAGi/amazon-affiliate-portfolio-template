# 📊 Project Affiliate — Live Sheets Ecosystem Hub

This directory contains live, auto-synchronized master audit logs and daily performance reports formatted specifically for **Google Sheets** and **Microsoft Excel**.

---

## 📁 Available Sheets in Repo

| File Name | Description | Direct URL |
| :--- | :--- | :--- |
| [`master-ecosystem-audit.csv`](./master-ecosystem-audit.csv) | Full unbroken ledger of every single event, lookup, verification, and check since Day 1. | `http://localhost:3000/sheets/master-ecosystem-audit.csv` |
| [`daily-ecosystem-reports.csv`](./daily-ecosystem-reports.csv) | Daily performance & health summary reports generated every day at 10:00 PM IST. | `http://localhost:3000/sheets/daily-ecosystem-reports.csv` |

---

## ⚡ Option 1: Live Real-Time Google Sheets Formula Sync (Automated)

You can link Google Sheets directly to these live endpoints so your Google Sheet updates automatically without downloading any files:

1. Open a blank Google Sheet at **[sheets.new](https://sheets.new)**.
2. In Cell **A1** of Sheet 1, paste this formula:
   ```excel
   =IMPORTDATA("http://localhost:3000/sheets/master-ecosystem-audit.csv")
   ```
3. In a new tab/sheet, in Cell **A1**, paste this formula for the Daily 10:00 PM Reports:
   ```excel
   =IMPORTDATA("http://localhost:3000/sheets/daily-ecosystem-reports.csv")
   ```
4. Google Sheets will automatically pull, format, and continuously refresh all operations with full IST timestamps, module details, compliance status, and product parameters!

---

## 📥 Option 2: 1-Click Manual Import in Google Sheets

1. Open Portfolio 2 at **`http://localhost:3000/admin`** &rarr; go to **`📜 Audit Trail`**.
2. Click **`📥 Download Master Audit (.CSV / Sheets)`** or **`📊 Download Daily Reports (.CSV / Sheets)`**.
3. In Google Sheets (**[sheets.new](https://sheets.new)**), go to **File &rarr; Import &rarr; Upload** and select the `.csv` file.
4. Select **"Replace current sheet"** &rarr; **"Detect automatically"** &rarr; click **Import data**.

---

## 🛡️ Safe-Fail & Compliance Transparency

Every action is recorded with:
* **Timestamp (IST & UTC)**
* **Tool / Module Name**
* **Action Performed & Reason**
* **Permission Used**
* **Compliance Status (`100%_COMPLIANT`, `VIOLATION_BLOCKED`, `EMERGENCY_HALT`)**
* **Technical Parameters / Target ASINs / Price Deltas / IPs**
