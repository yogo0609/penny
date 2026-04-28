#!/usr/bin/env python3
"""
Penny Dashboard — File Writer
Writes index.html, style.css, and app.js cleanly in one shot.
REF-SETUP-01
"""

import os

BASE = '/home/adminyg/discord-security-platform/dashboard'

# ============================================================
# INDEX.HTML
# ============================================================
INDEX = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Penny — Security Dashboard</title>
    <link rel="stylesheet" href="css/style.css">
    <script>
        window.PENNY_API_URL = 'http://100.120.249.6:4000';
    </script>
</head>
<body>

    <div id="login-screen" class="login-screen hidden">
        <div class="login-card">
            <div class="login-brand">
                <div class="login-avatar" id="login-avatar">P</div>
                <div class="login-title">Penny</div>
                <div class="login-sub">Security Platform</div>
            </div>
            <div class="login-form">
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="login-username" class="form-input" placeholder="Username" autocomplete="username">
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="login-password" class="form-input" placeholder="Password" autocomplete="current-password">
                </div>
                <div id="login-error" class="form-error hidden"></div>
                <button class="btn-primary btn-full" id="login-btn" onclick="handleLogin()">Sign In</button>
            </div>
        </div>
    </div>

    <div id="setup-screen" class="login-screen hidden">
        <div class="login-card">
            <div class="login-brand">
                <div class="login-avatar">P</div>
                <div class="login-title">Welcome to Penny</div>
                <div class="login-sub">Create your Platform Owner account</div>
            </div>
            <div class="login-form">
                <div class="setup-notice">No owner account found. This setup can only be completed once.</div>
                <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="setup-username" class="form-input" placeholder="Username">
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="setup-password" class="form-input" placeholder="Min 8 characters">
                </div>
                <div class="form-group">
                    <label class="form-label">Discord ID <span class="form-optional">(optional)</span></label>
                    <input type="text" id="setup-discord" class="form-input" placeholder="Your Discord user ID">
                </div>
                <div id="setup-error" class="form-error hidden"></div>
                <button class="btn-primary btn-full" onclick="handleSetup()">Create Owner Account</button>
            </div>
        </div>
    </div>

    <div id="dashboard" class="dashboard hidden">
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-avatar" id="nav-avatar">P</div>
                <div>
                    <div class="brand-name">Penny</div>
                    <div class="brand-sub">Security Platform</div>
                </div>
            </div>
            <nav class="nav">
                <div class="nav-label">Main</div>
                <button class="nav-item active" data-section="overview">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z"/></svg>
                    Overview
                </button>
                <button class="nav-item" data-section="protection">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1L2 3.5v4C2 11 5 13.5 8 15c3-1.5 6-4 6-7.5v-4L8 1z"/></svg>
                    Protection
                </button>
                <button class="nav-item" data-section="exemptions">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z"/></svg>
                    Exemptions
                </button>
                <div class="nav-label">Moderation</div>
                <button class="nav-item" data-section="moderation">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v9a1.5 1.5 0 01-1.5 1.5H9l-1 2-1-2H2.5A1.5 1.5 0 011 11.5v-9z"/></svg>
                    Mod Log
                </button>
                <div class="nav-label">Configuration</div>
                <button class="nav-item" data-section="welcome">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 108 1a7 7 0 000 14zm1-10H7v2H5v2h2v2h2v-2h2V7H9V5z"/></svg>
                    Welcome & Roles
                </button>
                <button class="nav-item owner-only" data-section="users">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 100-6 3 3 0 000 6zM5.216 14A2.238 2.238 0 015 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 005 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/></svg>
                    Users
                </button>
                <button class="nav-item" data-section="settings">
                    <svg class="nav-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M7.5 1a.5.5 0 01.5.5v1.05a5.002 5.002 0 013.16 1.59l.91-.527.5.866-.91.527a5 5 0 010 3.984l.91.527-.5.866-.91-.527A5.002 5.002 0 018.5 11.45V12.5a.5.5 0 01-1 0v-1.05a5.002 5.002 0 01-3.16-1.59l-.91.527-.5-.866.91-.527a5 5 0 010-3.984l-.91-.527.5-.866.91.527A5.002 5.002 0 016.5 2.55V1.5a.5.5 0 01.5-.5zM8 5a3 3 0 100 6A3 3 0 008 5z"/></svg>
                    Settings
                </button>
            </nav>
            <div class="sidebar-footer">
                <div class="status-pill">
                    <div class="status-dot"></div>
                    <span class="status-text">Penny online</span>
                </div>
            </div>
        </aside>

        <div class="main">
            <div class="topbar">
                <div class="topbar-title" id="page-title">Overview</div>
                <div class="topbar-right">
                    <select class="guild-select" id="guild-select" onchange="selectGuild(this.value)">
                        <option value="">Select Server</option>
                        <option value="1420831117602197597">DMEG Server</option>
                    </select>
                    <div class="test-badge hidden" id="test-badge">TEST MODE</div>
                    <div class="user-pill">
                        <span id="user-pill-name"></span>
                        <span class="user-role-badge" id="user-role-badge"></span>
                        <button class="logout-btn" onclick="handleLogout()">Sign Out</button>
                    </div>
                </div>
            </div>
            <div class="subnav" id="subnav"></div>
            <main class="content" id="content"></main>
        </div>
    </div>

    <script src="js/api.js"></script>
    <script src="js/app.js"></script>
</body>
</html>'''

# ============================================================
# STYLE.CSS
# ============================================================
STYLE = '''/* === PENNY DASHBOARD === */
/* REF-CSS-01 */

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;}

:root{
    --navy:#1e3a5f;
    --bg:#f3f4f6;
    --surface:#ffffff;
    --surface2:#f8fafc;
    --accent:#1d4ed8;
    --accent-hover:#1e40af;
    --accent-light:#eff6ff;
    --accent-border:#bfdbfe;
    --text:#111827;
    --text2:#6b7280;
    --text3:#9ca3af;
    --border:#e5e7eb;
    --border2:#d1d5db;
    --green:#059669;
    --green-bg:#ecfdf5;
    --red:#dc2626;
    --red-bg:#fef2f2;
    --amber:#d97706;
    --amber-bg:#fffbeb;
    --radius:8px;
    --radius-lg:12px;
    --shadow:0 1px 3px rgba(0,0,0,0.08);
}

.hidden{display:none !important;}
.owner-only{display:none;}

::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}

/* LOGIN */
.login-screen{min-height:100vh;background:var(--navy);display:flex;align-items:center;justify-content:center;padding:24px;}
.login-card{background:var(--surface);border-radius:var(--radius-lg);padding:40px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
.login-brand{text-align:center;margin-bottom:32px;}
.login-avatar{width:64px;height:64px;border-radius:50%;background:var(--navy);border:3px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#93c5fd;margin:0 auto 16px;overflow:hidden;}
.login-avatar img{width:100%;height:100%;object-fit:cover;object-position:top;}
.login-title{font-size:22px;font-weight:700;color:var(--text);letter-spacing:-0.3px;}
.login-sub{font-size:13px;color:var(--text2);margin-top:4px;}
.login-form{display:flex;flex-direction:column;gap:16px;}
.form-group{display:flex;flex-direction:column;gap:6px;}
.form-label{font-size:13px;font-weight:600;color:var(--text);}
.form-optional{font-weight:400;color:var(--text3);}
.form-input{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:14px;padding:10px 14px;width:100%;transition:border-color 0.15s;font-family:inherit;}
.form-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}
.form-error{background:var(--red-bg);border:1px solid #fecaca;border-radius:var(--radius);color:var(--red);font-size:13px;padding:10px 14px;}
.setup-notice{background:var(--accent-light);border:1px solid var(--accent-border);border-radius:var(--radius);color:var(--accent);font-size:13px;padding:12px 14px;line-height:1.5;}
.btn-full{width:100%;justify-content:center;}

/* DASHBOARD */
.dashboard{display:flex;flex-direction:row;height:100vh;overflow:hidden;}

/* SIDEBAR */
.sidebar{width:224px;min-width:224px;background:var(--navy);display:flex;flex-direction:column;height:100vh;flex-shrink:0;}
.brand{padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10px;}
.brand-avatar{width:38px;height:38px;border-radius:50%;background:rgba(59,130,246,0.2);border:2px solid rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#93c5fd;flex-shrink:0;overflow:hidden;}
.brand-avatar img{width:100%;height:100%;object-fit:cover;object-position:top;}
.brand-name{font-size:15px;font-weight:700;color:#f1f5f9;letter-spacing:-0.2px;}
.brand-sub{font-size:11px;color:#93c5fd;font-weight:500;}
.nav{flex:1;padding:12px 8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;}
.nav-label{font-size:10px;color:rgba(255,255,255,0.3);font-weight:600;letter-spacing:0.8px;text-transform:uppercase;padding:10px 8px 4px;}
.nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius);cursor:pointer;font-size:13px;color:rgba(255,255,255,0.55);transition:all 0.15s;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
.nav-item:hover{background:rgba(255,255,255,0.07);color:#f1f5f9;}
.nav-item.active{background:rgba(59,130,246,0.2);color:#93c5fd;font-weight:600;}
.nav-icon{width:15px;height:15px;flex-shrink:0;opacity:0.7;}
.nav-item.active .nav-icon{opacity:1;}
.sidebar-footer{padding:12px;border-top:1px solid rgba(255,255,255,0.08);}
.status-pill{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.06);border-radius:20px;padding:7px 12px;font-size:12px;color:rgba(255,255,255,0.5);}
.status-dot{width:7px;height:7px;border-radius:50%;background:#34d399;flex-shrink:0;animation:pulse 2s infinite;}
.status-dot.offline{background:var(--red);animation:none;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

/* MAIN */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;}

/* TOPBAR */
.topbar{height:56px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:var(--surface);flex-shrink:0;}
.topbar-title{font-size:15px;font-weight:600;color:var(--text);}
.topbar-right{display:flex;align-items:center;gap:10px;}
.guild-select{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:13px;padding:6px 10px;cursor:pointer;font-family:inherit;}
.test-badge{background:rgba(217,119,6,0.1);color:var(--amber);font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;border:1px solid rgba(217,119,6,0.3);}
.user-pill{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border2);border-radius:20px;padding:5px 12px;}
.user-pill span{font-size:12px;color:var(--text2);}
.user-role-badge{font-size:10px !important;font-weight:600 !important;padding:2px 7px;border-radius:20px;background:var(--accent-light);color:var(--accent) !important;text-transform:uppercase;letter-spacing:0.3px;}
.logout-btn{background:none;border:none;color:var(--text3);font-size:12px;cursor:pointer;padding:0;transition:color 0.15s;font-family:inherit;}
.logout-btn:hover{color:var(--red);}

/* SUBNAV */
.subnav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;height:44px;flex-shrink:0;}
.subnav-item{padding:0 16px;height:44px;display:flex;align-items:center;font-size:13px;color:var(--text2);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.15s;font-weight:500;white-space:nowrap;font-family:inherit;}
.subnav-item:hover{color:var(--text);}
.subnav-item.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600;}
.subnav-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
.subnav-btn{background:var(--accent);border:none;border-radius:6px;color:#fff;font-size:12px;padding:6px 16px;cursor:pointer;font-weight:600;transition:background 0.15s;font-family:inherit;}
.subnav-btn:hover{background:var(--accent-hover);}

/* CONTENT */
.content{flex:1;overflow-y:auto;padding:28px;background:var(--bg);}

/* PAGE */
.page-heading{font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.3px;margin-bottom:20px;}

/* STATS */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.stat-card{background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--border2);border-radius:var(--radius);padding:18px 20px;}
.stat-card.accent{border-top-color:var(--accent);}
.stat-card.green{border-top-color:var(--green);}
.stat-card.red{border-top-color:var(--red);}
.stat-card.amber{border-top-color:var(--amber);}
.stat-label{font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;}
.stat-value{font-size:28px;font-weight:700;color:var(--text);letter-spacing:-1px;}
.stat-sub{font-size:12px;color:var(--text3);margin-top:4px;}
.stat-up{color:var(--green);}
.stat-down{color:var(--red);}

/* CARDS */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:16px;overflow:hidden;box-shadow:var(--shadow);}
.card-header{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surface2);}
.card-title{font-size:13px;font-weight:700;color:var(--text);}
.card-sub{font-size:12px;color:var(--text2);}
.card-footer{padding:14px 20px;border-top:1px solid var(--border);background:var(--surface2);}

/* TOGGLE ROWS */
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);transition:background 0.1s;}
.toggle-row:last-child{border-bottom:none;}
.toggle-row:hover{background:var(--surface2);}
.toggle-info{flex:1;display:flex;flex-direction:column;}
.toggle-name{font-size:13px;color:var(--text);font-weight:500;}
.toggle-right{display:flex;align-items:center;gap:10px;}
.action-pill{font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid var(--border2);color:var(--text2);background:var(--surface2);cursor:pointer;font-weight:500;transition:all 0.15s;}
.action-pill:hover{border-color:var(--accent);color:var(--accent);}
.toggle{position:relative;width:40px;height:22px;flex-shrink:0;}
.toggle input{opacity:0;width:0;height:0;}
.slider{position:absolute;inset:0;background:#d1d5db;border-radius:22px;cursor:pointer;transition:0.2s;}
.slider::before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15);}
input:checked+.slider{background:var(--accent);}
input:checked+.slider::before{transform:translateX(18px);}

/* THRESHOLDS */
.thr-row{display:flex;align-items:center;gap:12px;padding:11px 20px;border-bottom:1px solid var(--border);}
.thr-row:last-child{border-bottom:none;}
.thr-label{font-size:13px;color:var(--text2);flex:1;}
.thr-input{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:13px;padding:6px 10px;width:80px;text-align:center;transition:border-color 0.15s;font-family:inherit;}
.thr-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}
.thr-unit{font-size:11px;color:var(--text3);width:60px;}

/* TABLES */
.data-table{width:100%;border-collapse:collapse;font-size:13px;}
.data-table th{text-align:left;color:var(--text2);font-weight:600;padding:10px 20px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:0.5px;background:var(--surface2);white-space:nowrap;}
.data-table td{padding:12px 20px;border-bottom:1px solid var(--border);color:var(--text2);}
.data-table tr:last-child td{border-bottom:none;}
.data-table tr:hover td{background:var(--surface2);}
.table-loading{text-align:center;padding:24px;color:var(--text3);font-size:13px;}

/* BADGES */
.badge{font-size:10px;padding:3px 8px;border-radius:20px;font-weight:700;letter-spacing:0.3px;white-space:nowrap;}
.badge-spam{background:var(--red-bg);color:var(--red);}
.badge-warn{background:var(--amber-bg);color:var(--amber);}
.badge-caps{background:var(--accent-light);color:var(--accent);}
.badge-join{background:var(--green-bg);color:var(--green);}
.badge-raid{background:#fce7f3;color:#be185d;}
.badge-owner{background:rgba(124,58,237,0.1);color:#7c3aed;}
.badge-admin{background:var(--accent-light);color:var(--accent);}

/* EXEMPTIONS */
.exempt-item{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:var(--surface2);border-radius:var(--radius);margin-bottom:6px;border:1px solid var(--border);}
.exempt-name{font-size:13px;color:var(--text);}
.exempt-remove{font-size:11px;color:var(--red);cursor:pointer;background:none;border:none;font-weight:500;font-family:inherit;}
.add-exempt{display:flex;gap:8px;margin-top:10px;}
.add-input{flex:1;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:13px;padding:8px 12px;transition:border-color 0.15s;font-family:inherit;}
.add-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}

/* SETTINGS */
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);gap:20px;}
.settings-row:last-child{border-bottom:none;}
.settings-label{font-size:13px;color:var(--text);font-weight:500;}
.settings-input{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:13px;padding:8px 12px;width:240px;flex-shrink:0;transition:border-color 0.15s;font-family:inherit;}
.settings-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}

/* BUTTONS */
.btn-primary{background:var(--accent);border:none;border-radius:var(--radius);color:#fff;font-size:13px;padding:9px 20px;cursor:pointer;font-weight:600;transition:background 0.15s;display:inline-flex;align-items:center;gap:6px;font-family:inherit;}
.btn-primary:hover{background:var(--accent-hover);}
.btn-secondary{background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:13px;padding:8px 20px;cursor:pointer;font-weight:500;font-family:inherit;}
.btn-danger{background:var(--red-bg);border:1px solid #fecaca;border-radius:var(--radius);color:var(--red);font-size:13px;padding:8px 16px;cursor:pointer;font-weight:500;font-family:inherit;}
.btn-danger:hover{background:#fee2e2;}
.add-btn{background:var(--accent);border:none;border-radius:var(--radius);color:#fff;font-size:13px;padding:8px 16px;cursor:pointer;font-weight:600;white-space:nowrap;transition:background 0.15s;font-family:inherit;}
.add-btn:hover{background:var(--accent-hover);}

/* ACTIVITY */
.activity-item{display:flex;align-items:flex-start;gap:12px;padding:13px 20px;border-bottom:1px solid var(--border);transition:background 0.1s;}
.activity-item:last-child{border-bottom:none;}
.activity-item:hover{background:var(--surface2);}
.activity-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0;}
.activity-text{font-size:13px;color:var(--text2);line-height:1.5;}
.activity-text strong{color:var(--text);}
.activity-time{font-size:11px;color:var(--text3);margin-top:3px;}

/* BAD WORDS */
.word-grid{display:flex;flex-wrap:wrap;gap:8px;padding:16px 20px;min-height:56px;}
.word-tag{display:flex;align-items:center;gap:6px;background:var(--red-bg);border:1px solid #fecaca;border-radius:20px;padding:4px 12px;font-size:12px;color:var(--red);font-weight:500;}
.word-remove{background:none;border:none;color:var(--red);cursor:pointer;font-size:15px;line-height:1;padding:0;opacity:0.7;transition:opacity 0.15s;font-family:inherit;}
.word-remove:hover{opacity:1;}
.word-add{display:flex;gap:8px;padding:0 20px 16px;}
.word-input{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius);color:var(--text);font-size:13px;padding:8px 12px;flex:1;max-width:260px;transition:border-color 0.15s;font-family:inherit;}
.word-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-light);}

/* THEME PICKERS */
.swatch-row{display:flex;gap:8px;}
.swatch{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all 0.15s;flex-shrink:0;}
.swatch:hover{transform:scale(1.1);}
.swatch.active{border-color:var(--text);box-shadow:0 0 0 3px rgba(0,0,0,0.1);}
.theme-row{display:flex;gap:6px;}
.theme-opt{padding:5px 14px;border-radius:20px;font-size:12px;cursor:pointer;border:1px solid var(--border2);color:var(--text2);background:var(--surface2);font-weight:500;transition:all 0.15s;font-family:inherit;}
.theme-opt.active{background:var(--accent-light);color:var(--accent);border-color:var(--accent-border);font-weight:600;}

/* DANGER */
.danger-header{padding:14px 20px;border-bottom:1px solid #fecaca;background:var(--red-bg);}
.danger-title{font-size:13px;font-weight:700;color:var(--red);}

/* USERS */
.user-table-avatar{width:32px;height:32px;border-radius:50%;background:var(--accent-light);border:1px solid var(--accent-border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent);flex-shrink:0;}
.user-cell{display:flex;align-items:center;gap:10px;}

/* TOAST */
.toast{position:fixed;bottom:24px;right:24px;background:var(--text);color:#fff;font-size:13px;padding:12px 20px;border-radius:var(--radius);box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:9999;animation:slideUp 0.2s ease;}
.toast.success{background:var(--green);}
.toast.error{background:var(--red);}
@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}

/* EMPTY STATE */
.empty-state{text-align:center;padding:48px 24px;color:var(--text3);}
.empty-state-title{font-size:15px;font-weight:600;color:var(--text2);margin-bottom:6px;}

/* RESPONSIVE */
@media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr);}.sidebar{width:180px;min-width:180px;}}
@media(max-width:600px){.stats-grid{grid-template-columns:1fr;}.content{padding:16px;}.sidebar{display:none;}}
'''

# ============================================================
# Write files
# ============================================================
files = {
    f'{BASE}/index.html':     INDEX,
    f'{BASE}/css/style.css':  STYLE,
}

for path, content in files.items():
    with open(path, 'w') as f:
        f.write(content)
    print(f'✅ Written: {path}')

print('\\n✅ All files written successfully.')
print('Hard refresh your browser to see the changes.')
