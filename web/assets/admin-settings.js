/* Admin views: delivery (carriers + rates), team, settings */
(function () {
  "use strict";
  var A = window.A, t = A.t, esc = A.esc, money = A.money;

  /* ================= Delivery ================= */
  A.views.delivery = function (v) {
    var sub = A.state.dtab || "carriers", canSet = A.can("settings");
    v.innerHTML = A.top(t.tabs.delivery, '<div class="seg" role="group"><button type="button" data-dt="carriers" aria-pressed="' + (sub === "carriers") + '">' + t.dl.carriers + '</button><button type="button" data-dt="rates" aria-pressed="' + (sub === "rates") + '">' + t.dl.rates + '</button></div>') + '<div id="dbody"></div>';
    v.querySelectorAll("[data-dt]").forEach(function (b) { b.onclick = function () { A.state.dtab = b.getAttribute("data-dt"); A.go("delivery"); }; });
    var body = v.querySelector("#dbody");
    if (sub === "carriers") {
      A.live("dispatch:carrierList", {}, function (d) {
        body.innerHTML = '<p class="muted" style="margin:0 0 12px">' + t.dl.envHelp + '</p><div class="cards2">' + d.carriers.map(function (c) {
          return '<div class="box"><h2>' + esc(c.label) + (c.configured ? '<span class="st delivered">' + t.dl.connected + '</span>' : '<span class="st cancelled">' + t.dl.missing + '</span>') + '</h2>' +
            '<p class="muted" style="margin:0 0 12px;font-size:14px">' + A.fill(t.dl.desks, { n: c.stopDesks }) + (d.defaultCarrier === c.code ? ' · <b style="color:var(--teal)">' + t.dl.default + '</b>' : "") + '</p>' +
            (c.configured && canSet ? '<div class="acts"><button class="abtn" type="button" data-test="' + c.code + '">' + t.dl.test + '</button><button class="abtn" type="button" data-sync="' + c.code + '">' + A.ic("refresh", 18) + t.dl.sync + '</button>' + (d.defaultCarrier !== c.code ? '<button class="abtn pri" type="button" data-def="' + c.code + '">' + t.dl.default + '</button>' : "") + '</div>' : "") + '</div>';
        }).join("") +
          '<div class="box"><h2>' + t.dl.meta + (d.meta.configured ? '<span class="st delivered">' + t.dl.metaOn + (d.meta.testMode ? " · " + t.dl.metaTest : "") + '</span>' : '<span class="st cancelled">' + t.dl.metaOff + '</span>') + '</h2><p class="muted" style="margin:0;font-size:14px">Lead → Purchase (confirmed) → OrderDelivered</p></div></div>' +
          (A.can("orders.ship") ? '<div class="acts" style="margin-top:14px"><button class="abtn pri" type="button" data-syncs>' + A.ic("refresh", 18) + t.dl.syncStatus + '</button></div>' : "") +
          '<div class="box" style="margin-top:14px"><h2>' + t.dl.logs + '</h2>' + (d.logs.length ? '<ul class="hist">' + d.logs.map(function (l) { return '<li><b>' + esc(l.carrier) + '</b> · ' + esc(l.kind) + ' · <span style="color:' + (l.ok ? "var(--teal)" : "var(--err)") + '">' + esc(l.message) + '</span><time>' + A.dt(l.at) + '</time></li>'; }).join("") + '</ul>' : '<p class="muted" style="margin:0">' + t.none + '</p>') + '</div>';
        body.querySelectorAll("[data-test]").forEach(function (b) { b.onclick = function () { b.disabled = true; A.a("dispatch:testCarrier", { carrier: b.getAttribute("data-test") }).then(function (r) { A.flash(r.message, !r.ok); b.disabled = false; }, function (e) { A.flash(A.errMsg(e), true); b.disabled = false; }); }; });
        body.querySelectorAll("[data-sync]").forEach(function (b) { b.onclick = function () { b.disabled = true; b.textContent = t.loading; A.a("dispatch:syncCarrierData", { carrier: b.getAttribute("data-sync") }).then(function (r) { A.flash(A.fill(t.dl.desks, { n: r.desks }) + (r.communes ? " · " + r.communes : "")); }, function (e) { A.flash(A.errMsg(e), true); }); }; });
        body.querySelectorAll("[data-def]").forEach(function (b) { b.onclick = function () { A.run("m", "settings:update", { patch: { defaultCarrier: b.getAttribute("data-def") } }); }; });
        var ss = body.querySelector("[data-syncs]"); if (ss) ss.onclick = function () { ss.disabled = true; A.run("a", "dispatch:syncNow", {}).then(function () { ss.disabled = false; }, function () { ss.disabled = false; }); };
      });
    } else {
      A.live("shipping:rates", {}, function (d) { paintRates(body, d, canSet); });
    }
  };

  function num(v) { return v === "" || v == null ? null : Number(v); }
  function paintRates(body, d, canSet) {
    var z = d.zoneFees;
    body.innerHTML =
      '<div class="box"><h2>' + t.dl.zoneDefaults + '</h2><div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + ["A", "N", "S"].map(function (k) {
        return '<div><p class="sec-t">' + t.dl.zones[k] + '</p><div class="mini-f"><label class="sr" for="z' + k + 'h">' + t.cols.home + '</label><input id="z' + k + 'h" type="number" value="' + z[k].home + '" ' + (canSet ? "" : "disabled") + ' placeholder="' + t.cols.home + '"><label class="sr" for="z' + k + 'd">' + t.cols.desk + '</label><input id="z' + k + 'd" type="number" value="' + z[k].desk + '" ' + (canSet ? "" : "disabled") + ' placeholder="' + t.cols.desk + '"></div><small class="muted">' + t.cols.home + ' / ' + t.cols.desk + '</small></div>';
      }).join("") + '</div>' + (canSet ? '<button class="abtn pri" type="button" data-zsave style="margin-top:10px">' + t.save + '</button>' : "") + '</div>' +
      '<div class="tscroll" style="margin-top:14px"><table class="tbl"><thead><tr><th>' + t.cols.wilaya + '</th><th>' + t.dl.zone + '</th><th>' + t.cols.home + '</th><th>' + t.cols.desk + '</th><th>' + t.dl.communeRates + '</th>' + (canSet ? '<th>' + t.cols.action + '</th>' : "") + '</tr></thead><tbody>' +
      d.rows.map(function (r) {
        return '<tr style="cursor:default"><td>' + (r.code < 10 ? "0" : "") + r.code + ' - ' + esc(A.lang === "ar" ? r.nameAr : r.name) + (r.custom ? ' <span class="tag">' + t.dl.custom + '</span>' : "") + '</td><td>' + t.dl.zones[r.zone] + '</td>' +
          '<td><input type="number" data-h="' + r.code + '" value="' + (r.home == null ? "" : r.home) + '" placeholder="' + t.dl.notOffered + '" style="width:110px;height:40px;border:1px solid var(--line2);border-radius:10px;padding:0 10px" ' + (canSet ? "" : "disabled") + ' aria-label="' + t.cols.home + '"></td>' +
          '<td><input type="number" data-d="' + r.code + '" value="' + (r.desk == null ? "" : r.desk) + '" placeholder="' + t.dl.notOffered + '" style="width:110px;height:40px;border:1px solid var(--line2);border-radius:10px;padding:0 10px" ' + (canSet ? "" : "disabled") + ' aria-label="' + t.cols.desk + '"></td>' +
          '<td>' + r.communes.map(function (c) { return '<span class="tag">' + esc(c.commune) + ': ' + (c.home == null ? "—" : c.home) + ' / ' + (c.desk == null ? "—" : c.desk) + (canSet ? ' <button type="button" data-rmc="' + r.code + '|' + esc(c.commune) + '" aria-label="' + t.del + '" style="border:0;background:none;cursor:pointer;color:inherit">×</button>' : "") + '</span>'; }).join("") + (canSet ? '<button type="button" class="abtn" data-addc="' + r.code + '" style="min-height:34px;padding:0 10px;font-size:13px">' + t.dl.addCommune + '</button>' : "") + '</td>' +
          (canSet ? '<td><div class="acts"><button type="button" class="abtn pri" data-rs="' + r.code + '" style="min-height:38px">' + t.save + '</button>' + (r.custom ? '<button type="button" class="abtn" data-rr="' + r.code + '" style="min-height:38px">' + t.dl.reset + '</button>' : "") + '</div></td>' : "") + '</tr>';
      }).join("") + '</tbody></table></div>';
    var $ = function (s) { return body.querySelector(s); };
    if ($("[data-zsave]")) $("[data-zsave]").onclick = function () {
      var zf = {}; ["A", "N", "S"].forEach(function (k) { zf[k] = { home: Number($("#z" + k + "h").value) || 0, desk: Number($("#z" + k + "d").value) || 0 }; });
      A.run("m", "settings:update", { patch: { zoneFees: zf } });
    };
    body.querySelectorAll("[data-rs]").forEach(function (b) { b.onclick = function () { var c = Number(b.getAttribute("data-rs")); A.run("m", "shipping:setRate", { wilayaCode: c, home: num($('[data-h="' + c + '"]').value), desk: num($('[data-d="' + c + '"]').value) }); }; });
    body.querySelectorAll("[data-rr]").forEach(function (b) { b.onclick = function () { A.run("m", "shipping:setRate", { wilayaCode: Number(b.getAttribute("data-rr")), home: null, desk: null, reset: true }); }; });
    body.querySelectorAll("[data-rmc]").forEach(function (b) { b.onclick = function () { var p = b.getAttribute("data-rmc").split("|"); A.run("m", "shipping:setRate", { wilayaCode: Number(p[0]), commune: p[1], home: null, desk: null, reset: true }); }; });
    body.querySelectorAll("[data-addc]").forEach(function (b) {
      b.onclick = function () {
        var code = Number(b.getAttribute("data-addc"));
        var dr = A.drawer('<div class="dh"><h2>' + t.dl.addCommune + ' · ' + esc(A.wname(code)) + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db"><form class="fields" novalidate><div class="f"><label for="cc">' + t.commune + '</label><select id="cc">' + A.communeOptions(code, "") + '</select></div><div class="two"><div class="f"><label for="ch">' + t.cols.home + '</label><input id="ch" type="number" placeholder="' + t.dl.notOffered + '"></div><div class="f"><label for="cd">' + t.cols.desk + '</label><input id="cd" type="number" placeholder="' + t.dl.notOffered + '"></div></div><button class="btn lg" type="submit">' + t.save + '</button></form></div>');
        dr.querySelector("form").onsubmit = function (e) { e.preventDefault(); A.run("m", "shipping:setRate", { wilayaCode: code, commune: dr.querySelector("#cc").value, home: num(dr.querySelector("#ch").value), desk: num(dr.querySelector("#cd").value) }).then(A.closeDrawer); };
      };
    });
  }

  /* ================= Team ================= */
  A.views.team = function (v) {
    v.innerHTML = A.top(t.team.title, '<button class="abtn pri" type="button" data-add>' + A.ic("plus", 18) + t.team.add + '</button>') + '<p class="muted" style="margin:0 0 12px;font-size:14px">' + t.team.perms + '</p><div id="tlist"></div>';
    var roles = ["owner", "manager", "confirmer", "logistics"];
    v.querySelector("[data-add]").onclick = function () {
      var dr = A.drawer('<div class="dh"><h2>' + t.team.add + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db"><form class="fields" novalidate>' +
        '<div class="f"><label for="tn">' + t.name + '</label><input id="tn"></div><div class="f"><label for="te">' + t.email + '</label><input id="te" type="email"></div>' +
        '<div class="f"><label for="tr">' + t.team.role + '</label><select id="tr">' + roles.map(function (r) { return '<option value="' + r + '"' + (r === "confirmer" ? " selected" : "") + '>' + t.roles[r] + '</option>'; }).join("") + '</select></div>' +
        '<div class="f"><label for="tp">' + t.team.newPass + '</label><input id="tp" type="password" autocomplete="new-password"></div><button class="btn lg" type="submit">' + t.add + '</button></form></div>');
      dr.querySelector("form").onsubmit = function (e) { e.preventDefault(); A.run("a", "authNode:addMember", { name: dr.querySelector("#tn").value, email: dr.querySelector("#te").value, role: dr.querySelector("#tr").value, password: dr.querySelector("#tp").value }).then(A.closeDrawer).catch(function () {}); };
    };
    A.live("auth:listMembers", {}, function (ms) {
      v.querySelector("#tlist").innerHTML = '<div class="tscroll"><table class="tbl"><thead><tr><th>' + t.name + '</th><th>' + t.team.role + '</th><th>' + t.cols.status + '</th><th>' + t.team.lastLogin + '</th><th>' + t.cols.action + '</th></tr></thead><tbody>' +
        ms.map(function (m) {
          return '<tr style="cursor:default"><td><b style="font-weight:500">' + esc(m.name) + '</b><br><small class="muted">' + esc(m.email) + '</small></td>' +
            '<td><select data-role="' + m.id + '" aria-label="' + t.team.role + '" style="height:40px;border:1px solid var(--line2);border-radius:10px;padding:0 8px">' + roles.map(function (r) { return '<option value="' + r + '"' + (r === m.role ? " selected" : "") + '>' + t.roles[r] + '</option>'; }).join("") + '</select></td>' +
            '<td>' + (m.active ? '<span class="st delivered">' + t.team.active + '</span>' : '<span class="st cancelled">' + t.team.disabled + '</span>') + '</td><td class="num">' + (m.lastLoginAt ? A.ago(m.lastLoginAt) : "—") + '</td>' +
            '<td><div class="acts"><button class="abtn" type="button" data-toggle="' + m.id + '" data-on="' + m.active + '">' + (m.active ? t.team.disabled : t.team.active) + '</button><button class="abtn" type="button" data-pw="' + m.id + '">' + t.team.reset + '</button></div></td></tr>';
        }).join("") + '</tbody></table></div>';
      v.querySelectorAll("[data-role]").forEach(function (s) { s.onchange = function () { A.run("m", "auth:updateMember", { memberId: s.getAttribute("data-role"), role: s.value }).catch(function () {}); }; });
      v.querySelectorAll("[data-toggle]").forEach(function (b) { b.onclick = function () { A.run("m", "auth:updateMember", { memberId: b.getAttribute("data-toggle"), active: b.getAttribute("data-on") !== "true" }).catch(function () {}); }; });
      v.querySelectorAll("[data-pw]").forEach(function (b) {
        b.onclick = function () {
          var dr = A.drawer('<div class="dh"><h2>' + t.team.reset + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db"><form class="fields" novalidate><div class="f"><label for="np">' + t.team.newPass + '</label><input id="np" type="password" autocomplete="new-password"></div><button class="btn lg" type="submit">' + t.save + '</button></form></div>');
          dr.querySelector("form").onsubmit = function (e) { e.preventDefault(); A.run("a", "authNode:setPassword", { memberId: b.getAttribute("data-pw"), password: dr.querySelector("#np").value }).then(A.closeDrawer).catch(function () {}); };
        };
      });
    });
  };

  /* ================= Settings ================= */
  A.views.settings = function (v) {
    var canSet = A.can("settings");
    A.q("settings:get", {}).then(function (s) {
      var f = function (id, label, val, type) { return '<div class="f"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || "text") + '" value="' + esc(val == null ? "" : val) + '"' + (canSet ? "" : " disabled") + '></div>'; };
      v.innerHTML = A.top(t.tabs.settings) +
        '<div class="cards2"><form class="box fields" id="sf" novalidate><h2>' + t.set.store + '</h2>' +
        '<div class="two">' + f("s-nar", t.set.nameAr, s.name.ar) + f("s-nfr", t.set.nameFr, s.name.fr) + '</div>' +
        '<div class="two">' + f("s-tar", t.set.taglineAr, s.tagline.ar) + f("s-tfr", t.set.taglineFr, s.tagline.fr) + '</div>' +
        '<div class="two">' + f("s-ph", t.set.phone, s.phone) + f("s-wa", t.set.whatsapp, s.whatsapp) + '</div>' +
        '<div class="two">' + f("s-car", t.set.confirmAr, s.confirmDelay.ar) + f("s-cfr", t.set.confirmFr, s.confirmDelay.fr) + '</div>' +
        '<div class="two">' + f("s-dar", t.set.delivAr, s.deliveryDelay.ar) + f("s-dfr", t.set.delivFr, s.deliveryDelay.fr) + '</div>' +
        '<div class="two">' + f("s-free", t.set.free, s.freeShippingFrom, "number") + f("s-max", t.set.maxDay, s.maxOrdersPerPhonePerDay, "number") + '</div>' +
        '<div class="f"><label for="s-or">' + t.set.origin + '</label><select id="s-or"' + (canSet ? "" : " disabled") + '>' + A.wilayaOptions(s.originWilaya) + '</select></div>' +
        '<label style="display:flex;gap:10px;align-items:center;min-height:44px"><input type="checkbox" id="s-open"' + (s.canOpenParcel ? " checked" : "") + (canSet ? "" : " disabled") + ' style="width:20px;height:20px"> ' + t.set.canOpen + '</label>' +
        '<div class="two">' + f("s-fb", t.set.fb, s.fbPixelId) + f("s-tt", t.set.tt, s.tiktokPixelId) + '</div>' +
        (canSet ? '<button class="btn lg" type="submit">' + t.save + '</button>' : "") + '</form>' +
        '<form class="box fields" id="pf" novalidate><h2>' + t.set.myPass + '</h2><div class="f"><label for="p-cur">' + t.set.current + '</label><input id="p-cur" type="password" autocomplete="current-password"></div><div class="f"><label for="p-new">' + t.team.newPass + '</label><input id="p-new" type="password" autocomplete="new-password"></div><button class="btn lg" type="submit">' + t.save + '</button></form></div>';
      var $ = function (x) { return v.querySelector(x); }, val = function (id) { return $("#" + id).value.trim(); };
      $("#sf").onsubmit = function (e) {
        e.preventDefault(); if (!canSet) return;
        A.run("m", "settings:update", { patch: {
          name: { ar: val("s-nar"), fr: val("s-nfr") }, tagline: { ar: val("s-tar"), fr: val("s-tfr") }, phone: val("s-ph"), whatsapp: val("s-wa").replace(/\D/g, ""),
          confirmDelay: { ar: val("s-car"), fr: val("s-cfr") }, deliveryDelay: { ar: val("s-dar"), fr: val("s-dfr") }, freeShippingFrom: Number(val("s-free")) || 0,
          maxOrdersPerPhonePerDay: Math.max(1, Number(val("s-max")) || 3), originWilaya: Number(val("s-or")), canOpenParcel: $("#s-open").checked, fbPixelId: val("s-fb"), tiktokPixelId: val("s-tt")
        } });
      };
      $("#pf").onsubmit = function (e) { e.preventDefault(); A.run("a", "authNode:setPassword", { current: val("p-cur"), password: val("p-new") }).then(function () { $("#p-cur").value = ""; $("#p-new").value = ""; }).catch(function () {}); };
    });
  };
})();
