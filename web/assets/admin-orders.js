/* Admin views: dashboard, orders, abandoned carts, manual order */
(function () {
  "use strict";
  var A = window.A, t = A.t, esc = A.esc, fill = A.fill, money = A.money;
  var NEXT = { new: ["confirmed", "unreachable", "cancelled"], unreachable: ["confirmed", "unreachable", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["cancelled"], shipped: ["delivered", "returned"], delivered: [], returned: [], cancelled: ["new"] };
  var BTN = { confirmed: "pri", unreachable: "warn", cancelled: "red", preparing: "pri", shipped: "", delivered: "pri", returned: "red", new: "" };
  var SHIP_PERM = { preparing: 1, shipped: 1, delivered: 1, returned: 1 };
  function allowed(to) { return A.can(SHIP_PERM[to] ? "orders.ship" : "orders.confirm"); }
  function itemsTxt(items) { return (items || []).map(function (l) { return l.qty + " × " + l.name; }).join("، "); }

  /* ================= Dashboard ================= */
  A.views.dash = function (v) {
    var days = A.state.days || 7;
    v.innerHTML = A.top(t.tabs.dash, '<div class="seg" role="group">' + [1, 7, 30, 90].map(function (d) { return '<button type="button" data-d="' + d + '" aria-pressed="' + (d === days) + '">' + t.period[d] + '</button>'; }).join("") + '</div>') + '<div id="dash"><p class="muted">' + t.loading + '</p></div>';
    v.querySelectorAll("[data-d]").forEach(function (b) { b.onclick = function () { A.state.days = Number(b.getAttribute("data-d")); A.go("dash"); }; });
    A.live("stats:dashboard", { days: days }, function (s) { paint(v.querySelector("#dash"), s, days); });
  };
  function bars(rows, label, value, fmt) {
    if (!rows.length) return '<p class="muted" style="margin:0">' + t.none + '</p>';
    var max = Math.max.apply(null, rows.map(value)) || 1;
    return '<div class="bars">' + rows.map(function (r, i) { var val = value(r); return '<div class="bar"><span class="nm" title="' + esc(label(r)) + '">' + esc(label(r)) + '</span><span class="tr"><i style="width:' + Math.max(2, val / max * 100) + '%;animation-delay:' + i * 40 + 'ms"></i></span><b>' + (fmt ? fmt(r) : val) + '</b></div>'; }).join("") + '</div>';
  }
  function paint(el, s, days) {
    var k = s.kpi, a = s.alerts, al = [];
    if (a.stale) al.push(["red", fill(t.al.stale, { n: a.stale }), "orders:new"]);
    if (a.followUps) al.push(["", fill(t.al.followUps, { n: a.followUps }), "orders:unreachable"]);
    if (a.carrierErrors) al.push(["red", fill(t.al.carrierErrors, { n: a.carrierErrors }), "orders:confirmed"]);
    if (a.toShip) al.push(["", fill(t.al.toShip, { n: a.toShip }), "orders:confirmed"]);
    if (a.stuck) al.push(["", fill(t.al.stuck, { n: a.stuck }), "orders:shipped"]);
    if (a.abandoned) al.push(["", fill(t.al.abandoned, { n: a.abandoned }), "abandoned"]);
    a.outOfStock.forEach(function (p) { al.push(["red", fill(t.al.out, { p: A.tx(p.name) }), "stock"]); });
    a.lowStock.forEach(function (p) { al.push(["", fill(t.al.low, { p: A.tx(p.name), n: p.stock }), "stock"]); });
    var maxD = Math.max.apply(null, s.series.map(function (x) { return x.orders; })) || 1;
    var fmtDay = function (ms) { return new Date(ms).toLocaleDateString(A.lang === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR", { day: "2-digit", month: "short" }); };
    el.innerHTML =
      '<div class="kpis">' +
      '<div class="kpi"><span>' + t.k.orders + '</span><b>' + k.orders + '</b><small>' + k.pending + ' ' + t.k.pending + '</small></div>' +
      '<div class="kpi" style="animation-delay:60ms"><span>' + t.k.conf + '</span><b>' + A.pct(k.confirmed, k.processed) + '</b><small>' + k.confirmed + ' / ' + k.processed + '</small></div>' +
      '<div class="kpi" style="animation-delay:120ms"><span>' + t.k.deliv + '</span><b>' + A.pct(k.delivered, k.delivered + k.returned) + '</b><small>' + k.delivered + ' ' + t.st.delivered + ' · ' + k.returned + ' ' + t.st.returned + '</small></div>' +
      '<div class="kpi" style="animation-delay:180ms"><span>' + t.k.revenue + '</span><b>' + money(k.revenue) + '</b><small>' + t.k.aov + ': ' + money(k.aov) + '</small></div></div>' +
      '<div class="cards2">' +
      '<div class="box" style="grid-column:1/-1"><h2>' + t.alerts + '</h2><div class="alerts">' + (al.length ? al.map(function (x) { return '<div class="al ' + x[0] + '"><span>' + esc(x[1]) + '</span><button type="button" data-go="' + x[2] + '">' + t.view + '</button></div>'; }).join("") : '<div class="al ok">' + t.allGood + '</div>') + '</div></div>' +
      (s.series.length > 1 ? '<div class="box" style="grid-column:1/-1"><h2>' + t.perDay + '<small><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--teal);vertical-align:middle"></span> ' + t.confirmedLegend + ' &nbsp; <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#BFD3CA;vertical-align:middle"></span> ' + t.ordersLegend + '</small></h2>' +
        '<div class="spark" dir="ltr">' + s.series.map(function (x, i) { return '<div class="c" tabindex="0" aria-label="' + fmtDay(x.day) + ': ' + x.orders + '"><i style="height:' + (x.orders / maxD * 100) + '%;background:#BFD3CA;position:relative;animation-delay:' + i * 15 + 'ms"><i style="position:absolute;bottom:0;left:0;right:0;height:' + (x.orders ? x.confirmed / x.orders * 100 : 0) + '%;background:var(--teal);border-radius:4px 4px 0 0"></i></i><span class="tip">' + fmtDay(x.day) + ' · ' + x.orders + ' / ' + x.confirmed + '</span></div>'; }).join("") + '</div>' +
        '<div class="axis" dir="ltr"><span>' + fmtDay(s.series[0].day) + '</span><span>' + fmtDay(s.series[s.series.length - 1].day) + '</span></div></div>' : "") +
      '<div class="box"><h2>' + t.topProducts + '</h2>' + bars(s.products, function (r) { return r.name; }, function (r) { return r.qty; }) + '</div>' +
      '<div class="box"><h2>' + t.topWilayas + '<small>' + t.k.orders + ' · ' + t.k.deliv + '</small></h2>' + bars(s.wilayas, function (r) { return A.lang === "ar" ? r.nameAr : r.name; }, function (r) { return r.orders; }, function (r) { return r.orders + " · " + A.pct(r.delivered, r.delivered + r.returned); }) + '</div>' +
      '<div class="box"><h2>' + t.campaigns + '<small>' + t.k.orders + ' · ' + t.k.conf + ' · ' + t.st.delivered + '</small></h2>' + bars(s.campaigns, function (r) { return r.name || t.noCampaign; }, function (r) { return r.orders; }, function (r) { return r.orders + " · " + A.pct(r.confirmed, r.orders) + " · " + r.delivered; }) + '</div>' +
      '<div class="box"><h2>' + t.carriers + '<small>' + t.k.deliv + '</small></h2>' + bars(s.carriers, function (r) { return r.code; }, function (r) { return r.delivered + r.returned ? r.delivered / (r.delivered + r.returned) * 100 : 0; }, function (r) { return A.pct(r.delivered, r.delivered + r.returned) + " (" + r.delivered + "/" + (r.delivered + r.returned) + ") · " + r.inTransit + " ⇢"; }) + '</div></div>';
    el.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { var g = b.getAttribute("data-go").split(":"); A.go(g[0], g[1] ? { status: g[1] } : null); }; });
  }

  /* ================= Orders ================= */
  var sel = {};
  A.views.orders = function (v) {
    var st = (A.state.extra && A.state.extra.status) || A.state.status || "", q = A.state.q || "";
    A.state.status = st; sel = {};
    loadCarriers().catch(function () {});
    var c = A.counts || {};
    var statuses = ["new", "unreachable", "confirmed", "preparing", "shipped", "delivered", "returned", "cancelled"];
    v.innerHTML = A.top(t.tabs.orders, (A.can("orders.confirm") ? '<button class="abtn pri" type="button" data-new>' + A.ic("plus", 18) + t.newOrder + '</button>' : "") + '<button class="abtn" type="button" data-csv>' + A.ic("download", 18) + t.export + '</button>') +
      '<div class="filters"><input type="search" placeholder="' + t.search + '" aria-label="' + t.search + '" value="' + esc(q) + '">' +
      '<button type="button" class="fchip" data-s="" aria-pressed="' + (!st) + '">' + t.all + '</button>' +
      statuses.map(function (s) { return '<button type="button" class="fchip" data-s="' + s + '" aria-pressed="' + (st === s) + '">' + t.st[s] + ' <em>' + (c[s] || 0) + '</em></button>'; }).join("") + '</div>' +
      '<div id="bulk" class="acts" style="margin-bottom:10px" hidden></div><div id="olist"><p class="muted">' + t.loading + '</p></div>';
    var rows = [];
    var sub = null;
    function subscribe() {
      if (sub) try { sub(); } catch (e) {}
      sub = A.live("orders:list", { status: A.state.status || undefined, search: A.state.q || undefined, limit: 400 }, function (r) { rows = r; list(); });
    }
    var inp = v.querySelector("input[type=search]"), deb;
    inp.oninput = function () { clearTimeout(deb); deb = setTimeout(function () { A.state.q = inp.value.trim(); subscribe(); }, 350); };
    v.querySelectorAll("[data-s]").forEach(function (b) { b.onclick = function () { A.state.status = b.getAttribute("data-s"); A.state.extra = null; v.querySelectorAll("[data-s]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); sel = {}; subscribe(); }; });
    v.querySelector("[data-csv]").onclick = function () { csv(rows); };
    if (v.querySelector("[data-new]")) v.querySelector("[data-new]").onclick = function () { A.manualOrder(); };
    function bulkBar() {
      var ids = Object.keys(sel), el = v.querySelector("#bulk");
      el.hidden = !ids.length; if (!ids.length) return;
      el.innerHTML = '<b style="align-self:center">' + fill(t.selected, { n: ids.length }) + '</b>' +
        (A.can("orders.ship") ? '<button class="abtn" type="button" data-bp>' + t.bulkPrep + '</button>' + carrierPicker("bulkc") + '<button class="abtn pri" type="button" data-bs>' + A.ic("send", 18) + t.bulkShip + '</button>' : "");
      var bp = el.querySelector("[data-bp]"), bs = el.querySelector("[data-bs]");
      if (bp) bp.onclick = function () { A.run("m", "orders:bulkStatus", { ids: ids, to: "preparing" }).then(function () { sel = {}; bulkBar(); }); };
      if (bs) bs.onclick = function () {
        var carrier = el.querySelector("#bulkc").value; if (!carrier) return A.flash(t.noCarrier, true);
        bs.disabled = true; bs.textContent = t.loading;
        A.a("dispatch:dispatchMany", { ids: ids, carrier: carrier }).then(function (res) {
          var ok = res.filter(function (r) { return r.ok; }).length; A.flash(fill(t.bulkDone, { ok: ok, bad: res.length - ok }), res.length - ok > 0);
          sel = {}; bulkBar();
        }, function (e) { A.flash(A.errMsg(e), true); bulkBar(); });
      };
    }
    function list() {
      var el = v.querySelector("#olist");
      if (!rows.length) { el.innerHTML = '<div class="emptyst">' + t.none + '</div>'; return; }
      el.innerHTML = '<div class="tscroll"><table class="tbl"><thead><tr><th style="width:36px"><span class="sr">✓</span></th><th>' + t.cols.order + '</th><th>' + t.cols.date + '</th><th>' + t.cols.customer + '</th><th>' + t.cols.wilaya + '</th><th>' + t.cols.items + '</th><th>' + t.cols.total + '</th><th>' + t.cols.status + '</th></tr></thead><tbody>' +
        rows.map(function (o) {
          return '<tr data-id="' + o.id + '" tabindex="0"><td><input type="checkbox" aria-label="' + esc(o.number) + '" data-sel="' + o.id + '"' + (sel[o.id] ? " checked" : "") + ' style="width:18px;height:18px"></td>' +
            '<td class="num"><bdi>' + esc(o.number) + '</bdi>' + (o.campaign ? '<br><small class="muted">' + esc(o.campaign) + '</small>' : "") + '</td>' +
            '<td class="num">' + A.dt(o.createdAt) + '<br><small class="muted">' + A.ago(o.createdAt) + '</small></td>' +
            '<td><b style="font-weight:500"><bdi>' + esc(o.name) + '</bdi></b><br><small class="muted" dir="ltr">' + esc(o.phone) + '</small></td>' +
            '<td>' + esc(A.lang === "ar" ? o.wilayaAr : o.wilaya) + '<br><small class="muted">' + esc(o.commune) + ' · ' + (o.mode === "desk" ? t.cols.desk : t.cols.home) + '</small></td>' +
            '<td style="max-width:240px">' + esc(itemsTxt(o.items)) + '</td><td class="num"><b>' + money(o.total) + '</b></td>' +
            '<td>' + A.st(o.status) + (o.attempts ? ' <small class="muted">×' + o.attempts + '</small>' : "") + (o.tracking ? '<br><small class="muted" dir="ltr">' + esc(o.carrier) + ' ' + esc(o.tracking) + '</small>' : "") + (o.carrierError ? '<br><small style="color:var(--err)">⚠ ' + esc(t.carrierError) + '</small>' : "") + (o.carrierStatus ? '<br><small class="muted">' + esc(o.carrierStatus) + '</small>' : "") + '</td></tr>';
        }).join("") + '</tbody></table></div>';
      el.querySelectorAll("tr[data-id]").forEach(function (tr) {
        var open = function () { A.openOrder(tr.getAttribute("data-id")); };
        tr.onclick = function (e) { if (e.target.closest("input")) return; open(); };
        tr.onkeydown = function (e) { if (e.key === "Enter") open(); };
      });
      el.querySelectorAll("[data-sel]").forEach(function (cb) { cb.onchange = function () { var id = cb.getAttribute("data-sel"); if (cb.checked) sel[id] = 1; else delete sel[id]; bulkBar(); }; });
    }
    subscribe();
  };

  function csv(rows) {
    var cols = [["number", "N°"], ["createdAt", "Date"], ["status", "Statut"], ["name", "Nom"], ["phone", "Téléphone"], ["wilayaCode", "Code wilaya"], ["wilaya", "Wilaya"], ["commune", "Commune"], ["address", "Adresse"], ["mode", "Livraison"], ["items", "Produits"], ["subtotal", "Sous-total"], ["shipping", "Livraison DA"], ["total", "Total"], ["carrier", "Transporteur"], ["tracking", "Suivi"], ["campaign", "Campagne"]];
    var lines = [cols.map(function (c) { return c[1]; }).join(",")].concat(rows.map(function (o) {
      return cols.map(function (c) { var v = c[0] === "items" ? itemsTxt(o.items) : c[0] === "createdAt" ? new Date(o.createdAt).toISOString() : o[c[0]]; return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(",");
    }));
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = "commandes-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
  }

  var CARRIERS = null;
  function loadCarriers() { if (CARRIERS) return Promise.resolve(CARRIERS); return A.q("dispatch:carrierList", {}).then(function (c) { CARRIERS = c; return c; }); }
  function carrierPicker(id, selected) {
    var list = (CARRIERS && CARRIERS.carriers || []).filter(function (c) { return c.configured; });
    var def = selected || (CARRIERS && CARRIERS.defaultCarrier) || (list[0] && list[0].code) || "";
    return '<select id="' + id + '" aria-label="' + t.carrier + '" style="height:44px;border:1px solid var(--line2);border-radius:12px;padding:0 10px;background:#fff">' + (list.length ? list.map(function (c) { return '<option value="' + c.code + '"' + (c.code === def ? " selected" : "") + '>' + esc(c.label) + '</option>'; }).join("") : '<option value="">—</option>') + '</select>';
  }

  /* ---------- order drawer ---------- */
  A.openOrder = function (id) {
    var dr = A.drawer('<div class="dh"><h2>' + t.loading + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div>');
    var editing = false;
    loadCarriers().catch(function () {}).then(function () {
      A.drawerLive(A.client.onUpdate("orders:get", { token: A.token, id: id }, function (o) { if (!o) return A.closeDrawer(); if (!editing) paintOrder(dr, o, function (v) { editing = v; }); }));
    });
  };

  function paintOrder(dr, o, setEditing) {
    var waMsg = fill(t.waConfirm, { name: o.name, store: A.storeName, id: o.number, items: itemsTxt(o.items), total: money(o.total), wilaya: A.lang === "ar" ? o.wilayaAr : o.wilaya });
    var c = o.customer, canEdit = !o.tracking && ["new", "unreachable", "confirmed", "preparing"].indexOf(o.status) >= 0 && A.can("orders.confirm");
    var next = (NEXT[o.status] || []).filter(allowed);
    var canShip = A.can("orders.ship") && !o.tracking && (o.status === "confirmed" || o.status === "preparing");
    var html = '<div class="dh"><div><h2><bdi>' + esc(o.number) + '</bdi></h2><small class="muted">' + A.dt(o.createdAt) + ' · ' + A.ago(o.createdAt) + '</small></div><div style="display:flex;gap:10px;align-items:center">' + A.st(o.status) + '<button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div></div><div class="db">' +
      '<div class="acts"><a class="abtn" href="tel:' + esc(o.phone) + '">' + A.ic("phone", 18) + t.call + ' <bdi dir="ltr">' + esc(o.phone) + '</bdi></a><a class="abtn wa" target="_blank" rel="noopener" href="https://wa.me/' + A.waNum(o.phone) + '?text=' + encodeURIComponent(waMsg) + '">' + A.ic("chat", 18) + t.wa + '</a></div>' +
      (next.length ? '<div><p class="sec-t">' + t.cols.status + '</p><div class="acts">' + next.map(function (s) { return '<button type="button" class="abtn ' + BTN[s] + '" data-to="' + s + '">' + t.to[s] + (s === "unreachable" && o.status === "unreachable" ? " (+1)" : "") + '</button>'; }).join("") + '</div></div>' : "") +
      (o.status === "unreachable" || o.attempts ? '<div><p class="sec-t">' + t.attempts + ': <b>' + o.attempts + '</b></p><div class="mini-f"><label class="sr" for="fu">' + t.followUp + '</label><input id="fu" type="datetime-local" value="' + (o.followUpAt ? new Date(o.followUpAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "") + '"><button type="button" class="abtn" data-fu>' + t.save + '</button></div></div>' : "") +
      // shipping block
      (o.tracking ? '<div class="box" style="padding:14px 16px"><p class="sec-t">' + t.ship + '</p><div class="kv"><span>' + t.carrier + '</span><b>' + esc(o.carrier) + '</b><span>' + t.tracking + '</span><b dir="ltr" style="text-align:start">' + esc(o.tracking) + '</b>' + (o.carrierStatus ? '<span>' + t.carrierStatus + '</span><b>' + esc(o.carrierStatus) + '</b>' : "") + '</div><div class="acts" style="margin-top:10px"><button type="button" class="abtn" data-label>' + A.ic("file", 18) + t.label + '</button>' + (A.can("orders.ship") && o.status === "shipped" ? '<button type="button" class="abtn red" data-cship>' + t.cancelShip + '</button>' : "") + (A.can("orders.ship") && o.carrierError && (o.carrier === "noest" || o.carrier === "ecotrack") ? '<button type="button" class="abtn warn" data-reval>' + t.revalidate + '</button>' : "") + '</div>' + (o.carrierError ? '<div class="alert" style="margin-top:10px">' + esc(o.carrierError) + '</div>' : "") + '</div>'
        : canShip ? '<div class="box" style="padding:14px 16px"><p class="sec-t">' + t.ship + '</p>' + (o.carrierError ? '<div class="alert" style="margin-bottom:10px">' + esc(o.carrierError) + '</div>' : "") +
          ((CARRIERS && CARRIERS.carriers.some(function (x) { return x.configured; })) ? '<div class="mini-f">' + carrierPicker("car") + '<select id="desk" aria-label="' + t.stopDesk + '"' + (o.mode === "desk" ? "" : " hidden") + '><option value="">' + t.stopDesk + '…</option></select><button type="button" class="abtn pri" data-ship>' + A.ic("send", 18) + t.sendTo + '</button></div>' : '<p class="muted" style="margin:0;font-size:14px">' + t.noCarrier + '</p>') + '</div>'
        : (A.can("orders.ship") && o.status === "new" ? "" : "")) +
      '<div class="kv"><span>' + t.cols.customer + '</span><b><bdi>' + esc(o.name) + '</bdi> ' + (c ? c.tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join("") + (c.blocked ? '<span class="tag risk">' + t.blocked + '</span>' : "") : "") + '</b>' +
      (c ? '<span>' + t.cols.orders + '</span><b>' + c.orders + ' · ' + c.delivered + ' ' + t.st.delivered + ' · ' + c.returned + ' ' + t.st.returned + ' · ' + c.cancelled + ' ' + t.st.cancelled + '</b>' : "") +
      (o.phone2 ? '<span>' + t.phone2 + '</span><b dir="ltr" style="text-align:start">' + esc(o.phone2) + '</b>' : "") +
      '<span>' + t.cols.wilaya + '</span><b>' + esc(A.lang === "ar" ? o.wilayaAr : o.wilaya) + ' / ' + esc(o.commune) + '</b>' +
      '<span>' + t.mode + '</span><b>' + (o.mode === "desk" ? t.desk + (o.stopDeskCode ? " · " + esc(o.stopDeskCode) : "") : t.home) + (o.address ? " · " + esc(o.address) : "") + '</b>' +
      '<span>' + t.cols.items + '</span><b>' + esc(itemsTxt(o.items)) + '</b>' +
      '<span>' + t.cols.total + '</span><b>' + money(o.subtotal) + ' + ' + money(o.shipping) + ' = ' + money(o.total) + '</b>' +
      (o.campaign || o.source ? '<span>UTM</span><b>' + esc([o.source, o.campaign].filter(Boolean).join(" / ")) + '</b>' : "") + '</div>' +
      (canEdit ? '<details id="ed"><summary style="cursor:pointer;font-weight:600;min-height:40px;display:flex;align-items:center">' + t.editOrder + '</summary><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' +
        '<div class="mini-f"><input id="e-name" aria-label="' + t.name + '" value="' + esc(o.name) + '"><input id="e-phone" dir="ltr" aria-label="' + t.cols.phone + '" value="' + esc(o.phone) + '"></div>' +
        '<div class="mini-f"><select id="e-w" aria-label="' + t.cols.wilaya + '">' + A.wilayaOptions(o.wilayaCode) + '</select><select id="e-c" aria-label="' + t.commune + '">' + A.communeOptions(o.wilayaCode, o.commune) + '</select></div>' +
        '<div class="mini-f"><select id="e-mode" aria-label="' + t.mode + '"><option value="home"' + (o.mode === "home" ? " selected" : "") + '>' + t.home + '</option><option value="desk"' + (o.mode === "desk" ? " selected" : "") + '>' + t.desk + '</option></select><input id="e-addr" aria-label="' + t.address + '" placeholder="' + t.address + '" value="' + esc(o.address) + '"></div>' +
        (o.stockConsumed ? '<p class="muted" style="font-size:13px;margin:0">' + t.qtyLocked + '</p>' : o.items.map(function (l, i) { return '<div class="mini-f"><span style="flex:2;align-self:center;font-size:14px">' + esc(l.name) + ' · ' + money(l.price) + '</span><label class="sr" for="q' + i + '">qty</label><input id="q' + i + '" type="number" min="0" max="10" value="' + l.qty + '" data-qi="' + i + '" style="max-width:90px"></div>'; }).join("")) +
        '<div class="mini-f"><label style="align-self:center;font-size:14px;flex:1" for="e-ship">' + t.shipping + '</label><input id="e-ship" type="number" value="' + o.shipping + '" style="max-width:130px"><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="e-rc"> ' + t.recompute + '</label></div>' +
        '<button type="button" class="abtn pri" data-edit>' + t.save + '</button></div></details>' : (o.tracking ? '<p class="muted" style="font-size:13px;margin:0">' + t.locked + '</p>' : "")) +
      '<div><p class="sec-t">' + t.notes + '</p>' + o.notes.map(function (n) { return '<div style="background:#FBF5F1;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:6px">' + esc(n.text) + '<br><small class="muted">' + esc(n.by || "") + ' · ' + A.dt(n.at) + '</small></div>'; }).join("") +
      '<div class="mini-f"><label class="sr" for="note">' + t.notes + '</label><input id="note" placeholder="' + t.addNote + '"><button type="button" class="abtn" data-note>' + t.add + '</button></div></div>' +
      (o.others.length ? '<div><p class="sec-t">' + t.cols.orders + '</p>' + o.others.map(function (x) { return '<button type="button" class="abtn" data-oid="' + x.id + '" style="width:100%;justify-content:space-between;margin-bottom:6px"><bdi>' + esc(x.number) + '</bdi><span>' + money(x.total) + '</span>' + A.st(x.status) + '</button>'; }).join("") + '</div>' : "") +
      '<div><p class="sec-t">' + t.history + '</p><ul class="hist">' + o.history.slice().reverse().map(function (h) { return '<li>' + (h.status ? (h.from ? esc(t.st[h.from]) + " → " : "") + '<b>' + esc(t.st[h.status]) + '</b>' : "") + (h.note ? ' <span class="muted">' + esc(h.note) + '</span>' : "") + '<time>' + esc(h.by || "") + ' · ' + A.dt(h.at) + '</time></li>'; }).join("") + '</ul></div></div>';
    dr.innerHTML = html;
    dr.querySelector(".x").onclick = A.closeDrawer;
    var $ = function (s) { return dr.querySelector(s); };
    function busy() { dr.querySelectorAll("button").forEach(function (b) { b.disabled = true; }); }
    dr.querySelectorAll("[data-to]").forEach(function (b) {
      b.onclick = function () {
        var to = b.getAttribute("data-to");
        var go = function () { busy(); A.run("m", "orders:setStatus", { id: o.id, to: to }).catch(function () {}); };
        if (to === "cancelled" || to === "returned") A.ask().then(function (y) { if (y) go(); }); else go();
      };
    });
    if ($("[data-fu]")) $("[data-fu]").onclick = function () { var v = $("#fu").value; A.run("m", "orders:setFollowUp", { id: o.id, at: v ? new Date(v).getTime() : null }); };
    $("[data-note]").onclick = function () { var v = $("#note").value.trim(); if (v) A.run("m", "orders:addNote", { id: o.id, text: v }, false); };
    $("#note").onkeydown = function (e) { if (e.key === "Enter") $("[data-note]").click(); };
    dr.querySelectorAll("[data-oid]").forEach(function (b) { b.onclick = function () { A.openOrder(b.getAttribute("data-oid")); }; });
    var ed = $("#ed");
    if (ed) {
      ed.ontoggle = function () { setEditing(ed.open); };
      $("#e-w").onchange = function () { $("#e-c").innerHTML = A.communeOptions($("#e-w").value, ""); $("#e-rc").checked = true; };
      $("#e-mode").onchange = function () { $("#e-rc").checked = true; };
      $("[data-edit]").onclick = function () {
        var f = { name: $("#e-name").value, phone: $("#e-phone").value, wilayaCode: Number($("#e-w").value), commune: $("#e-c").value, mode: $("#e-mode").value, address: $("#e-addr").value };
        if (!o.stockConsumed) f.items = o.items.map(function (l, i) { return { productId: l.productId, name: l.name, price: l.price, qty: Number($('[data-qi="' + i + '"]').value) || 0 }; });
        if ($("#e-rc").checked) f.recomputeShipping = true; else f.shipping = Number($("#e-ship").value) || 0;
        A.run("m", "orders:edit", { id: o.id, fields: f }).then(function () { setEditing(false); }).catch(function () {});
      };
    }
    // dispatch
    var carSel = $("#car"), deskSel = $("#desk");
    function loadDesks() {
      if (!carSel || !deskSel || o.mode !== "desk" || !carSel.value) return;
      A.client.query("shipping:stopDesks", { carrier: carSel.value, wilayaCode: o.wilayaCode }).then(function (d) {
        deskSel.innerHTML = '<option value="">' + t.stopDesk + '…</option>' + d.map(function (x) { return '<option value="' + esc(x.code) + '"' + (x.code === o.stopDeskCode ? " selected" : "") + '>' + esc(x.name + (x.commune ? " — " + x.commune : "")) + '</option>'; }).join("");
      });
    }
    if (carSel) { carSel.onchange = loadDesks; loadDesks(); }
    if ($("[data-ship]")) $("[data-ship]").onclick = function () {
      var b = $("[data-ship]"); b.disabled = true; b.textContent = t.loading;
      A.a("dispatch:dispatch", { id: o.id, carrier: carSel.value, stationCode: deskSel && deskSel.value ? deskSel.value : undefined }).then(function (r) {
        if (r.ok) A.flash(r.number + " → " + r.tracking); else A.flash(r.error, true);
      }, function (e) { A.flash(A.errMsg(e), true); });
    };
    if ($("[data-label]")) $("[data-label]").onclick = function () {
      var w = window.open("", "_blank");
      A.a("dispatch:label", { id: o.id }).then(function (r) {
        var url = r.url || (A.site + "/api/label?k=" + encodeURIComponent(r.key));
        if (w) w.location = url; else location.href = url;
      }, function (e) { if (w) w.close(); A.flash(A.errMsg(e), true); });
    };
    if ($("[data-reval]")) $("[data-reval]").onclick = function () { A.run("a", "dispatch:revalidate", { id: o.id }).catch(function () {}); };
    if ($("[data-cship]")) $("[data-cship]").onclick = function () { A.ask().then(function (y) { if (y) A.run("a", "dispatch:cancelShipment", { id: o.id }).catch(function () {}); }); };
  }

  /* ================= Abandoned ================= */
  A.views.abandoned = function (v) {
    var f = A.state.abF || "open";
    v.innerHTML = A.top(t.tabs.abandoned) + '<div class="filters">' + ["open", "contacted", "converted", "ignored"].map(function (s) { return '<button class="fchip" type="button" data-f="' + s + '" aria-pressed="' + (f === s) + '">' + t.ast[s] + '</button>'; }).join("") + '</div><div id="alist"></div>';
    v.querySelectorAll("[data-f]").forEach(function (b) { b.onclick = function () { A.state.abF = b.getAttribute("data-f"); A.go("abandoned"); }; });
    A.live("abandoned:list", { status: f }, function (rows) {
      var el = v.querySelector("#alist");
      if (!rows.length) { el.innerHTML = '<div class="emptyst">' + t.none + '</div>'; return; }
      el.innerHTML = '<div class="tscroll"><table class="tbl"><thead><tr><th>' + t.cols.when + '</th><th>' + t.cols.customer + '</th><th>' + t.cols.wilaya + '</th><th>' + t.cols.items + '</th><th>' + t.cols.total + '</th><th>' + t.cols.action + '</th></tr></thead><tbody>' +
        rows.map(function (a) {
          var msg = fill(t.waAband, { name: a.name || "", store: A.storeName, items: itemsTxt(a.items) });
          return '<tr style="cursor:default"><td class="num">' + A.ago(a.at) + '</td><td><bdi>' + esc(a.name || "—") + '</bdi><br><small class="muted" dir="ltr">' + esc(a.phone) + '</small></td><td>' + esc(A.lang === "ar" ? a.wilayaAr || "" : a.wilaya || "") + (a.commune ? '<br><small class="muted">' + esc(a.commune) + '</small>' : "") + '</td><td>' + esc(itemsTxt(a.items)) + '</td><td class="num">' + money(a.total) + '</td>' +
            '<td><div class="acts"><a class="abtn" href="tel:' + esc(a.phone) + '" aria-label="' + t.call + '">' + A.ic("phone", 18) + '</a><a class="abtn wa" target="_blank" rel="noopener" href="https://wa.me/' + A.waNum(a.phone) + '?text=' + encodeURIComponent(msg) + '" aria-label="WhatsApp">' + A.ic("chat", 18) + '</a>' +
            (a.status !== "converted" && A.can("orders.confirm") ? '<button type="button" class="abtn pri" data-mk="' + a.id + '">' + t.makeOrder + '</button>' + (a.status === "open" ? '<button type="button" class="abtn" data-ab="' + a.id + '" data-to="contacted">' + t.contacted + '</button><button type="button" class="abtn" data-ab="' + a.id + '" data-to="ignored">' + t.ignore + '</button>' : "") : "") + '</div></td></tr>';
        }).join("") + '</tbody></table></div>';
      el.querySelectorAll("[data-ab]").forEach(function (b) { b.onclick = function () { A.run("m", "abandoned:setStatus", { id: b.getAttribute("data-ab"), status: b.getAttribute("data-to") }); }; });
      el.querySelectorAll("[data-mk]").forEach(function (b) { b.onclick = function () { var a = rows.filter(function (x) { return x.id === b.getAttribute("data-mk"); })[0]; A.manualOrder(a); }; });
    });
  };

  /* ================= Manual order (phone / from abandoned) ================= */
  A.manualOrder = function (ab) {
    A.q("catalog:adminProducts", {}).then(function (cat) {
      var prods = cat.products.filter(function (p) { return p.active; });
      var lines = ab && ab.items.length ? ab.items.map(function (i) { return { productId: i.productId, qty: i.qty }; }) : [{ productId: prods[0] && prods[0].id, qty: 1 }];
      var dr = A.drawer('<div class="dh"><h2>' + t.newOrder + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db"><form class="fields" id="mo" novalidate></form></div>');
      var f = dr.querySelector("#mo");
      function paint() {
        f.innerHTML =
          '<div class="f"><label for="m-name">' + t.name + '</label><input id="m-name" value="' + esc(ab ? ab.name : "") + '"></div>' +
          '<div class="f"><label for="m-phone">' + t.cols.phone + '</label><input id="m-phone" dir="ltr" value="' + esc(ab ? ab.phone : "") + '"></div>' +
          '<div class="two"><div class="f"><label for="m-w">' + t.cols.wilaya + '</label><select id="m-w">' + A.wilayaOptions(ab && ab.wilayaCode || 16) + '</select></div><div class="f"><label for="m-c">' + t.commune + '</label><select id="m-c">' + A.communeOptions(ab && ab.wilayaCode || 16, ab && ab.commune || "") + '</select></div></div>' +
          '<div class="two"><div class="f"><label for="m-mode">' + t.mode + '</label><select id="m-mode"><option value="home">' + t.home + '</option><option value="desk">' + t.desk + '</option></select></div><div class="f"><label for="m-addr">' + t.address + '</label><input id="m-addr"></div></div>' +
          '<div class="f"><span style="font-size:15px;font-weight:500">' + t.cols.items + '</span>' + lines.map(function (l, i) { return '<div class="mini-f"><select data-lp="' + i + '" aria-label="' + t.cols.product + '">' + prods.map(function (p) { return '<option value="' + p.id + '"' + (p.id === l.productId ? " selected" : "") + '>' + esc(A.tx(p.name)) + ' — ' + money(p.price) + '</option>'; }).join("") + '</select><input type="number" min="1" max="10" value="' + l.qty + '" data-lq="' + i + '" aria-label="qty" style="max-width:80px"><button type="button" class="abtn" data-rm="' + i + '" aria-label="' + t.del + '">×</button></div>'; }).join("") +
          '<button type="button" class="abtn" data-addl>' + A.ic("plus", 18) + t.addLine + '</button></div>' +
          '<button type="submit" class="btn lg">' + t.create + '</button>';
        f.querySelector("#m-w").onchange = function () { f.querySelector("#m-c").innerHTML = A.communeOptions(f.querySelector("#m-w").value, ""); };
        f.querySelectorAll("[data-lp]").forEach(function (s) { s.onchange = function () { lines[s.getAttribute("data-lp")].productId = s.value; }; });
        f.querySelectorAll("[data-lq]").forEach(function (s) { s.oninput = function () { lines[s.getAttribute("data-lq")].qty = Number(s.value) || 1; }; });
        f.querySelectorAll("[data-rm]").forEach(function (b) { b.onclick = function () { lines.splice(Number(b.getAttribute("data-rm")), 1); if (!lines.length) lines.push({ productId: prods[0].id, qty: 1 }); keep(); paint(); }; });
        f.querySelector("[data-addl]").onclick = function () { keep(); lines.push({ productId: prods[0].id, qty: 1 }); paint(); };
      }
      var kept = {};
      function keep() { ["m-name", "m-phone", "m-addr"].forEach(function (k) { var el = f.querySelector("#" + k); if (el) kept[k] = el.value; }); }
      paint();
      f.onsubmit = function (e) {
        e.preventDefault();
        var input = { name: f.querySelector("#m-name").value, phone: f.querySelector("#m-phone").value, wilayaCode: Number(f.querySelector("#m-w").value), commune: f.querySelector("#m-c").value, mode: f.querySelector("#m-mode").value, address: f.querySelector("#m-addr").value, items: lines.map(function (l) { return { productId: l.productId, qty: l.qty }; }), lang: A.lang };
        A.m("orders:createManual", { input: input, fromAbandoned: ab ? ab.id : undefined }).then(function (r) {
          if (!r.ok) return A.flash(r.error + (r.product ? ": " + r.product : ""), true);
          A.flash(r.number); A.openOrder(r.id);
        }, function (e2) { A.flash(A.errMsg(e2), true); });
      };
    });
  };
})();
