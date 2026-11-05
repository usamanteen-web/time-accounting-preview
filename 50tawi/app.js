/* TIME — 50 ทวิ certificate builder.
 * Overlays the user's data on the Revenue Department's official form (approve_wh3_081156.pdf,
 * converted to SVG). Field coordinates come from the official PDF's AcroForm widgets (points,
 * A4 595x842, origin top-left), so values land exactly in the printed boxes.
 * Data never leaves the browser: drafts/history are kept in localStorage only.
 */
(() => {
  "use strict";

  // ---------- defaults (TIME is the payer) ----------
  const PAYER = {
    payer_name: "บริษัท ไทม์ เซอร์วิส ดีไซน์ แอนด์ คอนสตรัคชั่นส์ จำกัด (สำนักงานใหญ่)",
    payer_tin: "0105556128862",
    payer_addr: "124/24 หมู่ 12 ตำบลบางพลีใหญ่ อำเภอบางพลี จังหวัดสมุทรปราการ 10540",
  };
  const STORE = "time50tawi.v1";

  // ---------- geometry taken from the official form (points) ----------
  // 13 digit boxes, grouped 1-4-5-2-1; x of each box's left edge, box width 12pt.
  // measured from the official PDF's vector boxes (groups 374.5-386.5 | 392.5-440.6 | 447.1-507.6 | 513.1-537.6 | 544.5-556.6)
  const BOX_X = [374.5, 392.5, 404.52, 416.55, 428.58, 447.1, 459.2, 471.3, 483.4, 495.5, 513.1, 525.35, 544.5];
  const BOX_W = 12.05;
  const F = {
    book_no: [519.4, 44.8, 559.4, 60.8], run_no: [513.0, 61.3, 566.0, 77.3],
    payer_id_y: [83.6, 97.6], payee_id_y: [152.3, 166.3], payee_dx: 0.55,
    name1: [53.9, 96.8, 300.0, 112.9], add1: [60.8, 120.4, 550.4, 136.3],
    name2: [53.2, 170.9, 312.0, 184.4], add2: [59.2, 198.7, 549.6, 215.0],
    item: [77.0, 226.1, 138.8, 241.4],
    chk: { 1: [209.3, 226.8], 2: [288.0, 226.8], 3: [394.7, 227.5], 4: [471.3, 227.5],
           5: [209.3, 245.5], 6: [287.3, 245.5], 7: [394.7, 245.5] },
    rows: {
      r1: { y: [296.0, 308.7] }, r2: { y: [308.6, 322.6] }, r3: { y: [323.9, 337.6] },
      r5: { y: [611.6, 625.7] }, r6: { y: [629.0, 643.1], spec: [96.0, 628.2, 324.7, 644.9] },
    },
    col_date: [327.0, 403.0], pay_baht: [409.5, 474.6], pay_st: [475.2, 489.8], tax_baht: [496.0, 546.0], tax_st: [546.6, 560.5],
    tot_y: [646.5, 661.9], words: [184.6, 665.2, 557.5, 684.4],
    mode: { 1: [82.5, 711.2], 2: [177.3, 709.5], 3: [282.3, 710.2], 4: [393.7, 710.8] },
    issue: { d: [341.8, 754.7, 365.0, 769.9], m: [365.0, 754.7, 428.4, 771.4], y: [429.3, 755.3, 470.1, 769.7] },
    copyLabel: [18, 12, 290, 44],
  };
  const COPY_TEXT = {
    1: ["ฉบับที่ 1", "สำหรับผู้ถูกหักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี"],
    2: ["ฉบับที่ 2", "สำหรับผู้ถูกหักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน"],
    3: ["ฉบับที่ 3", "สำหรับผู้หักภาษี ณ ที่จ่าย ใช้แนบพร้อมกับแบบแสดงรายการภาษี"],
    4: ["ฉบับที่ 4", "สำหรับผู้หักภาษี ณ ที่จ่าย เก็บไว้เป็นหลักฐาน"],
  };
  const TH_MONTH = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const form = $("#f");
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const num = (s) => { const v = parseFloat(String(s || "").replace(/,/g, "")); return Number.isFinite(v) ? v : NaN; };
  const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
  const money = (v) => Number.isFinite(v) ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /** Thai 13-digit ID checksum (same rule for citizen ID and juristic ID). */
  function tinValid(t) {
    if (!/^\d{13}$/.test(t)) return false;
    let s = 0;
    for (let i = 0; i < 12; i++) s += +t[i] * (13 - i);
    return (11 - (s % 11)) % 10 === +t[12];
  }

  const TD = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const TP = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  function readInt(n) {
    if (n === 0) return "";
    if (n >= 1e6) return readInt(Math.floor(n / 1e6)) + "ล้าน" + readInt(n % 1e6);
    const s = String(n); let out = "";
    for (let i = 0; i < s.length; i++) {
      const d = +s[i], pos = s.length - i - 1;
      if (!d) continue;
      if (pos === 0 && d === 1 && s.length > 1) out += "เอ็ด";
      else if (pos === 1 && d === 2) out += "ยี่สิบ";
      else if (pos === 1 && d === 1) out += "สิบ";
      else out += TD[d] + TP[pos];
    }
    return out;
  }
  function bahtText(v) {
    const st = Math.round(v * 100), b = Math.floor(st / 100), s = st % 100;
    return (readInt(b) || "ศูนย์") + "บาท" + (s ? readInt(s) + "สตางค์" : "ถ้วน");
  }
  function beDate(iso) { // 2026-10-12 -> 12/10/2569
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y + 543}`;
  }

  // ---------- state ----------
  function read() {
    const fd = new FormData(form), o = {};
    for (const [k, v] of fd.entries()) o[k] = typeof v === "string" ? v.trim() : v;
    o.c1 = form.c1.checked; o.c3 = form.c3.checked;
    o.payer_tin = digits(o.payer_tin); o.payee_tin = digits(o.payee_tin);
    o.amount_n = round2(num(o.amount));
    o.wht_calc = Number.isFinite(o.amount_n) ? round2(o.amount_n * num(o.rate) / 100) : NaN;
    o.wht_n = o.wht === "" ? o.wht_calc : round2(num(o.wht));
    return o;
  }
  function fill(o) {
    for (const [k, v] of Object.entries(o)) {
      const el = form.elements[k];
      if (!el || el instanceof RadioNodeList) continue;
      if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? "";
    }
  }
  function validate(o) {
    const errs = {};
    if (!tinValid(o.payer_tin)) errs.payer_tin = "เลขผู้เสียภาษีไม่ถูกต้อง (ต้อง 13 หลักและเลขตรวจสอบถูก)";
    if (o.payee_tin && !tinValid(o.payee_tin)) errs.payee_tin = o.payee_tin.length === 13
      ? "เลข 13 หลักนี้ตรวจสอบไม่ผ่าน — น่าจะพิมพ์ผิด 1 ตัว" : "ต้องมี 13 หลัก";
    if (Number.isFinite(o.wht_calc) && Number.isFinite(o.wht_n) && Math.abs(o.wht_calc - o.wht_n) > 0.009)
      errs.wht = `ภาษีที่ใส่ (${money(o.wht_n)}) ไม่เท่ากับ ${o.rate}% ของยอด (${money(o.wht_calc)})`;
    const required = ["run_no", "payer_name", "payer_addr", "payee_name", "payee_addr", "pay_date", "issue_date"];
    const missing = required.filter((k) => !o[k]);
    if (!o.payee_tin) missing.push("payee_tin");
    if (!Number.isFinite(o.amount_n) || o.amount_n <= 0) missing.push("amount");
    return { errs, missing };
  }

  // ---------- overlay rendering ----------
  const box = (r, html, cls = "") =>
    `<div class="fld ${cls}" style="left:${r[0]}pt;top:${r[1]}pt;width:${r[2] - r[0]}pt;height:${r[3] - r[1]}pt">${html}</div>`;
  function digitsHTML(t, y, dx = 0) {
    return [...t].slice(0, 13).map((c, i) =>
      box([BOX_X[i] + dx, y[0], BOX_X[i] + dx + BOX_W, y[1]], esc(c), "dg")).join("");
  }
  /** amount split into the form's baht | satang sub-columns */
  function amt(v, bx, sx, y, cls) {
    if (!Number.isFinite(v)) return "";
    const [b, st] = money(v).split(".");
    return box([bx[0], y[0], bx[1], y[1]], b, "r " + cls) + box([sx[0], y[0], sx[1], y[1]], st, "c " + cls);
  }
  const tick = (p) => `<div class="tick" style="left:${p[0]}pt;top:${p[1]}pt"></div>`;

  function overlay(o, copy) {
    const h = [];
    const [cx0, cy0, cx1, cy1] = F.copyLabel;
    h.push(`<div class="cover" style="left:${cx0}pt;top:${cy0}pt;width:${cx1 - cx0}pt;height:${cy1 - cy0}pt">` +
      `<b>${COPY_TEXT[copy][0]}</b> (${COPY_TEXT[copy][1]})</div>`);
    if (o.book_no) h.push(box(F.book_no, esc(o.book_no), "c"));
    h.push(box(F.run_no, esc(o.run_no), "c b fit"));
    h.push(digitsHTML(o.payer_tin, F.payer_id_y));
    h.push(box(F.name1, esc(o.payer_name), "fit"));
    h.push(box(F.add1, esc(o.payer_addr), "fit"));
    h.push(digitsHTML(o.payee_tin, F.payee_id_y, F.payee_dx));
    h.push(box(F.name2, esc(o.payee_name), "fit"));
    h.push(box(F.add2, esc(o.payee_addr), "fit"));
    if (o.seq_no) h.push(box(F.item, esc(o.seq_no), "c b"));
    h.push(tick(F.chk[o.payee_type === "person" ? 4 : 7]));
    const row = F.rows[o.income_row] || F.rows.r5;
    const ry = row.y;
    h.push(box([F.col_date[0], ry[0], F.col_date[1], ry[1]], beDate(o.pay_date), "c"));
    h.push(amt(o.amount_n, F.pay_baht, F.pay_st, ry, ""));
    h.push(amt(o.wht_n, F.tax_baht, F.tax_st, ry, ""));
    if (row.spec && o.income_spec) h.push(box(row.spec, esc(o.income_spec)));
    h.push(amt(o.amount_n, F.pay_baht, F.pay_st, F.tot_y, "b"));
    h.push(amt(o.wht_n, F.tax_baht, F.tax_st, F.tot_y, "b"));
    if (Number.isFinite(o.wht_n)) h.push(box(F.words, `(${bahtText(o.wht_n)})`, "c b words"));
    h.push(tick(F.mode[o.payer_mode] || F.mode[1]));
    if (o.issue_date) {
      const [y, m, d] = o.issue_date.split("-").map(Number);
      h.push(box(F.issue.d, String(d), "c"));
      h.push(box(F.issue.m, TH_MONTH[m], "c"));
      h.push(box(F.issue.y, String(y + 543), "c"));
    }
    return h.join("");
  }

  function render() {
    const o = read();
    if (!form.wht.matches(":focus") && form.wht.dataset.auto !== "0" && Number.isFinite(o.wht_calc)) {
      form.wht.value = o.wht_calc.toFixed(2); o.wht_n = o.wht_calc;
    }
    const { errs, missing } = validate(o);
    document.querySelectorAll(".msg").forEach((m) => { m.textContent = errs[m.dataset.for] || ""; });
    const ok = !missing.length && !Object.keys(errs).length;
    const st = $("#status");
    st.textContent = ok ? "พร้อมพิมพ์" : (Object.keys(errs).length ? "มีจุดต้องแก้" : `ยังขาด ${missing.length} ช่อง`);
    st.className = "pill " + (ok ? "ok" : "warn");
    $("#btnPrint").disabled = !ok;
    const copies = [...(o.c1 ? [1, 2] : []), ...(o.c3 ? [3, 4] : [])];
    const pages = $("#pages"); pages.innerHTML = "";
    const tpl = $("#tplPage");
    for (const c of copies) {
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.querySelector(".ov").innerHTML = overlay(o, c);
      pages.appendChild(node);
    }
    shrinkToFit();
    sessionStorage.setItem(STORE + ".draft", JSON.stringify(o));
    window.__READY__ = true;
    return { o, ok };
  }

  /** shrink long names/addresses so they never overflow their printed line */
  function shrinkToFit() {
    document.querySelectorAll(".fld.fit").forEach((el) => {
      el.style.fontSize = "";
      let fs = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 0.5 && fs > 6) { fs -= 0.25; el.style.fontSize = fs + "px"; }
    });
  }

  // ---------- history (localStorage) ----------
  const hist = () => JSON.parse(localStorage.getItem(STORE) || "[]");
  function saveHist(o) {
    const list = hist().filter((x) => x.run_no !== o.run_no);
    list.unshift(o); localStorage.setItem(STORE, JSON.stringify(list.slice(0, 500)));
    drawHist();
  }
  function drawHist() {
    const list = hist(), tb = $("#hist tbody");
    tb.innerHTML = list.length ? list.map((x, i) =>
      `<tr><td>${esc(x.run_no)}</td><td>${beDate(x.pay_date)}</td><td>${esc(x.payee_name)}</td>
       <td class="r">${money(x.amount_n)}</td><td class="r">${money(x.wht_n)}</td>
       <td class="r"><button class="lnk" data-i="${i}" type="button">เปิด</button></td></tr>`).join("")
      : `<tr><td colspan="6" class="empty">ยังไม่มี</td></tr>`;
    const seen = new Map();
    list.forEach((x) => { if (x.payee_tin && !seen.has(x.payee_tin)) seen.set(x.payee_tin, x); });
    $("#payeePick").innerHTML = `<option value="">— พิมพ์ใหม่ —</option>` +
      [...seen.values()].map((x) => `<option value="${esc(x.payee_tin)}">${esc(x.payee_name)}</option>`).join("");
  }
  function nextRunNo() {
    const y = new Date().getFullYear();
    const nums = hist().map((x) => /^(\d+)\/(\d{4})$/.exec(x.run_no || "")).filter((m) => m && +m[2] === y).map((m) => +m[1]);
    return nums.length ? `${String(Math.max(...nums) + 1).padStart(5, "0")}/${y}` : "";
  }
  function csv() {
    const cols = ["run_no", "seq_no", "pay_date", "payee_name", "payee_tin", "payee_type", "income_row", "income_spec", "amount_n", "rate", "wht_n", "issue_date"];
    const rows = [cols.join(",")].concat(hist().map((x) => cols.map((c) => `"${String(x[c] ?? "").replace(/"/g, '""')}"`).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv" }));
    a.download = "50tawi-history.csv"; a.click();
  }

  // ---------- events ----------
  function blank() {
    const today = new Date().toISOString().slice(0, 10);
    form.reset(); fill({ ...PAYER, pay_date: today, issue_date: today, income_spec: "ค่าบริการ", run_no: nextRunNo() });
    form.wht.dataset.auto = "1";
  }
  form.addEventListener("input", (e) => {
    if (e.target.name === "wht") form.wht.dataset.auto = e.target.value ? "0" : "1";
    if (e.target.name === "amount" || e.target.name === "rate") form.wht.dataset.auto = "1";
    render();
  });
  form.addEventListener("change", render);
  $("#payeePick").addEventListener("change", (e) => {
    const x = hist().find((h) => h.payee_tin === e.target.value);
    if (x) fill({ payee_name: x.payee_name, payee_tin: x.payee_tin, payee_addr: x.payee_addr, payee_type: x.payee_type });
    render();
  });
  $("#btnNew").addEventListener("click", () => { blank(); render(); });
  $("#btnSave").addEventListener("click", () => { const { o, ok } = render(); if (ok) saveHist(o); flash(ok ? "บันทึกแล้ว" : "ยังกรอกไม่ครบ"); });
  $("#btnPrint").addEventListener("click", () => { const { o, ok } = render(); if (!ok) return; saveHist(o); window.print(); });
  $("#btnCsv").addEventListener("click", csv);
  $("#hist").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    const x = hist()[+b.dataset.i]; fill(x); form.wht.dataset.auto = "0"; render(); window.scrollTo({ top: 0, behavior: "smooth" });
  });
  function flash(t) { const s = $("#status"); s.textContent = t; }


  // ---------- slip feed (encrypted; key from #k= fragment, kept in localStorage) ----------
  const KEY_LS = STORE + ".feedkey";
  let FEED = [];
  const b64d = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function loadFeed() {
    const m = /[#&]k=([\w-]+)/.exec(location.hash);
    if (m) { localStorage.setItem(KEY_LS, m[1]); history.replaceState(null, "", location.pathname + location.search); }
    const k = localStorage.getItem(KEY_LS);
    const info = $("#feedInfo");
    if (!k) { info.innerHTML = '<span class="lock">🔒 เปิดจากลิงก์ที่มีรหัส (ในห้อง Discord) ครั้งแรกครั้งเดียว</span>'; drawFeed(); return; }
    try {
      const r = await fetch("feed.enc.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) throw new Error("ไม่มีไฟล์รายการ");
      const enc = await r.json();
      const key = await crypto.subtle.importKey("raw", b64d(k), "AES-GCM", false, ["decrypt"]);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(enc.iv) }, key, b64d(enc.ct));
      const data = JSON.parse(new TextDecoder().decode(pt));
      FEED = data.items || [];
      info.textContent = "อัปเดตล่าสุด " + new Date(data.generated.replace(/([+-]\d\d)(\d\d)$/, "$1:$2")).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    } catch (e) {
      info.innerHTML = '<span class="lock">เปิดรายการไม่ได้ (รหัสไม่ถูกหรือหมดอายุ)</span>';
      FEED = [];
    }
    drawFeed();
  }
  function drawFeed() {
    const tb = $("#feedTbl tbody");
    if (!FEED.length) { tb.innerHTML = '<tr><td colspan="8" class="empty">ยังไม่มีรายการ</td></tr>'; $("#feedSum").innerHTML = ""; return; }
    tb.innerHTML = FEED.map((x, i) => `<tr data-i="${i}">
      <td>${x.paid ? beDate(x.pay_date) : '<span class="tag wait">รอโอน</span>'}</td>
      <td>${esc(x.payee_name)}<span class="sub">${esc(x.description)}</span></td>
      <td>${esc(x.project)}<span class="sub">${esc(x.booth)} · ${esc(x.category)}</span></td>
      <td>${esc(x.transfer_ref || "—")}<span class="sub">${esc(x.pv_no)}</span></td>
      <td class="r">${money(x.net_paid)}</td><td class="r">${money(x.wht)}</td>
      <td>${x.cert_no ? `<span class="tag ok">${esc(x.cert_no)}</span><span class="sub">${x.form === "PND3" ? "ภ.ง.ด.3" : "ภ.ง.ด.53"} ลำดับ ${esc(x.seq_no)}</span>` : (x.paid ? "—" : '<span class="sub">ออกเมื่อมีสลิป</span>')}</td>
      <td class="r">${x.cert_no ? `<button class="btn sm" type="button" data-open="${i}">เปิด 50 ทวิ</button>` : ""}</td></tr>`).join("");
    const paid = FEED.filter((x) => x.paid);
    const months = {};
    paid.forEach((x) => { const k = x.pay_date.slice(0, 7); months[k] = (months[k] || 0) + x.wht; });
    const mk = Object.keys(months).sort().reverse().slice(0, 2);
    $("#feedSum").innerHTML = `<div class="kpi">โอนแล้ว<b>${paid.length} สลิป</b></div>` +
      mk.map((k) => { const [y, m] = k.split("-").map(Number); return `<div class="kpi">ภาษีหัก ${TH_MONTH[m]} ${y + 543}<b>${money(months[k])}</b></div>`; }).join("") +
      `<div class="kpi">รอโอน<b>${FEED.length - paid.length} รายการ</b></div>`;
  }
  function openFromFeed(i) {
    const x = FEED[i]; if (!x) return;
    blank();
    fill({ run_no: x.cert_no, seq_no: x.seq_no, pay_date: x.pay_date, issue_date: x.pay_date,
      payee_name: x.payee_name, payee_tin: x.payee_tin, payee_addr: x.payee_addr,
      payee_type: x.form === "PND3" ? "person" : "corp", amount: x.amount.toFixed(2), rate: String(x.rate),
      wht: x.wht.toFixed(2), income_row: "r5", income_spec: "ค่าบริการ" });
    form.wht.dataset.auto = "0";
    document.querySelectorAll("#feedTbl tr.sel").forEach((r) => r.classList.remove("sel"));
    $(`#feedTbl tr[data-i="${i}"]`)?.classList.add("sel");
    render();
    $(".layout").scrollIntoView({ behavior: "smooth" });
  }
  $("#feedTbl").addEventListener("click", (e) => { const b = e.target.closest("button[data-open]"); if (b) openFromFeed(+b.dataset.open); });

  // ---------- boot: ?d=<base64url JSON> pre-fills (used by the PDF batch script) ----------
  function boot() {
    drawHist();
    const q = new URLSearchParams(location.search).get("d");
    const draft = sessionStorage.getItem(STORE + ".draft");
    if (q) {
      const json = decodeURIComponent(escape(atob(q.replace(/-/g, "+").replace(/_/g, "/"))));
      blank(); fill(JSON.parse(json)); form.wht.dataset.auto = "0";
    } else if (draft) { fill(JSON.parse(draft)); }
    else blank();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render); else render();
    loadFeed();
  }
  window.__tinValid = tinValid; window.__bahtText = bahtText;
  boot();
})();
