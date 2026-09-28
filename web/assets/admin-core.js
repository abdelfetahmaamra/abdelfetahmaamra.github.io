/* Ronaq El Hayat — admin panel: core (connection, auth, shell, helpers). Views live in admin-*.js */
(function () {
  "use strict";
  var CFG = window.RONAQ || {};
  var A = (window.A = {});
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  A.lsGet = lsGet; A.lsSet = lsSet;

  var lang = (A.lang = lsGet("ronaq_admin_lang", null) || CFG.defaultLang || "ar");
  document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  A.L = {
    ar: {
      title: "لوحة التحكم",
      tabs: { dash: "الرئيسية", orders: "الطلبات", abandoned: "المتروكة", customers: "الزبائن", products: "المنتجات", stock: "المخزون", delivery: "التوصيل", team: "الفريق", settings: "الإعدادات" },
      roles: { owner: "المالك", manager: "مدير", confirmer: "مؤكِّدة", logistics: "لوجستيك" },
      st: { new: "جديد", confirmed: "مؤكد", unreachable: "لا يرد", cancelled: "ملغى", preparing: "قيد التحضير", shipped: "مُرسل", delivered: "مُسلَّم", returned: "مرتجع" },
      to: { confirmed: "تأكيد", unreachable: "لا يرد", cancelled: "إلغاء", preparing: "قيد التحضير", shipped: "تم الإرسال (يدوياً)", delivered: "تم التسليم", returned: "مرتجع", new: "إعادة فتح" },
      ast: { open: "مفتوح", contacted: "تم التواصل", converted: "تحوّل إلى طلب", ignored: "مُهمَل" },
      auto: { loyal: "وفية", risk: "مخاطرة", unreachable: "لا ترد غالباً", "new": "جديدة" },
      login: "الدخول إلى لوحة التحكم", email: "البريد الإلكتروني", password: "كلمة السر", enter: "دخول", logout: "خروج", store: "عرض المتجر", switchLang: "Français",
      setupTitle: "اربطي لوحة التحكم بـ Convex", setupText: "افتحي الملف assets/config.js وضعي رابط convexUrl و convexSite من لوحة Convex، ثم أعيدي تحميل الصفحة. الخطوات كاملة في README-AR.md.",
      loading: "جارٍ التحميل…", saved: "تم الحفظ", none: "لا توجد بيانات بعد.", all: "الكل", search: "بحث: الاسم، الهاتف، رقم الطلب، التتبع", export: "تصدير CSV", refresh: "تحديث",
      save: "حفظ", cancel: "إلغاء", add: "إضافة", edit: "تعديل", del: "حذف", close: "إغلاق", yes: "نعم، متأكدة", confirmQ: "هل أنتِ متأكدة؟", optional: "اختياري",
      period: { 1: "اليوم", 7: "7 أيام", 30: "30 يوماً", 90: "90 يوماً" },
      k: { orders: "الطلبات", pending: "بانتظار التأكيد", conf: "نسبة التأكيد", deliv: "نسبة التسليم", revenue: "المبيعات المُسلَّمة", aov: "متوسط الطلب المُسلَّم" },
      perDay: "الطلبات يومياً", confirmedLegend: "مؤكدة", ordersLegend: "كل الطلبات", topProducts: "الأكثر مبيعاً (مؤكدة)", topWilayas: "الولايات", campaigns: "الحملات الإعلانية", carriers: "شركات التوصيل", alerts: "تنبيهات",
      noCampaign: "بدون حملة", allGood: "لا توجد تنبيهات.", view: "عرض",
      al: { stale: "{n} طلبات جديدة لم تُؤكَّد منذ أكثر من ساعتين", followUps: "{n} طلبات «لا يرد» حان موعد إعادة الاتصال", toShip: "{n} طلبات مؤكدة بانتظار الإرسال", carrierErrors: "{n} طلبات فشل إرسالها لشركة التوصيل", stuck: "{n} طرود عند شركة التوصيل منذ أكثر من 10 أيام", abandoned: "{n} طلبات متروكة مفتوحة", low: "مخزون منخفض: {p} ({n})", out: "نفد: {p}" },
      cols: { order: "الطلب", date: "التاريخ", customer: "الزبونة", wilaya: "الولاية", items: "المنتجات", total: "المجموع", status: "الحالة", phone: "الهاتف", orders: "الطلبات", spent: "المُسلَّم", last: "آخر طلب", tags: "الوسوم", product: "المنتج", stock: "المخزون", lowAt: "تنبيه عند", action: "إجراء", when: "متى", home: "منزل", desk: "مكتب", price: "السعر" },
      call: "اتصال", wa: "WhatsApp", attempts: "محاولات", followUp: "موعد إعادة الاتصال", notes: "ملاحظات داخلية", addNote: "أضيفي ملاحظة…", history: "السجل",
      editOrder: "تعديل الطلب", locked: "لا يمكن التعديل بعد الإرسال.", qtyLocked: "الكميات مقفلة بعد التأكيد (المخزون محجوز).", mode: "التوصيل", home: "إلى المنزل", desk: "مكتب التوصيل",
      commune: "البلدية", address: "العنوان", name: "الاسم", phone2: "هاتف ثانٍ", shipping: "سعر التوصيل", recompute: "إعادة حساب التوصيل", stopDesk: "مكتب الاستلام", noDesk: "— بدون —",
      ship: "الإرسال", carrier: "شركة التوصيل", sendTo: "إرسال إلى", label: "الملصق", cancelShip: "إلغاء الطرد", revalidate: "إعادة المصادقة لدى الشركة", tracking: "رقم التتبع", carrierStatus: "حالة الطرد", carrierError: "خطأ الإرسال",
      needConfirm: "أكّدي الطلب قبل إرساله.", noCarrier: "لا توجد شركة توصيل مربوطة. أضيفي المفاتيح في Convex (تبويب التوصيل).",
      selected: "{n} محدد", bulkPrep: "قيد التحضير", bulkShip: "إرسال المحدد", bulkDone: "تم: {ok} · فشل: {bad}",
      waConfirm: "السلام عليكم {name}، معكِ {store}. نتصل بكِ لتأكيد طلبكِ رقم {id}: {items}. المجموع {total} (الدفع عند الاستلام). هل نؤكد الإرسال إلى {wilaya}؟",
      waAband: "السلام عليكم {name}، معكِ {store}. لاحظنا أنكِ بدأتِ طلب {items} ولم تكمليه. هل تريدين أن نكمله لكِ؟ الدفع عند الاستلام.",
      contacted: "تم التواصل", ignore: "إهمال", makeOrder: "إنشاء طلب", newOrder: "طلب جديد (هاتفي)", create: "إنشاء الطلب", addLine: "إضافة منتج",
      blocked: "محظورة", block: "حظر", unblock: "إلغاء الحظر", tagsHint: "وسوم مفصولة بفاصلة (VIP، وفية…)",
      prod: { title: "المنتجات", new: "منتج جديد", nameAr: "الاسم بالعربية", nameFr: "الاسم بالفرنسية", slug: "اسم الرابط", category: "الفئة", noCat: "— بدون فئة —", price: "السعر (دج)", compareAt: "السعر قبل التخفيض", sizeAr: "الحجم (عربي)", sizeFr: "الحجم (فرنسي)", descAr: "الوصف (عربي)", descFr: "الوصف (فرنسي)", benAr: "المميزات (عربي، سطر لكل ميزة)", benFr: "المميزات (فرنسي)", useAr: "طريقة الاستعمال (عربي)", useFr: "طريقة الاستعمال (فرنسي)", images: "الصور (الأولى هي الرئيسية)", upload: "رفع صور", active: "ظاهر في المتجر", track: "متابعة المخزون", weight: "الوزن (كغ)", sku: "المرجع SKU", order: "الترتيب", shape: "رسم مؤقت", tint: "لون", hidden: "مخفي", archive: "إخفاء", uploading: "جارٍ الرفع…", main: "رئيسية" },
      cat: { title: "الفئات", new: "فئة جديدة", parent: "فئة رئيسية", none: "— رئيسية —" },
      stock: { adjust: "تعديل", reason: "السبب (استلام بضاعة، جرد…)", set: "تحديد القيمة", low: "منخفض", out: "نفد", ok: "متوفر", untracked: "غير مُتابَع", start: "بدء المتابعة", moves: "حركة المخزون" },
      dl: { carriers: "شركات التوصيل", rates: "أسعار التوصيل", connected: "مربوطة", missing: "المفاتيح غير موجودة", test: "اختبار الاتصال", sync: "مزامنة المكاتب والبلديات", syncStatus: "مزامنة حالات الطرود الآن", default: "الشركة الافتراضية", desks: "{n} مكتب", logs: "سجل العمليات", zone: "المنطقة", custom: "مخصص", reset: "افتراضي", notOffered: "غير متاح", communeRates: "أسعار خاصة بالبلديات", addCommune: "إضافة بلدية", zoneDefaults: "الأسعار الافتراضية حسب المنطقة", zones: { A: "العاصمة", N: "الشمال والهضاب", S: "الجنوب" }, envHelp: "تُضاف المفاتيح في Convex › Settings › Environment Variables (انظري README-AR.md).", meta: "Meta Conversions API", metaOn: "مفعّل", metaOff: "غير مفعّل", metaTest: "وضع الاختبار" },
      team: { title: "الفريق", add: "إضافة عضو", role: "الدور", active: "نشط", disabled: "معطّل", reset: "تغيير كلمة السر", lastLogin: "آخر دخول", newPass: "كلمة سر جديدة (10 أحرف على الأقل)", perms: "الصلاحيات: المالك كل شيء · المدير كل شيء عدا الفريق · المؤكِّدة: الطلبات والتأكيد · اللوجستيك: الإرسال والمخزون" },
      set: { store: "المتجر", nameAr: "الاسم بالعربية", nameFr: "الاسم بالفرنسية", taglineAr: "الشعار (عربي)", taglineFr: "الشعار (فرنسي)", phone: "الهاتف الظاهر", whatsapp: "WhatsApp (دولي، مثال 213676610457)", free: "توصيل مجاني ابتداءً من (0 = معطّل)", confirmAr: "مدة الاتصال للتأكيد (عربي)", confirmFr: "مدة الاتصال (فرنسي)", delivAr: "مدة التوصيل (عربي)", delivFr: "مدة التوصيل (فرنسي)", origin: "ولاية الإرسال (المستودع)", canOpen: "السماح بفتح الطرد قبل الدفع", fb: "Facebook Pixel ID", tt: "TikTok Pixel ID", maxDay: "أقصى عدد طلبات لنفس الرقم يومياً", myPass: "كلمة السر الخاصة بي", current: "كلمة السر الحالية" },
      ago: { m: "منذ {n} د", h: "منذ {n} س", d: "منذ {n} ي" }, newOrderToast: "طلب جديد: {n}"
    },
    fr: {
      title: "Tableau de bord",
      tabs: { dash: "Accueil", orders: "Commandes", abandoned: "Abandonnées", customers: "Clientes", products: "Produits", stock: "Stock", delivery: "Livraison", team: "Équipe", settings: "Réglages" },
      roles: { owner: "Propriétaire", manager: "Manager", confirmer: "Confirmatrice", logistics: "Logistique" },
      st: { new: "Nouvelle", confirmed: "Confirmée", unreachable: "Injoignable", cancelled: "Annulée", preparing: "En préparation", shipped: "Expédiée", delivered: "Livrée", returned: "Retour" },
      to: { confirmed: "Confirmer", unreachable: "Injoignable", cancelled: "Annuler", preparing: "En préparation", shipped: "Expédiée (manuel)", delivered: "Livrée", returned: "Retour", new: "Rouvrir" },
      ast: { open: "Ouverte", contacted: "Contactée", converted: "Convertie", ignored: "Ignorée" },
      auto: { loyal: "Fidèle", risk: "À risque", unreachable: "Souvent injoignable", "new": "Nouvelle" },
      login: "Accès au tableau de bord", email: "E-mail", password: "Mot de passe", enter: "Entrer", logout: "Déconnexion", store: "Voir la boutique", switchLang: "العربية",
      setupTitle: "Reliez le tableau de bord à Convex", setupText: "Ouvrez assets/config.js et renseignez convexUrl et convexSite depuis le dashboard Convex, puis rechargez. Toutes les étapes sont dans README-AR.md.",
      loading: "Chargement…", saved: "Enregistré", none: "Aucune donnée pour l'instant.", all: "Toutes", search: "Rechercher : nom, téléphone, n° commande, suivi", export: "Exporter CSV", refresh: "Actualiser",
      save: "Enregistrer", cancel: "Annuler", add: "Ajouter", edit: "Modifier", del: "Supprimer", close: "Fermer", yes: "Oui, je confirme", confirmQ: "Vous êtes sûre ?", optional: "facultatif",
      period: { 1: "Aujourd'hui", 7: "7 jours", 30: "30 jours", 90: "90 jours" },
      k: { orders: "Commandes", pending: "À confirmer", conf: "Taux de confirmation", deliv: "Taux de livraison", revenue: "CA livré", aov: "Panier moyen livré" },
      perDay: "Commandes par jour", confirmedLegend: "Confirmées", ordersLegend: "Toutes", topProducts: "Meilleures ventes (confirmées)", topWilayas: "Wilayas", campaigns: "Campagnes", carriers: "Transporteurs", alerts: "Alertes",
      noCampaign: "Sans campagne", allGood: "Aucune alerte.", view: "Voir",
      al: { stale: "{n} nouvelles commandes non confirmées depuis plus de 2 h", followUps: "{n} commandes injoignables à rappeler", toShip: "{n} commandes confirmées à expédier", carrierErrors: "{n} envois au transporteur en échec", stuck: "{n} colis chez le transporteur depuis plus de 10 jours", abandoned: "{n} commandes abandonnées ouvertes", low: "Stock bas : {p} ({n})", out: "Rupture : {p}" },
      cols: { order: "Commande", date: "Date", customer: "Cliente", wilaya: "Wilaya", items: "Produits", total: "Total", status: "Statut", phone: "Téléphone", orders: "Commandes", spent: "Livré", last: "Dernière", tags: "Tags", product: "Produit", stock: "Stock", lowAt: "Alerte à", action: "Action", when: "Quand", home: "Domicile", desk: "Bureau", price: "Prix" },
      call: "Appeler", wa: "WhatsApp", attempts: "Tentatives", followUp: "Rappel prévu", notes: "Notes internes", addNote: "Ajouter une note…", history: "Historique",
      editOrder: "Modifier la commande", locked: "Modification impossible après l'envoi.", qtyLocked: "Quantités verrouillées après confirmation (stock réservé).", mode: "Livraison", home: "À domicile", desk: "Stop desk",
      commune: "Commune", address: "Adresse", name: "Nom", phone2: "2e téléphone", shipping: "Frais de livraison", recompute: "Recalculer la livraison", stopDesk: "Bureau de retrait", noDesk: "— aucun —",
      ship: "Expédition", carrier: "Transporteur", sendTo: "Envoyer à", label: "Étiquette", cancelShip: "Annuler le colis", revalidate: "Relancer la validation", tracking: "N° de suivi", carrierStatus: "Statut du colis", carrierError: "Erreur d'envoi",
      needConfirm: "Confirmez la commande avant de l'envoyer.", noCarrier: "Aucun transporteur relié. Ajoutez les clés dans Convex (onglet Livraison).",
      selected: "{n} sélectionnées", bulkPrep: "En préparation", bulkShip: "Envoyer la sélection", bulkDone: "OK : {ok} · échecs : {bad}",
      waConfirm: "Bonjour {name}, ici {store}. Nous vous contactons pour confirmer votre commande {id} : {items}. Total {total} (paiement à la livraison). Confirmez-vous l'envoi vers {wilaya} ?",
      waAband: "Bonjour {name}, ici {store}. Vous avez commencé une commande ({items}) sans la terminer. Voulez-vous qu'on la finalise ? Paiement à la livraison.",
      contacted: "Contactée", ignore: "Ignorer", makeOrder: "Créer la commande", newOrder: "Nouvelle commande (téléphone)", create: "Créer la commande", addLine: "Ajouter un produit",
      blocked: "Bloquée", block: "Bloquer", unblock: "Débloquer", tagsHint: "Tags séparés par des virgules (VIP, fidèle…)",
      prod: { title: "Produits", new: "Nouveau produit", nameAr: "Nom en arabe", nameFr: "Nom en français", slug: "Nom du lien", category: "Catégorie", noCat: "— sans catégorie —", price: "Prix (DA)", compareAt: "Prix barré", sizeAr: "Contenance (ar)", sizeFr: "Contenance (fr)", descAr: "Description (ar)", descFr: "Description (fr)", benAr: "Points forts (ar, un par ligne)", benFr: "Points forts (fr)", useAr: "Mode d'emploi (ar)", useFr: "Mode d'emploi (fr)", images: "Photos (la première est la principale)", upload: "Ajouter des photos", active: "Visible en boutique", track: "Suivre le stock", weight: "Poids (kg)", sku: "Référence SKU", order: "Ordre", shape: "Illustration", tint: "Couleur", hidden: "Masqué", archive: "Masquer", uploading: "Envoi…", main: "Principale" },
      cat: { title: "Catégories", new: "Nouvelle catégorie", parent: "Catégorie parente", none: "— principale —" },
      stock: { adjust: "Ajuster", reason: "Motif (réception, inventaire…)", set: "Fixer", low: "Bas", out: "Rupture", ok: "Disponible", untracked: "Non suivi", start: "Suivre", moves: "Mouvements de stock" },
      dl: { carriers: "Transporteurs", rates: "Tarifs de livraison", connected: "Relié", missing: "Clés manquantes", test: "Tester la connexion", sync: "Synchroniser bureaux et communes", syncStatus: "Synchroniser les statuts maintenant", default: "Transporteur par défaut", desks: "{n} bureaux", logs: "Journal", zone: "Zone", custom: "Personnalisé", reset: "Par défaut", notOffered: "Indisponible", communeRates: "Tarifs par commune", addCommune: "Ajouter une commune", zoneDefaults: "Tarifs par défaut par zone", zones: { A: "Alger", N: "Nord et Hauts-Plateaux", S: "Sud" }, envHelp: "Les clés s'ajoutent dans Convex › Settings › Environment Variables (voir README-AR.md).", meta: "Meta Conversions API", metaOn: "Actif", metaOff: "Inactif", metaTest: "Mode test" },
      team: { title: "Équipe", add: "Ajouter un membre", role: "Rôle", active: "Actif", disabled: "Désactivé", reset: "Changer le mot de passe", lastLogin: "Dernière connexion", newPass: "Nouveau mot de passe (10 caractères min.)", perms: "Rôles : Propriétaire tout · Manager tout sauf l'équipe · Confirmatrice : commandes et confirmation · Logistique : expédition et stock" },
      set: { store: "Boutique", nameAr: "Nom (ar)", nameFr: "Nom (fr)", taglineAr: "Slogan (ar)", taglineFr: "Slogan (fr)", phone: "Téléphone affiché", whatsapp: "WhatsApp (international, ex. 213676610457)", free: "Livraison gratuite dès (0 = désactivé)", confirmAr: "Délai d'appel (ar)", confirmFr: "Délai d'appel (fr)", delivAr: "Délai de livraison (ar)", delivFr: "Délai de livraison (fr)", origin: "Wilaya d'expédition (entrepôt)", canOpen: "Autoriser l'ouverture du colis avant paiement", fb: "Facebook Pixel ID", tt: "TikTok Pixel ID", maxDay: "Commandes max. par numéro et par jour", myPass: "Mon mot de passe", current: "Mot de passe actuel" },
      ago: { m: "il y a {n} min", h: "il y a {n} h", d: "il y a {n} j" }, newOrderToast: "Nouvelle commande : {n}"
    }
  };
  var t = (A.t = A.L[lang]);

  /* ---------- helpers ---------- */
  A.esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  A.fill = function (s, v) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ""; }); };
  A.money = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + (lang === "ar" ? "دج" : "DA"); };
  A.pct = function (a, b) { return b ? Math.round(a / b * 100) + "%" : "—"; };
  A.tx = function (o) { return o && typeof o === "object" ? (o[lang] || o.ar || o.fr || "") : (o || ""); };
  A.dt = function (ms) { if (!ms) return ""; var d = new Date(ms); return d.toLocaleDateString(lang === "ar" ? "ar-DZ-u-nu-latn" : "fr-FR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); };
  A.ago = function (ms) { var m = Math.max(0, Math.round((Date.now() - ms) / 60000)); return m < 60 ? A.fill(t.ago.m, { n: m }) : m < 1440 ? A.fill(t.ago.h, { n: Math.round(m / 60) }) : A.fill(t.ago.d, { n: Math.round(m / 1440) }); };
  A.st = function (s, map, cls) { return '<span class="st ' + A.esc(cls || s) + '">' + A.esc((map || t.st)[s] || s) + '</span>'; };
  A.waNum = function (p) { return "213" + String(p).replace(/^0/, ""); };
  A.wilaya = function (c) { return (A.GEO ? A.GEO.wilayas : []).filter(function (w) { return w.c === Number(c); })[0]; };
  A.wname = function (c) { var w = A.wilaya(c); return w ? (lang === "ar" ? w.a : w.n) : String(c || ""); };
  A.wilayaOptions = function (sel) { return A.GEO.wilayas.map(function (w) { return '<option value="' + w.c + '"' + (Number(sel) === w.c ? " selected" : "") + '>' + (w.c < 10 ? "0" : "") + w.c + " - " + A.esc(lang === "ar" ? w.a : w.n) + '</option>'; }).join(""); };
  A.communeOptions = function (code, sel) {
    var list = A.GEO.communes[String(code)] || [], found = false;
    var html = list.map(function (c) { if (c[0] === sel) found = true; return '<option value="' + A.esc(c[0]) + '"' + (c[0] === sel ? " selected" : "") + '>' + A.esc(lang === "ar" ? (c[1] || c[0]) : c[0]) + '</option>'; }).join("");
    return (sel && !found ? '<option value="' + A.esc(sel) + '" selected>' + A.esc(sel) + '</option>' : "") + html;
  };
  var ICONS = {
    phone: '<path d="M5 4h4l1.5 4.5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5L20 15v4a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>', chat: '<path d="M4 20l1.5-4A8 8 0 1 1 9 19.2z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', cart: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>', tag: '<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>', truck: '<path d="M3 6h11v10H3zM14 9.5h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    team: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', plus: '<path d="M5 12h14M12 5v14"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', send: '<path d="M4 12 20 4l-6 16-3-7z"/>'
  };
  A.ic = function (n, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>'; };

  A.flash = function (msg, bad) {
    var n = document.createElement("div"); n.className = "toast"; n.setAttribute("role", "status"); n.textContent = msg; if (bad) n.style.background = "#8A1F3D";
    document.body.appendChild(n); requestAnimationFrame(function () { n.classList.add("show"); });
    setTimeout(function () { n.classList.remove("show"); setTimeout(function () { n.remove(); }, 500); }, bad ? 4200 : 1900);
  };
  A.errMsg = function (e) { return (e && e.data && (e.data.message || e.data)) || (e && e.message ? String(e.message).replace(/^.*Uncaught (ConvexError|Error): /, "").split("\n")[0] : "Error"); };

  /* ---------- Convex ---------- */
  var client = null;
  A.token = lsGet("ronaq_admin_token", "");
  function withToken(args) { return Object.assign({ token: A.token }, args || {}); }
  A.q = function (name, args) { return client.query(name, withToken(args)); };
  A.m = function (name, args) { return client.mutation(name, withToken(args)); };
  A.a = function (name, args) { return client.action(name, withToken(args)); };
  /** Mutation/action with feedback. */
  A.run = function (kind, name, args, okMsg) {
    var p = kind === "a" ? A.a(name, args) : A.m(name, args);
    return p.then(function (r) { if (okMsg !== false) A.flash(okMsg || t.saved); return r; }, function (e) { A.flash(A.errMsg(e), true); throw e; });
  };
  var subs = [];
  /** Live query bound to the current view (unsubscribed on navigation). */
  A.live = function (name, args, cb, keep) {
    var un = client.onUpdate(name, withToken(args), cb, function (e) { if (/unauth|Session|signed/i.test(A.errMsg(e))) { A.logout(); } else A.flash(A.errMsg(e), true); });
    if (!keep) subs.push(un);
    return un;
  };
  function unsubAll() { subs.forEach(function (u) { try { u(); } catch (e) {} }); subs = []; }
  A.site = (CFG.convexSite || "").replace(/\/+$/, "");

  /* ---------- confirm dialog (built-in, no window.confirm) ---------- */
  A.ask = function (text) {
    return new Promise(function (resolve) {
      var d = document.createElement("div");
      d.className = "scrim show"; d.style.zIndex = 95; d.style.display = "flex"; d.style.alignItems = "center"; d.style.justifyContent = "center";
      d.innerHTML = '<div class="panel" role="alertdialog" aria-modal="true" style="max-width:420px;width:calc(100% - 32px);display:flex;flex-direction:column;gap:14px"><b style="font-size:17px">' + A.esc(text || t.confirmQ) + '</b><div class="acts"><button class="abtn red" type="button" data-y>' + t.yes + '</button><button class="abtn" type="button" data-n>' + t.cancel + '</button></div></div>';
      document.body.appendChild(d);
      var done = function (v) { d.remove(); resolve(v); };
      d.querySelector("[data-y]").onclick = function () { done(true); };
      d.querySelector("[data-n]").onclick = function () { done(false); };
      d.onclick = function (e) { if (e.target === d) done(false); };
      d.querySelector("[data-n]").focus();
    });
  };

  /* ---------- drawer ---------- */
  var drawerUnsub = null, lastFocus = null;
  A.drawer = function (html, onClose) {
    var dr = document.querySelector(".drawer"), sc = document.querySelector(".scrim.base");
    if (!dr.classList.contains("show")) lastFocus = document.activeElement;
    dr.innerHTML = html; dr.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { dr.classList.add("show"); sc.classList.add("show"); });
    var x = dr.querySelector(".x"); if (x) x.onclick = A.closeDrawer;
    dr._onClose = onClose;
    return dr;
  };
  A.drawerLive = function (un) { if (drawerUnsub) try { drawerUnsub(); } catch (e) {} drawerUnsub = un; };
  A.closeDrawer = function () {
    var dr = document.querySelector(".drawer"), sc = document.querySelector(".scrim.base"); if (!dr) return;
    dr.classList.remove("show"); sc.classList.remove("show"); dr.setAttribute("aria-hidden", "true");
    if (drawerUnsub) { try { drawerUnsub(); } catch (e) {} drawerUnsub = null; }
    if (dr._onClose) dr._onClose();
    if (lastFocus) try { lastFocus.focus(); } catch (e) {}
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") A.closeDrawer(); });

  /* ---------- shell ---------- */
  A.views = {}; // filled by admin-*.js
  var TABS = [["dash", "grid", "view"], ["orders", "list", "view"], ["abandoned", "cart", "view"], ["customers", "users", "view"], ["products", "tag", "catalog"], ["stock", "box", "view"], ["delivery", "truck", "view"], ["team", "team", "team"], ["settings", "gear", "view"]];
  var root, counts = {};
  A.state = { tab: "dash" };
  A.go = function (tab, extra) { A.state.tab = tab; A.state.extra = extra || null; try { history.replaceState(null, "", "#" + tab); } catch (e) {} render(); };
  A.can = function (perm) { return A.me && A.me.perms.indexOf(perm) >= 0; };

  function tabsHTML() {
    return TABS.filter(function (x) { return A.can(x[2]); }).map(function (x) {
      var c = x[0] === "orders" ? counts["new"] : x[0] === "abandoned" ? counts.abandoned : 0;
      return '<button class="tab" type="button" data-tab="' + x[0] + '"' + (A.state.tab === x[0] ? ' aria-current="page"' : "") + '>' + A.ic(x[1]) + '<span>' + t.tabs[x[0]] + '</span>' + (c ? '<span class="cnt">' + c + '</span>' : "") + '</button>';
    }).join("");
  }
  function paintTabs() {
    document.querySelectorAll(".side .tabs, .mobtabs").forEach(function (el) { el.innerHTML = tabsHTML(); });
    document.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { A.closeDrawer(); A.go(b.getAttribute("data-tab")); }; });
  }
  function render() {
    unsubAll(); A.closeDrawer();
    paintTabs();
    var v = document.getElementById("view");
    v.innerHTML = '<p class="muted">' + t.loading + '</p>';
    (A.views[A.state.tab] || A.views.dash)(v);
  }
  A.top = function (title, extra) { return '<div class="top"><h1>' + title + '</h1><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (extra || "") + '</div></div>'; };

  function shell() {
    root.innerHTML = '<div class="ad"><aside class="side"><a class="logo" href="index.html" target="_blank"><svg width="26" height="31" viewBox="0 0 34 40" aria-hidden="true"><path d="M3 38V17a14 14 0 0 1 28 0v21z" fill="#B23A5E"/><path d="M17 16v12M11 22h12" stroke="#2B1520" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>' + A.esc(A.storeName || "Ronaq") + '</b><small>' + t.title + '</small></span></a>' +
      '<div class="tabs" style="display:flex;flex-direction:column;gap:6px"></div>' +
      '<div class="foot"><span>' + A.esc(A.me.name) + ' · ' + t.roles[A.me.role] + '</span><button type="button" data-lang>' + t.switchLang + '</button><a href="index.html" target="_blank" rel="noopener">' + t.store + '</a><button type="button" data-logout>' + t.logout + '</button></div></aside>' +
      '<div style="min-width:0"><nav class="mobtabs"></nav><main class="main" id="view"></main></div></div><div class="scrim base"></div><aside class="drawer" aria-hidden="true" role="dialog" aria-modal="true"></aside>';
    root.querySelector("[data-lang]").onclick = function () { lsSet("ronaq_admin_lang", lang === "ar" ? "fr" : "ar"); location.reload(); };
    root.querySelector("[data-logout]").onclick = A.logout;
    root.querySelector(".scrim.base").onclick = A.closeDrawer;
    // Live badge counts + new-order alert
    var firstNew = null;
    A.live("orders:counts", {}, function (c) {
      if (firstNew !== null && c["new"] > firstNew) { A.flash(A.fill(t.newOrderToast, { n: c["new"] })); beep(); }
      firstNew = c["new"]; counts = c; A.counts = c; paintTabs();
    }, true);
    var h = location.hash.replace("#", "");
    A.go(TABS.some(function (x) { return x[0] === h && A.can(x[2]); }) ? h : "dash");
  }
  var audioCtx = null;
  document.addEventListener("pointerdown", function () { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }, { once: true });
  function beep() {
    if (!audioCtx) return;
    try { var o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.value = 0.06; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.18); } catch (e) {}
  }

  A.logout = function () {
    var tok = A.token; A.token = ""; lsSet("ronaq_admin_token", "");
    if (client && tok) client.mutation("auth:logout", { token: tok }).catch(function () {});
    loginView();
  };
  function loginView(err) {
    unsubAll();
    root.innerHTML = '<div class="login"><form class="panel" novalidate><h1 class="disp" style="margin:0;font-size:28px">' + t.login + '</h1>' + (err ? '<div class="alert">' + A.esc(err) + '</div>' : "") +
      '<div class="f"><label for="em">' + t.email + '</label><input id="em" type="email" autocomplete="username" required></div>' +
      '<div class="f"><label for="pw">' + t.password + '</label><input id="pw" type="password" autocomplete="current-password" required></div><button class="btn lg" type="submit">' + t.enter + '</button></form></div>';
    var f = root.querySelector("form");
    f.onsubmit = function (e) {
      e.preventDefault(); var b = f.querySelector("button"); b.disabled = true;
      client.action("authNode:login", { email: f.em.value, password: f.pw.value }).then(function (r) {
        A.token = r.token; lsSet("ronaq_admin_token", r.token); boot();
      }, function (e2) { loginView(A.errMsg(e2)); });
    };
    setTimeout(function () { var em = root.querySelector("#em"); if (em) em.focus(); }, 50);
  }
  function boot() {
    root.innerHTML = '<p style="padding:40px;text-align:center">' + t.loading + '</p>';
    Promise.all([client.query("auth:me", { token: A.token }), fetch("data/geo.json").then(function (r) { return r.json(); })]).then(function (r) {
      A.me = r[0]; A.GEO = r[1];
      if (!A.me) return loginView();
      return A.q("settings:get", {}).then(function (s) { A.settings = s; A.storeName = A.tx(s.name); shell(); });
    }).catch(function (e) { loginView(A.errMsg(e)); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    root = document.getElementById("admin");
    if (!CFG.convexUrl || !window.convex) {
      root.innerHTML = '<div class="login"><div class="panel" style="max-width:520px"><h1 class="disp" style="margin:0 0 10px;font-size:26px">' + t.setupTitle + '</h1><p style="margin:0;line-height:1.8;color:var(--soft)">' + t.setupText + '</p></div></div>';
      return;
    }
    client = new window.convex.ConvexClient(CFG.convexUrl);
    A.client = client;
    if (!A.token) loginView(); else boot();
  });
})();
