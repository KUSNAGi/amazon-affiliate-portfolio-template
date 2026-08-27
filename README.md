# 🛍️ Amazon Affiliate Portfolio & Social Syndication Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com)
[![Status: Production](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

> **A 100% free, production-ready, open-source template for Amazon Associates, Influencers, and Content Creators to build an autonomous e-commerce deals portfolio with automated Pinterest syndication, live price synchronization, and strict affiliate compliance.**

---

## 🌟 Why Use This Template?

Running an affiliate business manually is time-consuming. Deals expire, prices fluctuate, and out-of-date prices can violate Amazon Associates policies. 

This template provides an **all-in-one autonomous system** that:
* 🌐 **Deploys a responsive storefront** in under 5 minutes with zero hosting costs (Render / Vercel Free Tier).
* 🔄 **Synchronizes Amazon prices in real time** with multi-selector fallback scraping.
* 📌 **Automates Pinterest marketing** via Media RSS 2.0 and Pinterest Bulk CSV exports.
* 🛡️ **Guarantees 100% affiliate compliance** by validating outbound links, rating thresholds, and mandatory disclosures.
* 📊 **Syncs audit reports with Google Sheets** for live portfolio tracking.
* 🔒 **Includes a private admin dashboard** for 1-click ASIN lookup, price editing, and catalog management.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: PRESENTATION & STOREFRONT                   │
│   • Responsive Glassmorphic Storefront   • Category Filters & Search    │
│   • 1-Click WhatsApp & Social Sharing    • Dynamic Deal Countdown Timer │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    LAYER 2: WEB & API SERVER (Node / Express)           │
│   • REST Endpoints (/api/products, /api/cron/*, /api/admin/*)           │
│   • Static Asset Pipeline                • Security & Rate Limiting     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    LAYER 3: GOVERNANCE & COMPLIANCE AGENT               │
│   • Safe-Fail Circuit Breaker            • Amazon Tag Strict Matching   │
│   • Mandatory Affiliate Disclosures      • Product Integrity Gate (4★+) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    LAYER 4: REAL-TIME PRICE ENGINE                      │
│   • 7-Stage Multi-Selector Fallback      • Anti-Bot Header Rotation     │
│   • Buybox Availability Parsing          • Price Delta Change Tracking  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    LAYER 5: STORAGE & HIGH-SPEED CACHE                  │
│   • In-Memory Map Cache (O(1) Access)    • JSON File Backing Store      │
│   • Live Google Sheets CSV Ingestion     • Ultra-Lean <80MB Memory      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    LAYER 6: PINTEREST & SOCIAL SYNDICATION              │
│   • Media RSS 2.0 XML Auto-Publisher     • Pinterest Bulk CSV Generator │
│   • Automated #ad Tag Attribution        • High-Res Image Pipeline      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Setup Guide

### 📋 Prerequisites
1. **Node.js 18+** installed locally ([Download Node.js](https://nodejs.org/)).
2. An active **Amazon Associates Account** to get your Associate Tag (e.g. `yourtag-21`).
3. *(Optional)* A **Pinterest Business Account** to automate daily pin publishing.

---

### Step 1: Clone the Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/amazon-affiliate-portfolio-template.git

# Enter the project directory
cd amazon-affiliate-portfolio-template

# Install dependencies
npm install
```

---

### Step 2: Configure Environment Variables

Create your local `.env` configuration from the provided template:

```bash
cp .env.example .env
```

Open `.env` in your code editor and customize the parameters:

```env
# Server Port
PORT=3000

# Your Public Website URL (e.g., http://localhost:3000 for local testing)
SITE_URL=http://localhost:3000

# Your Amazon Associates Partner Tracking Tag (e.g., yourtag-21)
AMAZON_ASSOCIATE_TAG=YOUR_ASSOCIATE_TAG_21

# Master Password for the Private Admin Dashboard (/admin)
ADMIN_PASSWORD=YOUR_STRONG_ADMIN_PASSWORD_HERE

# Notification Email for System & Integrity Reports
GUARDIAN_ALERT_EMAIL=YOUR_NOTIFICATION_EMAIL@example.com

# Automated Cron Sync Interval (in hours)
SYNC_INTERVAL_HOURS=2
```

---

### Step 3: Run & Test Locally

```bash
# Run test suite to verify 1-to-1 link integrity & format checks
npm test

# Start the application server
npm start
```

* 🛍️ **Public Deals Storefront**: [http://localhost:3000](http://localhost:3000)
* 🔐 **Admin Supervisor Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin) *(Log in with your `ADMIN_PASSWORD`)*

---

## ☁️ Free 1-Click Cloud Deployment

### Option A: Deploy on Render.com (Recommended - 100% Free)

1. Sign up or log in to [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Fill in the build settings:
   * **Name**: `my-affiliate-store` *(or your preferred name)*
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   * `NODE_ENV` = `production`
   * `AMAZON_ASSOCIATE_TAG` = `YOUR_ASSOCIATE_TAG_21`
   * `ADMIN_PASSWORD` = `YOUR_STRONG_ADMIN_PASSWORD_HERE`
   * `SITE_URL` = `https://YOUR-APP-NAME.onrender.com`
   * `GUARDIAN_ALERT_EMAIL` = `YOUR_NOTIFICATION_EMAIL@example.com`
6. Click **Deploy Web Service**. Your affiliate site is live!

---

### Option B: Deploy on Vercel (Serverless)

1. Sign up or log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** → **Project** and import your repository.
3. In **Environment Variables**, add `AMAZON_ASSOCIATE_TAG`, `ADMIN_PASSWORD`, and `SITE_URL`.
4. Click **Deploy**. Vercel uses the included [`vercel.json`](vercel.json) automatically.

---

## 📌 Pinterest Automation Setup

Drive passive traffic to your affiliate site with two automated methods:

### Method 1: Pinterest Media RSS Auto-Publish (100% Hands-Free)
1. Go to your **Pinterest Business Hub** → **Settings** → **Claimed Accounts**.
2. Claim your deployed website domain (e.g., `https://YOUR-APP-NAME.onrender.com`).
3. Navigate to **Bulk Create Pins** → **Auto-publish from RSS feed**.
4. Enter your live feed URL:
   ```
   https://YOUR-APP-NAME.onrender.com/pinterest-deals.xml
   ```
5. Select your target Pinterest Board (e.g., *Best Amazon Deals*).
6. Click **Save**. Pinterest will automatically check your feed and publish new pins daily with compliance tags (`#ad`) and your direct links!

### Method 2: 1-Click Pinterest Bulk CSV Upload
1. Log in to your **Admin Dashboard** (`/admin`) or visit `/pinterest-pins.csv`.
2. Download the pre-formatted CSV file.
3. In Pinterest, navigate to **Create** → **Create Pins in Bulk**.
4. Upload the downloaded CSV to schedule dozens of pins instantly.

---

## 📊 Google Sheets Real-Time Sync & Auditing

Track your deals catalog and price changes in Google Sheets:

1. Open a new Google Sheet.
2. In cell `A1`, paste the following formula:
   ```excel
   =IMPORTDATA("https://YOUR-APP-NAME.onrender.com/master-ecosystem-audit.csv")
   ```
3. Google Sheets will automatically fetch and display your live product metrics, price deltas, and compliance health status.

---

## 🛠️ Admin Dashboard Capabilities (`/admin`)

* **🔍 1-Click Product Addition**: Enter any 10-character Amazon ASIN to look up product titles, prices, ratings, and high-res images automatically.
* **⚡ Live Price Auditor**: Run real-time buybox checks across your entire catalog.
* **📉 Price Deltas Ledger**: Inspect recorded price reductions and discounts.
* **📌 Pinterest OAuth & Status**: Check feed generation status and download CSVs.
* **💬 User Feedback Inbox**: Review and resolve customer product suggestions.

---

## 📡 REST API Reference

| Endpoint | Method | Access | Description |
| :--- | :---: | :---: | :--- |
| `/api/products` | `GET` | Public | Returns verified catalog products in JSON |
| `/api/cron/ping` | `GET` | Public | Lightweight keep-alive health check |
| `/api/cron/2hour-sync` | `GET` | Public | Scheduled 2-hour price & compliance sync |
| `/pinterest-deals.xml` | `GET` | Public | Media RSS 2.0 XML feed for Pinterest Auto-Publish |
| `/pinterest-pins.csv` | `GET` | Public | Pre-formatted Pinterest Bulk Upload CSV |
| `/master-ecosystem-audit.csv` | `GET` | Public | Google Sheets live CSV export bridge |
| `/api/admin/system-status` | `GET` | Admin | Safe-Fail Guardian status & memory telemetry |
| `/api/admin/price-deltas` | `GET` | Admin | Price change audit trail |
| `/api/admin/run-price-sync` | `POST` | Admin | Manual trigger for instant real-time price verification |

---

## 🛡️ Policy & Disclaimer Compliance

This template is built in accordance with the Amazon Associates Program Operating Agreement:
* **Canonical Attribution**: Outbound links are strictly tagged with your verified `tag=YOUR_TAG`.
* **Clear Disclosures**: Prominent static and dynamic affiliate notices ("*As an Amazon Associate, I earn from qualifying purchases*") appear on the storefront, cards, and privacy pages.
* **Transparent Pricing**: Displays real-time timestamps on price data to ensure accuracy.

---

## 📜 License

Distributed under the **MIT License**. Free for personal and commercial use. See [`LICENSE`](LICENSE) for details.
