/* Admin views: customers, products & categories, stock */
(function () {
  "use strict";
  var A = window.A, t = A.t, esc = A.esc, money = A.money;

  /* ================= Customers ================= */
  A.views.customers = function (v) {
    var q = A.state.cq || "", tag = A.state.ctag || "";
    v.innerHTML = A.top(t.tabs.customers) + '<div class="filters"><input type="search" placeholder="' + t.search + '" aria-label="' + t.search + '" value="' + esc(q) + '"><span id="tagf" style="display:contents"></span></div><div id="clist"></div>';
    var inp = v.querySelector("input"), deb;
    inp.oninput = function () { clearTimeout(deb); deb = setTimeout(function () { A.state.cq = inp.value.trim(); A.go("customers"); }, 400); };
    A.live("customers:allTags", {}, function (tags) {
      var all = ["loyal", "risk", "unreachable"].map(function (k) { return [k, t.auto[k]]; }).concat(tags.map(function (x) { return [x, x]; }));
      v.querySelector("#tagf").innerHTML = '<button class="fchip" type="button" data-t="" aria-pressed="' + (!tag) + '">' + t.all + '</button>' + all.map(function (x) { return '<button class="fchip" type="button" data-t="' + esc(x[0]) + '" aria-pressed="' + (tag === x[0]) + '">' + esc(x[1]) + '</button>'; }).join("");
      v.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { A.state.ctag = b.getAttribute("data-t"); A.go("customers"); }; });
    });
    A.live("customers:list", { search: q || undefined, tag: tag || undefined }, function (rows) {
      var el = v.querySelector("#clist");
      if (!rows.length) { el.innerHTML = '<div class="emptyst">' + t.none + '</div>'; return; }
      el.innerHTML = '<div class="tscroll"><table class="tbl"><thead><tr><th>' + t.cols.customer + '</th><th>' + t.cols.wilaya + '</th><th>' + t.cols.orders + '</th><th>' + t.st.delivered + ' / ' + t.st.returned + '</th><th>' + t.cols.spent + '</th><th>' + t.cols.last + '</th><th>' + t.cols.tags + '</th></tr></thead><tbody>' +
        rows.map(function (c) {
          return '<tr data-id="' + c.id + '" tabindex="0"><td><b style="font-weight:500"><bdi>' + esc(c.name) + '</bdi></b><br><small class="muted" dir="ltr">' + esc(c.phone) + '</small></td><td>' + esc(A.lang === "ar" ? c.wilayaAr || "" : c.wilaya || "") + '</td><td class="num">' + c.orders + '</td><td class="num">' + c.delivered + ' / ' + c.returned + '</td><td class="num">' + money(c.spent) + '</td><td class="num">' + A.ago(c.lastOrderAt) + '</td><td>' +
            c.auto.map(function (x) { return '<span class="tag ' + (x === "loyal" ? "good" : x === "risk" ? "risk" : x === "unreachable" ? "warn" : "") + '">' + t.auto[x] + '</span>'; }).join("") + c.tags.map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join("") + (c.blocked ? '<span class="tag risk">' + t.blocked + '</span>' : "") + '</td></tr>';
        }).join("") + '</tbody></table></div>';
      el.querySelectorAll("tr[data-id]").forEach(function (tr) { tr.onclick = function () { openCustomer(rows.filter(function (c) { return c.id === tr.getAttribute("data-id"); })[0]); }; tr.onkeydown = function (e) { if (e.key === "Enter") tr.onclick(); }; });
    });
  };
  function openCustomer(c) {
    var dr = A.drawer('<div class="dh"><div><h2><bdi>' + esc(c.name) + '</bdi></h2><small class="muted" dir="ltr">' + esc(c.phone) + '</small></div><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db">' +
      '<div class="acts"><a class="abtn" href="tel:' + esc(c.phone) + '">' + A.ic("phone", 18) + t.call + '</a><a class="abtn wa" target="_blank" rel="noopener" href="https://wa.me/' + A.waNum(c.phone) + '">' + A.ic("chat", 18) + t.wa + '</a>' +
      (A.can("orders.confirm") ? '<button class="abtn ' + (c.blocked ? "" : "red") + '" type="button" data-block>' + (c.blocked ? t.unblock : t.block) + '</button>' : "") + '</div>' +
      '<div class="kv"><span>' + t.cols.orders + '</span><b>' + c.orders + '</b><span>' + t.st.delivered + '</span><b>' + c.delivered + '</b><span>' + t.st.returned + '</span><b>' + c.returned + '</b><span>' + t.st.cancelled + '</span><b>' + c.cancelled + '</b><span>' + t.st.unreachable + '</span><b>' + c.unreachable + '</b><span>' + t.cols.spent + '</span><b>' + money(c.spent) + '</b></div>' +
      (A.can("orders.confirm") ? '<div><p class="sec-t">' + t.cols.tags + '</p><div class="mini-f"><label class="sr" for="tg">' + t.cols.tags + '</label><input id="tg" placeholder="' + t.tagsHint + '" value="' + esc(c.tags.join(", ")) + '"><button type="button" class="abtn pri" data-tg>' + t.save + '</button></div></div>' : "") +
      '<div><p class="sec-t">' + t.cols.orders + '</p><div id="corders">' + t.loading + '</div></div></div>');
    var $ = function (s) { return dr.querySelector(s); };
    if ($("[data-tg]")) $("[data-tg]").onclick = function () { A.run("m", "customers:update", { id: c.id, tags: $("#tg").value.split(",") }); };
    if ($("[data-block]")) $("[data-block]").onclick = function () { A.run("m", "customers:update", { id: c.id, blocked: !c.blocked }).then(function () { A.closeDrawer(); }); };
    A.q("customers:orders", { id: c.id }).then(function (os) {
      $("#corders").innerHTML = os.map(function (o) { return '<button type="button" class="abtn" data-oid="' + o.id + '" style="width:100%;justify-content:space-between;margin-bottom:6px"><bdi>' + esc(o.number) + '</bdi><span>' + money(o.total) + '</span>' + A.st(o.status) + '</button>'; }).join("") || t.none;
      dr.querySelectorAll("[data-oid]").forEach(function (b) { b.onclick = function () { A.openOrder(b.getAttribute("data-oid")); }; });
    });
  }

  /* ================= Products ================= */
  var TINTS = ["rose", "sage", "sand", "plum", "sky"], SHAPES = ["dropper", "jar", "tube"];
  A.views.products = function (v) {
    v.innerHTML = A.top(t.prod.title, '<button class="abtn" type="button" data-cats>' + t.cat.title + '</button><button class="abtn pri" type="button" data-new>' + A.ic("plus", 18) + t.prod.new + '</button>') + '<div id="plist"></div>';
    var data = null;
    v.querySelector("[data-new]").onclick = function () { if (data) editProduct(null, data); };
    v.querySelector("[data-cats]").onclick = function () { if (data) editCategories(data); };
    A.live("catalog:adminProducts", {}, function (d) {
      data = d;
      var el = v.querySelector("#plist");
      if (!d.products.length) { el.innerHTML = '<div class="emptyst">' + t.none + '</div>'; return; }
      el.innerHTML = '<div class="tscroll"><table class="tbl"><thead><tr><th></th><th>' + t.cols.product + '</th><th>' + t.prod.category + '</th><th>' + t.cols.price + '</th><th>' + t.cols.stock + '</th><th>' + t.cols.status + '</th></tr></thead><tbody>' +
        d.products.map(function (p) {
          var cat = d.categories.filter(function (c) { return c.id === p.categoryId; })[0];
          var img = p.imageUrls[0] && p.imageUrls[0].url;
          return '<tr data-id="' + p.id + '" tabindex="0"><td style="width:64px">' + (img ? '<img src="' + esc(img) + '" alt="" style="width:48px;height:48px;border-radius:10px;object-fit:cover">' : '<span style="display:block;width:48px;height:48px;border-radius:24px 24px 8px 8px;background:#F1E4DF"></span>') + '</td>' +
            '<td><b style="font-weight:500">' + esc(A.tx(p.name)) + '</b><br><small class="muted">' + esc(p.slug) + '</small></td><td>' + esc(cat ? A.tx(cat.name) : "—") + '</td><td class="num">' + money(p.price) + '</td><td class="num">' + (p.trackStock ? p.stock : "—") + '</td><td>' + (p.active ? '<span class="st delivered">' + t.prod.active + '</span>' : '<span class="st cancelled">' + t.prod.hidden + '</span>') + '</td></tr>';
        }).join("") + '</tbody></table></div>';
      el.querySelectorAll("tr[data-id]").forEach(function (tr) { tr.onclick = function () { editProduct(d.products.filter(function (p) { return p.id === tr.getAttribute("data-id"); })[0], d); }; tr.onkeydown = function (e) { if (e.key === "Enter") tr.onclick(); }; });
    });
  };

  function field(id, label, value, type, extra) { return '<div class="f"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value == null ? "" : value) + '"' + (extra || "") + '></div>'; }
  function area(id, label, value) { return '<div class="f"><label for="' + id + '">' + label + '</label><textarea id="' + id + '" rows="3" style="border:1px solid var(--line2);border-radius:12px;padding:10px 12px;font:inherit;font-size:15px;resize:vertical">' + esc(value || "") + '</textarea></div>'; }

  /** Resize to 1200 px and re-encode as WebP (≈80–150 KB) so product pages load fast on 3G. */
  function compress(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1200, k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        var done = function (b) { resolve(b && b.size < file.size ? b : file); };
        c.toBlob(function (b) { if (b && b.type === "image/webp") done(b); else c.toBlob(done, "image/jpeg", 0.82); }, "image/webp", 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(u); resolve(file); };
      img.src = u;
    });
  }

  function editProduct(p, d) {
    var imgs = p ? p.imageUrls.filter(function (i) { return i.url; }).map(function (i) { return { id: i.id, url: i.url }; }) : [];
    var cats = d.categories;
    var dr = A.drawer('<div class="dh"><h2>' + esc(p ? A.tx(p.name) : t.prod.new) + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db"><form class="fields" id="pf" novalidate>' +
      '<div class="two">' + field("p-nar", t.prod.nameAr, p && p.name.ar) + field("p-nfr", t.prod.nameFr, p && p.name.fr) + '</div>' +
      '<div class="two">' + field("p-price", t.prod.price, p ? p.price : "", "number", ' min="0"') + field("p-cmp", t.prod.compareAt + " (" + t.optional + ")", p && p.compareAt, "number", ' min="0"') + '</div>' +
      '<div class="two"><div class="f"><label for="p-cat">' + t.prod.category + '</label><select id="p-cat"><option value="">' + t.prod.noCat + '</option>' + cats.map(function (c) { var par = cats.filter(function (x) { return x.id === c.parentId; })[0]; return '<option value="' + c.id + '"' + (p && p.categoryId === c.id ? " selected" : "") + '>' + esc((par ? A.tx(par.name) + " › " : "") + A.tx(c.name)) + '</option>'; }).join("") + '</select></div>' + field("p-slug", t.prod.slug, p && p.slug) + '</div>' +
      '<div class="f"><span style="font-size:15px;font-weight:500">' + t.prod.images + '</span><div id="p-imgs" style="display:flex;flex-wrap:wrap;gap:8px"></div><label class="abtn" style="width:max-content;cursor:pointer">' + A.ic("plus", 18) + t.prod.upload + '<input id="p-file" type="file" accept="image/*" multiple style="display:none"></label></div>' +
      '<div class="two">' + field("p-sar", t.prod.sizeAr, p && p.size && p.size.ar) + field("p-sfr", t.prod.sizeFr, p && p.size && p.size.fr) + '</div>' +
      area("p-dar", t.prod.descAr, p && p.desc && p.desc.ar) + area("p-dfr", t.prod.descFr, p && p.desc && p.desc.fr) +
      area("p-bar", t.prod.benAr, p && p.benefits && p.benefits.ar.join("\n")) + area("p-bfr", t.prod.benFr, p && p.benefits && p.benefits.fr.join("\n")) +
      area("p-uar", t.prod.useAr, p && p.usage && p.usage.ar) + area("p-ufr", t.prod.useFr, p && p.usage && p.usage.fr) +
      '<div class="two">' + field("p-w", t.prod.weight, p && p.weightKg, "number", ' step="0.01" min="0"') + field("p-sku", t.prod.sku, p && p.sku) + '</div>' +
      '<div class="two">' + field("p-low", t.cols.lowAt, p ? p.lowAt : 5, "number", ' min="0"') + field("p-ord", t.prod.order, p ? p.sortOrder : d.products.length, "number") + '</div>' +
      '<div class="two"><div class="f"><label for="p-shape">' + t.prod.shape + '</label><select id="p-shape">' + SHAPES.map(function (s) { return '<option' + ((p && p.shape || "dropper") === s ? " selected" : "") + '>' + s + '</option>'; }).join("") + '</select></div><div class="f"><label for="p-tint">' + t.prod.tint + '</label><select id="p-tint">' + TINTS.map(function (s) { return '<option' + ((p && p.tint || "rose") === s ? " selected" : "") + '>' + s + '</option>'; }).join("") + '</select></div></div>' +
      '<label style="display:flex;gap:10px;align-items:center;min-height:44px"><input type="checkbox" id="p-act"' + (!p || p.active ? " checked" : "") + ' style="width:20px;height:20px"> ' + t.prod.active + '</label>' +
      '<label style="display:flex;gap:10px;align-items:center;min-height:44px"><input type="checkbox" id="p-trk"' + (p && p.trackStock ? " checked" : "") + ' style="width:20px;height:20px"> ' + t.prod.track + '</label>' +
      '<div class="alert" hidden></div><button class="btn lg" type="submit">' + t.save + '</button></form></div>');
    var $ = function (s) { return dr.querySelector(s); };
    function paintImgs() {
      $("#p-imgs").innerHTML = imgs.map(function (im, i) { return '<div style="position:relative;width:92px"><img src="' + esc(im.url) + '" alt="" style="width:92px;height:92px;object-fit:cover;border-radius:12px;border:2px solid ' + (i ? "var(--line)" : "var(--teal)") + '"><div style="display:flex;gap:4px;margin-top:4px">' + (i ? '<button type="button" class="abtn" data-first="' + i + '" style="min-height:32px;padding:0 8px;font-size:12px">' + t.prod.main + '</button>' : "") + '<button type="button" class="abtn red" data-rmi="' + i + '" style="min-height:32px;padding:0 8px;font-size:12px" aria-label="' + t.del + '">×</button></div></div>'; }).join("");
      dr.querySelectorAll("[data-rmi]").forEach(function (b) { b.onclick = function () { imgs.splice(Number(b.getAttribute("data-rmi")), 1); paintImgs(); }; });
      dr.querySelectorAll("[data-first]").forEach(function (b) { b.onclick = function () { var i = Number(b.getAttribute("data-first")); imgs.unshift(imgs.splice(i, 1)[0]); paintImgs(); }; });
    }
    paintImgs();
    $("#p-file").onchange = function () {
      var files = Array.prototype.slice.call($("#p-file").files || []);
      files.reduce(function (pr, file) {
        return pr.then(function () {
          A.flash(t.prod.uploading, false);
          return Promise.all([A.m("catalog:generateUploadUrl", {}), compress(file)]).then(function (r) {
            var url = r[0], blob = r[1];
            return fetch(url, { method: "POST", headers: { "Content-Type": blob.type }, body: blob }).then(function (res) { return res.json(); }).then(function (j) { imgs.push({ id: j.storageId, url: URL.createObjectURL(blob) }); paintImgs(); });
          });
        });
      }, Promise.resolve()).catch(function (e) { A.flash(A.errMsg(e), true); });
    };
    $("#pf").onsubmit = function (e) {
      e.preventDefault();
      var val = function (id) { return $("#" + id).value.trim(); }, num = function (id) { var x = val(id); return x === "" ? undefined : Number(x); };
      var lines = function (id) { return val(id).split("\n").map(function (s) { return s.trim(); }).filter(Boolean); };
      var both = function (a, b) { return val(a) || val(b) ? { ar: val(a), fr: val(b) } : undefined; };
      if (!val("p-nar") && !val("p-nfr")) { var al = $(".alert"); al.hidden = false; al.textContent = t.prod.nameFr; return; }
      var data = {
        slug: val("p-slug"), name: { ar: val("p-nar") || val("p-nfr"), fr: val("p-nfr") || val("p-nar") }, price: num("p-price") || 0, compareAt: num("p-cmp"),
        categoryId: val("p-cat") || undefined, images: imgs.map(function (i) { return i.id; }), size: both("p-sar", "p-sfr"), desc: both("p-dar", "p-dfr"),
        benefits: lines("p-bar").length || lines("p-bfr").length ? { ar: lines("p-bar"), fr: lines("p-bfr") } : undefined, usage: both("p-uar", "p-ufr"),
        shape: val("p-shape"), tint: val("p-tint"), active: $("#p-act").checked, trackStock: $("#p-trk").checked, lowAt: num("p-low") || 0,
        weightKg: num("p-w"), sku: val("p-sku") || undefined, sortOrder: num("p-ord") || 0
      };
      A.run("m", "catalog:saveProduct", { id: p ? p.id : undefined, data: data }).then(function () { A.closeDrawer(); }).catch(function () {});
    };
  }

  function editCategories(d) {
    var dr = A.drawer('<div class="dh"><h2>' + t.cat.title + '</h2><button class="x" type="button" aria-label="' + t.close + '">' + A.ic("x") + '</button></div><div class="db" id="cbody"></div>');
    function paint(cats) {
      var body = dr.querySelector("#cbody"), tops = cats.filter(function (c) { return !c.parentId; });
      body.innerHTML = cats.map(function (c) {
        return '<div class="box" style="padding:12px 14px;display:flex;flex-direction:column;gap:8px' + (c.parentId ? ";margin-inline-start:24px" : "") + '"><div class="mini-f"><input data-car="' + c.id + '" aria-label="ar" value="' + esc(c.name.ar) + '"><input data-cfr="' + c.id + '" aria-label="fr" value="' + esc(c.name.fr) + '"></div>' +
          '<div class="mini-f"><select data-cpar="' + c.id + '" aria-label="' + t.cat.parent + '"><option value="">' + t.cat.none + '</option>' + tops.filter(function (x) { return x.id !== c.id; }).map(function (x) { return '<option value="' + x.id + '"' + (c.parentId === x.id ? " selected" : "") + '>' + esc(A.tx(x.name)) + '</option>'; }).join("") + '</select><input data-cord="' + c.id + '" type="number" aria-label="' + t.prod.order + '" value="' + c.sortOrder + '" style="max-width:80px"><button class="abtn pri" type="button" data-csave="' + c.id + '">' + t.save + '</button><button class="abtn red" type="button" data-cdel="' + c.id + '">' + t.del + '</button></div></div>';
      }).join("") +
        '<div class="box" style="padding:12px 14px;display:flex;flex-direction:column;gap:8px"><b>' + t.cat.new + '</b><div class="mini-f"><input id="nc-ar" placeholder="' + t.prod.nameAr + '"><input id="nc-fr" placeholder="' + t.prod.nameFr + '"></div><div class="mini-f"><select id="nc-par" aria-label="' + t.cat.parent + '"><option value="">' + t.cat.none + '</option>' + tops.map(function (x) { return '<option value="' + x.id + '">' + esc(A.tx(x.name)) + '</option>'; }).join("") + '</select><button class="abtn pri" type="button" data-cadd>' + t.add + '</button></div></div>';
      body.querySelectorAll("[data-csave]").forEach(function (b) {
        b.onclick = function () {
          var id = b.getAttribute("data-csave"), c = cats.filter(function (x) { return x.id === id; })[0], q = function (a) { return body.querySelector("[" + a + '="' + id + '"]').value.trim(); };
          A.run("m", "catalog:saveCategory", { id: id, slug: c.slug, name: { ar: q("data-car"), fr: q("data-cfr") }, parentId: q("data-cpar") || undefined, sortOrder: Number(q("data-cord")) || 0 });
        };
      });
      body.querySelectorAll("[data-cdel]").forEach(function (b) { b.onclick = function () { A.ask().then(function (y) { if (y) A.run("m", "catalog:deleteCategory", { id: b.getAttribute("data-cdel") }).catch(function () {}); }); }; });
      body.querySelector("[data-cadd]").onclick = function () {
        var ar = body.querySelector("#nc-ar").value.trim(), fr = body.querySelector("#nc-fr").value.trim(); if (!ar && !fr) return;
        A.run("m", "catalog:saveCategory", { slug: "", name: { ar: ar || fr, fr: fr || ar }, parentId: body.querySelector("#nc-par").value || undefined, sortOrder: cats.length });
      };
    }
    A.drawerLive(A.client.onUpdate("catalog:adminProducts", { token: A.token }, function (x) { paint(x.categories); }));
  }

  /* ================= Stock ================= */
  A.views.stock = function (v) {
    v.innerHTML = A.top(t.tabs.stock) + '<div id="slist"></div>';
    A.live("stock:overview", {}, function (d) {
      var canS = A.can("stock");
      var pname = function (id) { var p = d.products.filter(function (x) { return x.id === id; })[0]; return p ? A.tx(p.name) : "?"; };
      v.querySelector("#slist").innerHTML = '<div class="tscroll"><table class="tbl"><thead><tr><th>' + t.cols.product + '</th><th>' + t.cols.stock + '</th><th>' + t.cols.lowAt + '</th><th>' + t.cols.status + '</th>' + (canS ? '<th>' + t.cols.action + '</th>' : "") + '</tr></thead><tbody>' +
        d.products.map(function (p) {
          var badge = !p.trackStock ? '<span class="st cancelled">' + t.stock.untracked + '</span>' : p.stock <= 0 ? '<span class="st returned">' + t.stock.out + '</span>' : p.stock <= p.lowAt ? '<span class="st unreachable">' + t.stock.low + '</span>' : '<span class="st delivered">' + t.stock.ok + '</span>';
          return '<tr style="cursor:default"><td>' + esc(A.tx(p.name)) + (p.sku ? '<br><small class="muted">' + esc(p.sku) + '</small>' : "") + (p.active ? "" : ' <small class="muted">(' + t.prod.hidden + ')</small>') + '</td><td class="num"><b style="font-size:17px">' + (p.trackStock ? p.stock : "—") + '</b></td><td class="num">' + (p.trackStock ? p.lowAt : "—") + '</td><td>' + badge + '</td>' +
            (canS ? '<td>' + (p.trackStock ? '<div class="mini-f" style="min-width:340px"><label class="sr" for="d-' + p.id + '">±</label><input id="d-' + p.id + '" type="number" placeholder="±" style="max-width:90px"><input id="r-' + p.id + '" placeholder="' + t.stock.reason + '" aria-label="' + t.stock.reason + '"><button type="button" class="abtn" data-adj="' + p.id + '">' + t.stock.adjust + '</button></div>' : '<button type="button" class="abtn pri" data-trk="' + p.id + '">' + t.stock.start + '</button>') + '</td>' : "") + '</tr>';
        }).join("") + '</tbody></table></div>' +
        '<div class="box" style="margin-top:14px"><h2>' + t.stock.moves + '</h2>' + (d.moves.length ? '<ul class="hist">' + d.moves.map(function (mv) { return '<li><b>' + esc(pname(mv.productId)) + '</b> ' + (mv.delta > 0 ? "+" : "") + mv.delta + ' → ' + mv.after + ' · ' + esc(mv.reason) + (mv.order ? ' <bdi>(' + esc(mv.order) + ')</bdi>' : "") + '<time>' + esc(mv.by || "") + ' · ' + A.dt(mv.at) + '</time></li>'; }).join("") + '</ul>' : '<p class="muted" style="margin:0">' + t.none + '</p>') + '</div>';
      v.querySelectorAll("[data-adj]").forEach(function (b) { b.onclick = function () { var id = b.getAttribute("data-adj"), dd = Number(v.querySelector("#d-" + id).value); if (!dd) return; A.run("m", "stock:adjust", { productId: id, delta: dd, reason: v.querySelector("#r-" + id).value }); }; });
      v.querySelectorAll("[data-trk]").forEach(function (b) { b.onclick = function () { A.run("m", "stock:adjust", { productId: b.getAttribute("data-trk"), set: 0, reason: "init" }); }; });
    });
  };
})();
