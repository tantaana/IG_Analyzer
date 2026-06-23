// Instagram Analyzer v31.0 — injected by WebView wrapper
// Original Tampermonkey metadata stripped; logic is unchanged.

(function () {
    'use strict';

    // ── Guard: prevent double-injection if onPageFinished fires twice ─────────
    // sessionStorage resets on hard navigation, so it won't persist across pages.
    if (sessionStorage.getItem('__igAnalyzerActive') === '1') return;
    sessionStorage.setItem('__igAnalyzerActive', '1');
    setTimeout(() => sessionStorage.removeItem('__igAnalyzerActive'), 3000);

    // ─────────────────────────────────────────────────────────────────────────
    // GLOBAL STYLES
    // ─────────────────────────────────────────────────────────────────────────
    const style = document.createElement("style");
    style.innerHTML = `
        @keyframes igSpin {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        @keyframes igFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        #ig-analyzer-panel {
            animation: igFadeIn 0.25s ease;
        }
        #ig-analyzer-panel * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        }
        #ig-analyzer-panel ::-webkit-scrollbar { width: 4px; }
        #ig-analyzer-panel ::-webkit-scrollbar-track { background: transparent; }
        #ig-analyzer-panel ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.18);
            border-radius: 2px;
        }
        #ig-analyzer-panel ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.35);
        }
        .ig-list-item:hover {
            background: rgba(255,255,255,0.09) !important;
        }
        .ig-tab-btn:hover {
            background: rgba(255,255,255,0.15) !important;
        }
        .ig-primary-btn {
            transition: transform 0.15s ease, opacity 0.15s ease !important;
        }
        .ig-primary-btn:hover {
            transform: translateY(-1px) !important;
            opacity: 0.9 !important;
        }
        .ig-primary-btn:active {
            transform: translateY(0) !important;
        }
        .ig-back-btn:hover {
            background: rgba(255,255,255,0.12) !important;
            color: white !important;
        }
        #ig-collapse-btn:hover {
            background: rgba(255,255,255,0.28) !important;
        }
    `;
    document.head.appendChild(style);


    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    const delay = ms => new Promise(r => setTimeout(r, ms));

    function makeDraggable(panel, handle) {
        let dragging = false, ox = 0, oy = 0;

        handle.addEventListener("mousedown", e => {
            const tag = (e.target.tagName || "").toUpperCase();
            if (tag === "BUTTON" || tag === "INPUT" || tag === "A" || tag === "TEXTAREA") return;

            dragging = true;
            const rect = panel.getBoundingClientRect();
            panel.style.left  = rect.left + "px";
            panel.style.top   = rect.top  + "px";
            panel.style.right = "auto";
            ox = e.clientX - rect.left;
            oy = e.clientY - rect.top;
            e.preventDefault();
        });

        // Touch support for mobile
        handle.addEventListener("touchstart", e => {
            const tag = (e.target.tagName || "").toUpperCase();
            if (tag === "BUTTON" || tag === "INPUT" || tag === "A") return;
            const touch = e.touches[0];
            dragging = true;
            const rect = panel.getBoundingClientRect();
            panel.style.left  = rect.left + "px";
            panel.style.top   = rect.top  + "px";
            panel.style.right = "auto";
            ox = touch.clientX - rect.left;
            oy = touch.clientY - rect.top;
        }, { passive: true });

        document.addEventListener("mousemove", e => {
            if (!dragging) return;
            panel.style.left = (e.clientX - ox) + "px";
            panel.style.top  = (e.clientY - oy) + "px";
        });

        document.addEventListener("touchmove", e => {
            if (!dragging) return;
            const touch = e.touches[0];
            panel.style.left = (touch.clientX - ox) + "px";
            panel.style.top  = (touch.clientY - oy) + "px";
        }, { passive: true });

        document.addEventListener("mouseup",  () => { dragging = false; });
        document.addEventListener("touchend", () => { dragging = false; });
    }

    function getInitialAvatar(username) {
        const initial = (username || "?")[0].toUpperCase();
        const palette = ["#fd1d1d", "#c13584", "#833ab4", "#5851db", "#405de6", "#12b886", "#1c7ed6"];
        const color   = palette[(username.charCodeAt(0) || 0) % palette.length];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">`
                  + `<circle cx="18" cy="18" r="18" fill="${color}"/>`
                  + `<text x="18" y="23.5" text-anchor="middle" font-size="16" font-weight="700"`
                  + ` font-family="Arial,sans-serif" fill="white">${initial}</text>`
                  + `</svg>`;
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }


    // ─────────────────────────────────────────────────────────────────────────
    // BASE PANEL FACTORY
    // ─────────────────────────────────────────────────────────────────────────
    function createBasePanel() {
        const old = document.getElementById("ig-analyzer-panel");
        if (old) old.remove();

        const panel = document.createElement("div");
        panel.id = "ig-analyzer-panel";
        Object.assign(panel.style, {
            position:  "fixed",
            top:       "80px",
            right:     "20px",
            width:     "380px",
            maxWidth:  "calc(100vw - 28px)",
            maxHeight: "92vh",
            background: "linear-gradient(175deg, #1c1c2e 0%, #16213e 58%, #0f3460 100%)",
            color:     "white",
            zIndex:    "999999",
            borderRadius: "20px",
            overflow:  "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)",
            display:   "flex",
            flexDirection: "column"
        });
        return panel;
    }

    function addCollapseButton(panel) {
        const btn = document.createElement("button");
        btn.id = "ig-collapse-btn";
        btn.textContent = "✕";
        Object.assign(btn.style, {
            position:     "absolute",
            top:          "13px",
            right:        "13px",
            width:        "26px",
            height:       "26px",
            border:       "none",
            borderRadius: "50%",
            background:   "rgba(255,255,255,0.14)",
            color:        "white",
            fontSize:     "12px",
            fontWeight:   "700",
            cursor:       "pointer",
            lineHeight:   "1",
            zIndex:       "1",
            padding:      "0"
        });

        let collapsed  = false;
        let savedHeight = "92vh";

        btn.onclick = () => {
            collapsed = !collapsed;
            if (collapsed) {
                savedHeight          = panel.style.maxHeight || "92vh";
                panel.style.maxHeight = "54px";
                btn.textContent      = "+";
            } else {
                panel.style.maxHeight = savedHeight;
                btn.textContent      = "✕";
            }
        };
        panel.appendChild(btn);
        return btn;
    }

    function createFooter() {
        const el = document.createElement("div");
        el.innerHTML = `<span style="opacity:.45">Created by</span>`
                     + ` <span style="color:#7fd3ff;font-weight:700;">Shariar Tanvir</span>`;
        Object.assign(el.style, {
            textAlign:     "center",
            fontSize:      "11px",
            padding:       "7px 0 2px",
            letterSpacing: "0.2px"
        });
        return el;
    }


    // ─────────────────────────────────────────────────────────────────────────
    // SCRAPE LIST
    // ─────────────────────────────────────────────────────────────────────────
    async function scrapeList(type) {

        const username = window.location.pathname.replaceAll("/", "");

        const profileRes = await fetch(
            `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
            { credentials: "include", headers: { "x-ig-app-id": "936619743392459" } }
        );
        const profileData = await profileRes.json();
        const userId      = profileData.data.user.id;

        let nextMaxId = "", hasMore = true;
        const collected = [];

        while (hasMore) {

            const url = type === "followers"
                ? `https://www.instagram.com/api/v1/friendships/${userId}/followers/?count=100&max_id=${nextMaxId}`
                : `https://www.instagram.com/api/v1/friendships/${userId}/following/?count=100&max_id=${nextMaxId}`;

            const res  = await fetch(url, {
                credentials: "include",
                headers: { "x-ig-app-id": "936619743392459" }
            });
            const data = await res.json();

            if (!data.users) {
                console.error("Instagram API blocked:", data);
                alert("Instagram API blocked the request. Please try again later.");
                return [];
            }

            data.users.forEach(u => collected.push({
                username:        u.username,
                full_name:       u.full_name       || "",
                profile_pic_url: u.profile_pic_url || null,
                is_verified:     !!u.is_verified
            }));

            hasMore   = !!data.next_max_id;
            nextMaxId = data.next_max_id || "";

            const liveEl = document.getElementById("ig-live-count");
            if (liveEl) {
                const fSaved = localStorage.getItem("ig_followers_count") || 0;
                liveEl.innerHTML = type === "followers"
                    ? `Followers: <b>${collected.length}</b><br>Following: <b>0</b>`
                    : `Followers: <b>${fSaved}</b><br>Following: <b>${collected.length}</b>`;
            }

            await delay(Math.floor(Math.random() * 201) + 300);
        }

        const seen   = new Set();
        const unique = collected.filter(u =>
            seen.has(u.username) ? false : (seen.add(u.username), true)
        );

        if (type === "followers") {
            localStorage.setItem("ig_followers_count", unique.length);
        }

        return unique;
    }


    // ─────────────────────────────────────────────────────────────────────────
    // DASHBOARD UI
    // ─────────────────────────────────────────────────────────────────────────
    function createDashboardUI(fCount, foCount, dontFollowBack, youDontFollowBack, mutuals) {

        const panel = createBasePanel();

        const header = document.createElement("div");
        header.style.cssText = `
            background: linear-gradient(135deg, #fd1d1d, #c13584, #833ab4);
            padding: 18px 48px 16px 20px;
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <div style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;opacity:.65;margin-bottom:5px">
                INSTAGRAM ANALYZER
            </div>
            <div style="font-size:17px;font-weight:700;letter-spacing:-.3px">
                Analysis Complete ✓
            </div>
        `;
        makeDraggable(panel, header);
        panel.appendChild(header);
        addCollapseButton(panel);

        const statsRow = document.createElement("div");
        statsRow.style.cssText = "display:flex;gap:8px;padding:14px 14px 10px;flex-shrink:0;";

        const net = fCount - foCount;
        [
            [fCount,  "Followers", "#ff6b9d"],
            [foCount, "Following", "#7fd3ff"],
            [net,     "Net",       net >= 0 ? "#4cff91" : "#ff5e5e"]
        ].forEach(([val, lbl, clr]) => {
            const card = document.createElement("div");
            card.style.cssText = `
                flex:1;background:rgba(255,255,255,.07);
                border-radius:14px;padding:11px 12px;
                border:1px solid rgba(255,255,255,.1);
            `;
            const display = lbl === "Net" && val > 0 ? `+${Number(val).toLocaleString()}` : Number(val).toLocaleString();
            card.innerHTML = `
                <div style="font-size:9.5px;letter-spacing:.9px;text-transform:uppercase;opacity:.55;margin-bottom:5px">${lbl}</div>
                <div style="font-size:25px;font-weight:800;color:${clr};line-height:1">${display}</div>
            `;
            statsRow.appendChild(card);
        });
        panel.appendChild(statsRow);

        const categories = [
            { emoji: "👻", label: "Don't Follow Me",  data: dontFollowBack    },
            { emoji: "🔕", label: "I Don't Follow",   data: youDontFollowBack },
            { emoji: "🤝", label: "Mutuals",           data: mutuals           }
        ];

        const tabRow = document.createElement("div");
        tabRow.style.cssText = "display:flex;gap:6px;padding:0 14px 10px;flex-shrink:0;";

        const listArea = document.createElement("div");
        listArea.style.cssText = "flex:1;min-height:0;overflow-y:auto;padding:2px 10px 8px;";

        const tabBtns = [];

        function renderList(idx) {
            const cat = categories[idx];

            tabBtns.forEach((b, i) => {
                if (i === idx) {
                    b.style.background  = "rgba(255,255,255,.22)";
                    b.style.borderColor = "rgba(255,255,255,.3)";
                    b.style.fontWeight  = "700";
                } else {
                    b.style.background  = "rgba(255,255,255,.06)";
                    b.style.borderColor = "rgba(255,255,255,.08)";
                    b.style.fontWeight  = "500";
                }
            });

            listArea.innerHTML = "";

            const secHead = document.createElement("div");
            secHead.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding:2px 4px;";
            secHead.innerHTML = `
                <span style="font-size:12px;font-weight:700">${cat.emoji} ${cat.label}</span>
                <span style="font-size:10px;background:rgba(255,255,255,.12);padding:2px 8px;border-radius:20px;font-weight:600">
                    ${cat.data.length}
                </span>
            `;
            listArea.appendChild(secHead);

            if (cat.data.length === 0) {
                const empty = document.createElement("div");
                empty.style.cssText = "text-align:center;padding:26px 0;opacity:.45;font-size:12px;";
                empty.innerHTML = `<div style="font-size:28px;margin-bottom:8px">🎉</div>Nothing here!`;
                listArea.appendChild(empty);
                return;
            }

            cat.data.forEach((user, i) => {
                const uname    = typeof user === "string" ? user : user.username;
                const picUrl   = typeof user === "object" ? user.profile_pic_url : null;
                const fname    = typeof user === "object" ? user.full_name       : "";
                const verified = typeof user === "object" ? user.is_verified     : false;

                const row = document.createElement("div");
                row.className = "ig-list-item";
                row.style.cssText = `
                    display:flex;align-items:center;gap:9px;
                    padding:7px 6px;border-radius:10px;
                    cursor:pointer;transition:background .15s;margin-bottom:1px;
                `;

                const num = document.createElement("span");
                num.style.cssText = "font-size:10px;color:rgba(255,255,255,.32);min-width:20px;text-align:right;font-variant-numeric:tabular-nums;flex-shrink:0";
                num.textContent = i + 1;

                const wrap = document.createElement("div");
                wrap.style.cssText = "position:relative;flex-shrink:0";

                const img = document.createElement("img");
                img.style.cssText = "width:36px;height:36px;border-radius:50%;object-fit:cover;background:rgba(255,255,255,.1);display:block;";

                if (picUrl) {
                    img.src = picUrl;
                    img.onerror = () => { img.onerror = null; img.src = getInitialAvatar(uname); };
                } else {
                    img.src = getInitialAvatar(uname);
                }
                wrap.appendChild(img);

                if (verified) {
                    const vBadge = document.createElement("div");
                    vBadge.style.cssText = `
                        position:absolute;bottom:-1px;right:-1px;
                        width:13px;height:13px;background:#3897f0;
                        border-radius:50%;border:1.5px solid #16213e;
                        font-size:7px;color:white;
                        display:flex;align-items:center;justify-content:center;font-weight:700;
                    `;
                    vBadge.textContent = "✓";
                    wrap.appendChild(vBadge);
                }

                const text = document.createElement("div");
                text.style.cssText = "flex:1;min-width:0;";
                text.innerHTML = `<div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">@${uname}</div>`
                    + (fname ? `<div style="font-size:10.5px;opacity:.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px">${fname}</div>` : "");

                const arrow = document.createElement("span");
                arrow.style.cssText = "font-size:12px;opacity:.22;flex-shrink:0";
                arrow.textContent = "↗";

                row.appendChild(num);
                row.appendChild(wrap);
                row.appendChild(text);
                row.appendChild(arrow);

                row.onclick = () => window.open(`https://www.instagram.com/${uname}/`, "_blank");
                listArea.appendChild(row);
            });
        }

        categories.forEach((cat, i) => {
            const btn = document.createElement("button");
            btn.className = "ig-tab-btn";
            btn.style.cssText = `
                flex:1;padding:7px 4px;
                border:1px solid rgba(255,255,255,.08);
                border-radius:10px;
                background:rgba(255,255,255,.06);
                color:white;font-size:10px;font-weight:500;
                cursor:pointer;line-height:1.35;text-align:center;
                transition:background .2s, border-color .2s;
            `;
            btn.innerHTML = `<div style="font-size:17px;margin-bottom:2px">${cat.emoji}</div>`
                          + `<div style="opacity:.65">${cat.data.length}</div>`;
            btn.title    = `${cat.label} (${cat.data.length})`;
            btn.onclick  = () => renderList(i);
            tabRow.appendChild(btn);
            tabBtns.push(btn);
        });

        panel.appendChild(tabRow);
        panel.appendChild(listArea);

        const backWrap = document.createElement("div");
        backWrap.style.cssText = "padding:8px 14px 0;flex-shrink:0;";
        const backBtn = document.createElement("button");
        backBtn.className = "ig-back-btn";
        backBtn.style.cssText = `
            width:100%;padding:9px;border:1px solid rgba(255,255,255,.1);
            border-radius:10px;background:rgba(255,255,255,.06);
            color:rgba(255,255,255,.6);font-size:12px;font-weight:600;
            cursor:pointer;transition:background .2s, color .2s;
            display:flex;align-items:center;justify-content:center;gap:5px;
        `;
        backBtn.innerHTML = `← New Analysis`;
        backBtn.onclick   = () => createStartUI();
        backWrap.appendChild(backBtn);
        panel.appendChild(backWrap);

        const footWrap = document.createElement("div");
        footWrap.style.cssText = "flex-shrink:0;padding:4px 14px 12px;border-top:1px solid rgba(255,255,255,.06);margin-top:8px;";
        footWrap.appendChild(createFooter());
        panel.appendChild(footWrap);

        document.body.appendChild(panel);

        renderList(0);
    }


    // ─────────────────────────────────────────────────────────────────────────
    // START UI
    // ─────────────────────────────────────────────────────────────────────────
    function createStartUI() {

        const panel = createBasePanel();

        const header = document.createElement("div");
        header.style.cssText = `
            background: linear-gradient(135deg, #fd1d1d, #c13584, #833ab4);
            padding: 22px 48px 20px 20px;
            cursor: move; user-select: none;
            text-align: center; flex-shrink: 0;
        `;
        header.innerHTML = `
            <div style="font-size:30px;margin-bottom:8px">📊</div>
            <div style="font-size:16px;font-weight:700;letter-spacing:-.2px">Instagram Analyzer</div>
            <div style="font-size:11px;opacity:.7;margin-top:4px;letter-spacing:.3px">Followers & Following Insights</div>
        `;
        makeDraggable(panel, header);
        panel.appendChild(header);
        addCollapseButton(panel);

        const body = document.createElement("div");
        body.style.cssText = "padding:18px 16px 14px;flex:1;";

        const label = document.createElement("div");
        label.textContent = "Instagram Username";
        label.style.cssText = "font-size:10.5px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;opacity:.5;margin-bottom:8px";
        body.appendChild(label);

        const inputWrap = document.createElement("div");
        inputWrap.style.cssText = "position:relative;margin-bottom:10px;";

        const atSign = document.createElement("span");
        atSign.textContent = "@";
        atSign.style.cssText = "position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:14px;opacity:.4;pointer-events:none;color:white;font-weight:600;";
        inputWrap.appendChild(atSign);

        const input = document.createElement("input");
        input.placeholder  = "username";
        input.type         = "text";
        input.autocomplete = "off";
        input.style.cssText = `
            width:100%;padding:13px 13px 13px 30px;
            border:1.5px solid rgba(255,255,255,.12);
            border-radius:12px;
            background:rgba(255,255,255,.07);
            color:white;font-size:13.5px;
            outline:none;transition:border-color .2s, background .2s;
            caret-color:white;
        `;
        input.addEventListener("focus", () => input.style.borderColor = "rgba(255,255,255,.35)");
        input.addEventListener("blur",  () => input.style.borderColor = "rgba(255,255,255,.12)");
        input.addEventListener("keydown", e => { if (e.key === "Enter") startBtn.click(); });
        inputWrap.appendChild(input);
        body.appendChild(inputWrap);

        const startBtn = document.createElement("button");
        startBtn.className = "ig-primary-btn";
        startBtn.style.cssText = `
            width:100%;padding:13px;border:none;border-radius:12px;
            background:linear-gradient(135deg,#fd1d1d,#c13584);
            color:white;font-size:14px;font-weight:700;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:8px;
            letter-spacing:.2px;
        `;
        startBtn.innerHTML = `<span>Analyze Account</span><span style="font-size:16px">→</span>`;

        startBtn.onclick = () => {
            const uname = input.value.trim().replace(/^@/, "");

            if (!uname) {
                input.style.borderColor = "#ff5e5e";
                input.style.background  = "rgba(255,94,94,.12)";
                input.placeholder       = "⚠ Please enter a username";
                setTimeout(() => {
                    input.style.borderColor = "rgba(255,255,255,.12)";
                    input.style.background  = "rgba(255,255,255,.07)";
                    input.placeholder       = "username";
                }, 2200);
                return;
            }

            localStorage.setItem("ig_auto_start",      "true");
            localStorage.setItem("ig_loading",         "true");
            localStorage.setItem("ig_target_username", uname);

            body.innerHTML = `
                <div style="text-align:center;padding:24px 0">
                    <div style="
                        width:44px;height:44px;
                        border:4px solid rgba(255,255,255,.12);
                        border-top:4px solid white;
                        border-radius:50%;
                        animation:igSpin 1s linear infinite;
                        margin:0 auto 16px
                    "></div>
                    <div style="font-size:14px;font-weight:700;margin-bottom:5px">Redirecting…</div>
                    <div style="font-size:11.5px;opacity:.5">to @${uname}</div>
                </div>
            `;

            setTimeout(() => {
                window.location.href = `https://www.instagram.com/${uname}/`;
            }, 100);
        };
        body.appendChild(startBtn);

        const hints = document.createElement("div");
        hints.style.cssText = "display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:14px;";
        [["👻","Ghost\nFollowers"], ["🤝","Mutual\nFollowers"], ["📊","Full\nStats"]].forEach(([em, txt]) => {
            const c = document.createElement("div");
            c.style.cssText = "background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:9px 6px;text-align:center;";
            c.innerHTML = `<div style="font-size:18px;margin-bottom:3px">${em}</div>`
                        + `<div style="font-size:8.5px;opacity:.5;line-height:1.4;white-space:pre-line">${txt}</div>`;
            hints.appendChild(c);
        });
        body.appendChild(hints);
        panel.appendChild(body);

        const footWrap = document.createElement("div");
        footWrap.style.cssText = "padding:6px 16px 12px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;";
        footWrap.appendChild(createFooter());
        panel.appendChild(footWrap);

        document.body.appendChild(panel);
    }


    // ─────────────────────────────────────────────────────────────────────────
    // LOADING PANEL
    // ─────────────────────────────────────────────────────────────────────────
    function createLoadingPanel() {
        const panel = createBasePanel();

        const header = document.createElement("div");
        header.style.cssText = `
            background:linear-gradient(135deg,#fd1d1d,#c13584,#833ab4);
            padding:18px 48px 16px 20px;
            cursor:move;user-select:none;flex-shrink:0;
        `;
        header.innerHTML = `
            <div style="font-size:10px;letter-spacing:1.8px;text-transform:uppercase;opacity:.65;margin-bottom:5px">INSTAGRAM ANALYZER</div>
            <div style="font-size:17px;font-weight:700">Scanning profile…</div>
        `;
        makeDraggable(panel, header);
        panel.appendChild(header);
        addCollapseButton(panel);

        const body = document.createElement("div");
        body.style.cssText = "padding:28px 20px;text-align:center;flex:1;";
        body.innerHTML = `
            <div style="
                width:50px;height:50px;
                border:4px solid rgba(255,255,255,.1);
                border-top:4px solid #ff6b9d;
                border-radius:50%;
                animation:igSpin 1s linear infinite;
                margin:0 auto 20px
            "></div>
            <div style="font-size:14px;font-weight:700;margin-bottom:14px">
                Fetching followers &amp; following…
            </div>
            <div id="ig-live-count" style="
                font-size:12.5px;line-height:2;
                background:rgba(255,255,255,.07);
                border-radius:12px;padding:12px 20px;
                display:inline-block;min-width:170px
            ">
                Followers: <b>0</b><br>Following: <b>0</b>
            </div>
            <div style="font-size:10.5px;opacity:.3;margin-top:14px">
                This may take a moment…
            </div>
        `;
        panel.appendChild(body);

        const footWrap = document.createElement("div");
        footWrap.style.cssText = "padding:6px 16px 12px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;";
        footWrap.appendChild(createFooter());
        panel.appendChild(footWrap);

        document.body.appendChild(panel);
    }


    // ─────────────────────────────────────────────────────────────────────────
    // ANALYZE ACCOUNT
    // ─────────────────────────────────────────────────────────────────────────
    async function analyzeAccount() {
        // Prevent duplicate analysis if injected twice on same page
        if (sessionStorage.getItem('__igAnalyzing') === '1') return;
        sessionStorage.setItem('__igAnalyzing', '1');

        const followers = await scrapeList("followers");
        const following = await scrapeList("following");

        const followersSet = new Set(followers.map(u => u.username));
        const followingSet = new Set(following.map(u => u.username));

        const dontFollowBack    = following.filter(u => !followersSet.has(u.username));
        const youDontFollowBack = followers.filter(u => !followingSet.has(u.username));
        const mutuals           = followers.filter(u =>  followingSet.has(u.username));

        createDashboardUI(
            followers.length,
            following.length,
            dontFollowBack,
            youDontFollowBack,
            mutuals
        );

        localStorage.removeItem("ig_auto_start");
        localStorage.removeItem("ig_target_username");
        localStorage.removeItem("ig_loading");
        sessionStorage.removeItem('__igAnalyzing');
    }


    // ─────────────────────────────────────────────────────────────────────────
    // ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────
    (async () => {
        const autoStart   = localStorage.getItem("ig_auto_start");
        const targetUser  = localStorage.getItem("ig_target_username");
        const currentUser = window.location.pathname.replaceAll("/", "");

        if (autoStart === "true" && targetUser === currentUser) {
            createLoadingPanel();
            await delay(4000);
            analyzeAccount();
        } else {
            createStartUI();
        }
    })();

})();
