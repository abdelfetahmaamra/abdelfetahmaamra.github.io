/* Ronaq El Hayat — storefront (vanilla JS, talks to the Convex HTTP API) */
(function () {
  "use strict";
  var CFG = window.RONAQ || {};
  var SITE = (CFG.convexSite || "").replace(/\/+$/, "");
  var DEMO = !SITE;

  /* ---------- performance: slow network / low-end phone ---------- */
  var conn = navigator.connection || {};
  var LITE = !!(conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || "") || (navigator.deviceMemory && navigator.deviceMemory <= 2));
  if (LITE) document.documentElement.classList.add("lite");
  if (SITE) { var pc = document.createElement("link"); pc.rel = "preconnect"; pc.href = SITE; pc.crossOrigin = ""; document.head.appendChild(pc); }
  if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude|usercontent/.test(location.hostname)) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  /* ---------- storage (never throws) ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ssGet(k, d) { try { var v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- i18n ---------- */
  var I18N = {
    ar: {
      top1: "الدفع عند الاستلام", top2: "التوصيل إلى 69 ولاية", top3: "للطلب عبر الهاتف:",
      all: "الكل", cart: "السلة", langLabel: "اللغة",
      kicker: "بارافارماسي نسائية · الجزائر",
      heroTitle: "منتجات العناية والبارافارماسي، تصلكِ إلى باب بيتكِ",
      heroText: "العناية بالبشرة والشعر، النظافة الحميمة والمكملات الغذائية. اطلبي في دقيقة، نتصل بكِ للتأكيد، وتدفعين عند الاستلام.",
      heroCta: "تصفحي المنتجات", heroCta2: "كيف تطلبين؟",
      badge1: "ادفعي عند الاستلام", badge1s: "نقداً لعامل التوصيل", badge2: "69 ولاية",
      trust: [["الدفع عند الاستلام", "بدون بطاقة بنكية"], ["69 ولاية", "إلى المنزل أو مكتب التوصيل"], ["تأكيد عبر الهاتف", "قبل كل إرسال"], ["تغليف سري", "بدون أي إشارة للمحتوى"]],
      catTitle: "منتجاتنا", catSub: "اختاري، اطلبي، وادفعي عند الاستلام.",
      buy: "اطلبي", addCart: "أضيفي إلى السلة", added: "أُضيف إلى السلة", viewCart: "عرض السلة", out: "نفد المخزون",
      stepsTitle: "كيف تطلبين؟",
      steps: [["املئي الاستمارة", "الاسم، رقم الهاتف والولاية فقط."], ["نتصل بكِ", "لتأكيد طلبكِ خلال {confirm}."], ["استلمي وادفعي", "نقداً عند وصول الطرد."]],
      orderTitle: "اطلبي الآن", orderSub: "الدفع نقداً عند الاستلام",
      lQty: "الكمية", lMode: "طريقة التوصيل", home: "إلى المنزل", desk: "مكتب التوصيل", notOffered: "غير متاح",
      sub: "المنتجات", ship: "التوصيل", total: "المبلغ الإجمالي", free: "مجاني",
      lName: "الاسم واللقب", phName: "مثال: أمينة بن علي", lPhone: "رقم الهاتف",
      lWilaya: "الولاية", chooseW: "اختاري الولاية", lCommune: "البلدية", chooseC: "اختاري البلدية", otherC: "بلدية أخرى…", phCommune: "اكتبي اسم البلدية",
      lDesk: "مكتب الاستلام", chooseD: "سنقترح عليكِ الأقرب عند الاتصال", lAddress: "العنوان", optional: "اختياري", phAddress: "الشارع، الحي، رقم العمارة",
      submit: "تأكيد الطلب", sending: "جارٍ الإرسال…", payNote: "لن تدفعي أي شيء الآن. سنتصل بكِ للتأكيد.",
      errName: "يرجى إدخال الاسم واللقب.", errPhone: "رقم غير صحيح. مثال: 0550 12 34 56", errWilaya: "يرجى اختيار الولاية.", errCommune: "يرجى اختيار البلدية.",
      errs: {
        limit: "استقبلنا عدة طلبات من هذا الرقم اليوم. اتصلي بنا لإضافة طلب جديد.", out_of_stock: "عذراً، أحد المنتجات نفد من المخزون.", product: "أحد المنتجات لم يعد متوفراً. حدّثي الصفحة.",
        mode_unavailable: "طريقة التوصيل هذه غير متاحة لولايتكِ. اختاري الأخرى.", blocked: "تعذّر تسجيل الطلب. اتصلي بنا من فضلكِ.", net: "تعذّر إرسال الطلب. تحققي من الإنترنت وأعيدي المحاولة، أو أرسليه عبر WhatsApp."
      },
      cartTitle: "سلتكِ", cartEmpty: "سلتكِ فارغة", cartEmptySub: "أضيفي منتجاتكِ المفضلة ثم عودي هنا لإتمام الطلب.",
      continueShop: "مواصلة التسوق", remove: "حذف", items: "منتجات",
      freeLeft: "باقي {x} للتوصيل المجاني", freeOk: "التوصيل مجاني لطلبكِ!",
      thanksTitle: "شكراً، تم استلام طلبكِ!", thanksText: "سنتصل بكِ على الرقم {phone} خلال {confirm} لتأكيد الطلب. حضّري مبلغ {total} نقداً لعامل التوصيل.",
      orderNo: "رقم الطلب", recap: "ملخص الطلب", waBtn: "أرسلي الطلب عبر WhatsApp", backShop: "العودة إلى المتجر",
      waIntro: "السلام عليكم، أريد تأكيد طلبي", delivery: "التوصيل", eta: "مدة التوصيل المتوقعة: {d}",
      benefits: "المميزات", usage: "طريقة الاستعمال", faqTitle: "أسئلة شائعة",
      faq: [["متى يصلني الطلب؟", "خلال {delivery} حسب ولايتكِ، بعد التأكيد عبر الهاتف."], ["كم سعر التوصيل؟", "يظهر السعر تلقائياً في الاستمارة حسب الولاية وطريقة التوصيل."], ["هل الدفع آمن؟", "لا تدفعين أي شيء عبر الإنترنت. تدفعين نقداً فقط عند استلام الطرد."]],
      sticky: "اطلبي الآن", notFound: "المنتج غير موجود.", loading: "جارٍ التحميل…", loadErr: "تعذّر تحميل المتجر. أعيدي تحميل الصفحة.",
      about: "بارافارماسي على الإنترنت للمرأة في الجزائر. الدفع عند الاستلام في كل الولايات.",
      fShop: "المتجر", fHelp: "المساعدة", fContact: "اتصلي بنا", fHow: "كيف تطلبين",
      disclaimer: "المعلومات المقدمة لا تغني عن استشارة الطبيب أو الصيدلي.",
      demo: "وضع التجربة: المتجر غير مربوط بقاعدة البيانات بعد، والطلبات لا تُرسل."
    },
    fr: {
      top1: "Paiement à la livraison", top2: "Livraison dans les 69 wilayas", top3: "Commande par téléphone :",
      all: "Tout", cart: "Panier", langLabel: "Langue",
      kicker: "Parapharmacie féminine · Algérie",
      heroTitle: "Vos soins de parapharmacie, livrés jusqu'à votre porte",
      heroText: "Soins visage, cheveux, hygiène intime et compléments. Commandez en une minute, on vous appelle pour confirmer, vous payez à la réception.",
      heroCta: "Voir les produits", heroCta2: "Comment commander ?",
      badge1: "Payez à la réception", badge1s: "En espèces, au livreur", badge2: "69 wilayas",
      trust: [["Paiement à la livraison", "Aucune carte bancaire"], ["69 wilayas", "À domicile ou en stop desk"], ["Confirmation par appel", "Avant chaque envoi"], ["Emballage discret", "Aucune mention du contenu"]],
      catTitle: "Nos produits", catSub: "Choisissez, commandez, payez à la livraison.",
      buy: "Commander", addCart: "Ajouter au panier", added: "Ajouté au panier", viewCart: "Voir le panier", out: "Rupture de stock",
      stepsTitle: "Comment commander ?",
      steps: [["Remplissez le formulaire", "Nom, téléphone et wilaya, c'est tout."], ["On vous appelle", "Pour confirmer votre commande sous {confirm}."], ["Recevez et payez", "En espèces, à l'arrivée du colis."]],
      orderTitle: "Commandez maintenant", orderSub: "Paiement en espèces à la réception",
      lQty: "Quantité", lMode: "Mode de livraison", home: "À domicile", desk: "Stop desk", notOffered: "Indisponible",
      sub: "Produits", ship: "Livraison", total: "Total à payer", free: "Gratuite",
      lName: "Nom et prénom", phName: "Ex. Amina Benali", lPhone: "Téléphone",
      lWilaya: "Wilaya", chooseW: "Choisissez la wilaya", lCommune: "Commune", chooseC: "Choisissez la commune", otherC: "Autre commune…", phCommune: "Nom de la commune",
      lDesk: "Bureau de retrait", chooseD: "On vous proposera le plus proche par téléphone", lAddress: "Adresse", optional: "facultatif", phAddress: "Rue, cité, n° de bâtiment",
      submit: "Confirmer la commande", sending: "Envoi en cours…", payNote: "Vous ne payez rien maintenant. On vous appelle pour confirmer.",
      errName: "Veuillez saisir votre nom et prénom.", errPhone: "Numéro invalide. Ex. 0550 12 34 56", errWilaya: "Veuillez choisir la wilaya.", errCommune: "Veuillez choisir la commune.",
      errs: {
        limit: "Nous avons déjà reçu plusieurs commandes de ce numéro aujourd'hui. Appelez-nous pour en ajouter une.", out_of_stock: "Désolé, un des produits est en rupture de stock.", product: "Un produit n'est plus disponible. Actualisez la page.",
        mode_unavailable: "Ce mode de livraison n'est pas disponible pour votre wilaya. Choisissez l'autre.", blocked: "Impossible d'enregistrer la commande. Merci de nous appeler.", net: "Impossible d'envoyer la commande. Vérifiez votre connexion et réessayez, ou envoyez-la par WhatsApp."
      },
      cartTitle: "Votre panier", cartEmpty: "Votre panier est vide", cartEmptySub: "Ajoutez vos produits puis revenez ici pour commander.",
      continueShop: "Continuer mes achats", remove: "Retirer", items: "articles",
      freeLeft: "Plus que {x} pour la livraison gratuite", freeOk: "Livraison gratuite pour votre commande !",
      thanksTitle: "Merci, commande reçue !", thanksText: "Nous vous appelons au {phone} sous {confirm} pour confirmer. Préparez {total} en espèces pour le livreur.",
      orderNo: "N° de commande", recap: "Récapitulatif", waBtn: "Envoyer la commande sur WhatsApp", backShop: "Retour à la boutique",
      waIntro: "Bonjour, je souhaite confirmer ma commande", delivery: "Livraison", eta: "Délai de livraison estimé : {d}",
      benefits: "Points forts", usage: "Mode d'emploi", faqTitle: "Questions fréquentes",
      faq: [["Quand vais-je recevoir ma commande ?", "Sous {delivery} selon votre wilaya, après confirmation par téléphone."], ["Combien coûte la livraison ?", "Le prix s'affiche automatiquement dans le formulaire selon votre wilaya et le mode choisi."], ["Le paiement est-il sûr ?", "Vous ne payez rien en ligne. Vous payez uniquement en espèces à la réception du colis."]],
      sticky: "Commander", notFound: "Produit introuvable.", loading: "Chargement…", loadErr: "Impossible de charger la boutique. Rechargez la page.",
      about: "Parapharmacie en ligne pour les femmes en Algérie. Paiement à la livraison dans toutes les wilayas.",
      fShop: "Boutique", fHelp: "Aide", fContact: "Contact", fHow: "Comment commander",
      disclaimer: "Les informations fournies ne remplacent pas l'avis d'un médecin ou d'un pharmacien.",
      demo: "Mode test : la boutique n'est pas encore reliée à la base de données, les commandes ne sont pas envoyées."
    }
  };
  var lang = lsGet("ronaq_lang", null) || CFG.defaultLang || "ar";
  function T() { return I18N[lang]; }
  function tx(o) { return o && typeof o === "object" ? (o[lang] || o.ar || o.fr || "") : (o || ""); }
  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ""; }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + (lang === "ar" ? "دج" : "DA"); }
  function normKey(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`]/g, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }
  document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  function setLang(l) { lsSet("ronaq_lang", l); location.reload(); }

  /* ---------- data ---------- */
  var DATA = null;
  // 69 wilayas inline (3.6 KB); communes load per wilaya only when needed (~1–2 KB each).
  var GEO = { wilayas: [{"c":1,"n":"Adrar","a":"أدرار","s":1,"z":"S"},{"c":2,"n":"Chlef","a":"الشلف","s":2,"z":"N"},{"c":3,"n":"Laghouat","a":"الأغواط","s":3,"z":"N"},{"c":4,"n":"Oum El Bouaghi","a":"أم البواقي","s":4,"z":"N"},{"c":5,"n":"Batna","a":"باتنة","s":5,"z":"N"},{"c":6,"n":"Béjaïa","a":"بجاية","s":6,"z":"N"},{"c":7,"n":"Biskra","a":"بسكرة","s":7,"z":"N"},{"c":8,"n":"Béchar","a":"بشار","s":8,"z":"S"},{"c":9,"n":"Blida","a":"البليدة","s":9,"z":"N"},{"c":10,"n":"Bouira","a":"البويرة","s":10,"z":"N"},{"c":11,"n":"Tamanrasset","a":"تمنراست","s":11,"z":"S"},{"c":12,"n":"Tébessa","a":"تبسة","s":12,"z":"N"},{"c":13,"n":"Tlemcen","a":"تلمسان","s":13,"z":"N"},{"c":14,"n":"Tiaret","a":"تيارت","s":14,"z":"N"},{"c":15,"n":"Tizi Ouzou","a":"تيزي وزو","s":15,"z":"N"},{"c":16,"n":"Alger","a":"الجزائر","s":16,"z":"A"},{"c":17,"n":"Djelfa","a":"الجلفة","s":17,"z":"N"},{"c":18,"n":"Jijel","a":"جيجل","s":18,"z":"N"},{"c":19,"n":"Sétif","a":"سطيف","s":19,"z":"N"},{"c":20,"n":"Saïda","a":"سعيدة","s":20,"z":"N"},{"c":21,"n":"Skikda","a":"سكيكدة","s":21,"z":"N"},{"c":22,"n":"Sidi Bel Abbès","a":"سيدي بلعباس","s":22,"z":"N"},{"c":23,"n":"Annaba","a":"عنابة","s":23,"z":"N"},{"c":24,"n":"Guelma","a":"قالمة","s":24,"z":"N"},{"c":25,"n":"Constantine","a":"قسنطينة","s":25,"z":"N"},{"c":26,"n":"Médéa","a":"المدية","s":26,"z":"N"},{"c":27,"n":"Mostaganem","a":"مستغانم","s":27,"z":"N"},{"c":28,"n":"M'Sila","a":"المسيلة","s":28,"z":"N"},{"c":29,"n":"Mascara","a":"معسكر","s":29,"z":"N"},{"c":30,"n":"Ouargla","a":"ورقلة","s":30,"z":"S"},{"c":31,"n":"Oran","a":"وهران","s":31,"z":"N"},{"c":32,"n":"El Bayadh","a":"البيض","s":32,"z":"S"},{"c":33,"n":"Illizi","a":"إليزي","s":33,"z":"S"},{"c":34,"n":"Bordj Bou Arréridj","a":"برج بوعريريج","s":34,"z":"N"},{"c":35,"n":"Boumerdès","a":"بومرداس","s":35,"z":"N"},{"c":36,"n":"El Tarf","a":"الطارف","s":36,"z":"N"},{"c":37,"n":"Tindouf","a":"تندوف","s":37,"z":"S"},{"c":38,"n":"Tissemsilt","a":"تيسمسيلت","s":38,"z":"N"},{"c":39,"n":"El Oued","a":"الوادي","s":39,"z":"S"},{"c":40,"n":"Khenchela","a":"خنشلة","s":40,"z":"N"},{"c":41,"n":"Souk Ahras","a":"سوق أهراس","s":41,"z":"N"},{"c":42,"n":"Tipaza","a":"تيبازة","s":42,"z":"N"},{"c":43,"n":"Mila","a":"ميلة","s":43,"z":"N"},{"c":44,"n":"Aïn Defla","a":"عين الدفلى","s":44,"z":"N"},{"c":45,"n":"Naâma","a":"النعامة","s":45,"z":"S"},{"c":46,"n":"Aïn Témouchent","a":"عين تموشنت","s":46,"z":"N"},{"c":47,"n":"Ghardaïa","a":"غرداية","s":47,"z":"S"},{"c":48,"n":"Relizane","a":"غليزان","s":48,"z":"N"},{"c":49,"n":"Timimoun","a":"تيميمون","s":49,"z":"S"},{"c":50,"n":"Bordj Badji Mokhtar","a":"برج باجي مختار","s":50,"z":"S"},{"c":51,"n":"Ouled Djellal","a":"أولاد جلال","s":51,"z":"S"},{"c":52,"n":"Béni Abbès","a":"بني عباس","s":52,"z":"S"},{"c":53,"n":"In Salah","a":"عين صالح","s":53,"z":"S"},{"c":54,"n":"In Guezzam","a":"عين قزام","s":54,"z":"S"},{"c":55,"n":"Touggourt","a":"تقرت","s":55,"z":"S"},{"c":56,"n":"Djanet","a":"جانت","s":56,"z":"S"},{"c":57,"n":"El M'Ghair","a":"المغير","s":57,"z":"S"},{"c":58,"n":"El Meniaa","a":"المنيعة","s":58,"z":"S"},{"c":59,"n":"Aflou","a":"أفلو","s":3,"z":"N"},{"c":60,"n":"Barika","a":"بريكة","s":5,"z":"N"},{"c":61,"n":"El Kantara","a":"القنطرة","s":7,"z":"N"},{"c":62,"n":"Bir El Ater","a":"بئر العاتر","s":12,"z":"N"},{"c":63,"n":"El Aricha","a":"العريشة","s":13,"z":"N"},{"c":64,"n":"Ksar Chellala","a":"قصر الشلالة","s":14,"z":"N"},{"c":65,"n":"Aïn Ouessara","a":"عين وسارة","s":17,"z":"N"},{"c":66,"n":"Messaad","a":"مسعد","s":17,"z":"N"},{"c":67,"n":"Ksar El Boukhari","a":"قصر البخاري","s":26,"z":"N"},{"c":68,"n":"Bou Saâda","a":"بوسعادة","s":28,"z":"N"},{"c":69,"n":"El Abiodh Sidi Cheikh","a":"الأبيض سيدي الشيخ","s":32,"z":"S"}], communes: {} };
  function getJSON(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 15000) : 0;
    return fetch(url, { credentials: "omit", signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(timer); if (!r.ok) throw new Error(r.status); return r.json(); }, function (e) { clearTimeout(timer); throw e; });
  }
  function communes(code) {
    if (GEO.communes[code]) return Promise.resolve(GEO.communes[code]);
    return getJSON("data/communes/" + code + ".json", 12000).then(function (l) { GEO.communes[code] = l; return l; });
  }
  /** Stale-while-revalidate: show the last catalog instantly, refresh it in the background. */
  var CACHE_KEY = "ronaq_sf_v2";
  function loadAll() {
    var cached = lsGet(CACHE_KEY, null), url = DEMO ? "data/demo.json" : SITE + "/api/storefront";
    var fresh = function () { return getJSON(url, 15000).then(function (d) { lsSet(CACHE_KEY, { at: Date.now(), d: d }); return d; }); };
    if (cached && cached.d) {
      if (Date.now() - cached.at > 60000) fresh().catch(function () {});
      DATA = cached.d; return Promise.resolve();
    }
    return fresh().then(function (d) { DATA = d; });
  }
  function S() { return DATA.store; }
  function product(id) { return DATA.products.filter(function (p) { return p.id === id || p.slug === id; })[0]; }
  function catName(slug) { var c = DATA.categories.filter(function (x) { return x.slug === slug; })[0]; return c ? tx(c.name) : ""; }
  function wilaya(code) { return GEO.wilayas.filter(function (w) { return w.c === Number(code); })[0]; }
  function wName(w) { return w ? (lang === "ar" ? w.a : w.n) : ""; }

  /** Same rule as the server: commune override > wilaya override > zone default; null = not offered. */
  function quote(code, commune, mode, subtotal) {
    var w = wilaya(code); if (!w) return null;
    var key = normKey(commune), fee;
    var rows = DATA.rates.filter(function (r) { return r.w === w.c; });
    var cr = commune ? rows.filter(function (r) { return r.c && normKey(r.c) === key; })[0] : null;
    var wr = rows.filter(function (r) { return !r.c; })[0];
    var src = cr || wr;
    if (src) fee = mode === "home" ? src.h : src.d; else fee = S().zoneFees[w.z][mode];
    if (fee == null) return null;
    if (S().freeShippingFrom > 0 && subtotal >= S().freeShippingFrom) return 0;
    return fee;
  }

  /* ---------- art & icons ---------- */
  var TINTS = { rose: ["#E7B7B9", "#8E3150", "#F6E4E2"], sage: ["#BFD3CA", "#1E5A55", "#E3EDE8"], sand: ["#E8D2B0", "#7A5230", "#F3E9DA"], plum: ["#CDB6D6", "#4B2A56", "#ECE2F0"], sky: ["#BCD2E0", "#2D4F6B", "#E1EBF1"] };
  function tint(p) { return TINTS[p.tint] || TINTS.rose; }
  function art(p, w) {
    var t = tint(p), a = t[0], b = t[1], h = Math.round(w * 4 / 3), body;
    var lbl = function (y, hh) { return '<rect x="40" y="' + y + '" width="40" height="' + hh + '" rx="4" fill="#fff" opacity=".85"/><rect x="46" y="' + (y + 10) + '" width="28" height="4" rx="2" fill="' + b + '" opacity=".7"/><rect x="46" y="' + (y + 20) + '" width="20" height="3" rx="1.5" fill="' + b + '" opacity=".4"/>'; };
    if (p.shape === "jar") body = '<rect x="22" y="62" width="76" height="24" rx="7" fill="' + b + '"/><rect x="18" y="82" width="84" height="68" rx="18" fill="' + a + '"/><rect x="32" y="100" width="56" height="30" rx="4" fill="#fff" opacity=".85"/>';
    else if (p.shape === "tube") body = '<rect x="56" y="4" width="10" height="20" rx="2" fill="' + b + '"/><rect x="56" y="4" width="30" height="8" rx="4" fill="' + b + '"/><rect x="44" y="22" width="32" height="18" rx="5" fill="' + b + '"/><rect x="30" y="38" width="60" height="112" rx="20" fill="' + a + '"/>' + lbl(74, 48);
    else body = '<rect x="50" y="6" width="20" height="34" rx="6" fill="' + b + '"/><rect x="46" y="36" width="28" height="12" rx="3" fill="' + b + '"/><rect x="32" y="46" width="56" height="104" rx="16" fill="' + a + '"/>' + lbl(78, 44);
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 120 160" aria-hidden="true">' + body + '</svg>';
  }
  function visual(p, w, eager) { return p.images && p.images.length ? '<img src="' + esc(p.images[0]) + '" alt="' + esc(tx(p.name)) + '" width="400" height="420" decoding="async"' + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + '>' : art(p, w); }
  var IC = {
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
    truck: '<path d="M3 6h11v10H3zM14 9.5h4l3 3.5V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    phone: '<path d="M5 4h4l1.5 4.5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5L20 15v4a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', plus: '<path d="M5 12h14M12 5v14"/>', minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', chat: '<path d="M4 20l1.5-4A8 8 0 1 1 9 19.2z"/>'
  };
  function ic(n, s, extra) { return '<svg ' + (extra || "") + ' width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  function logo(s) { return '<svg width="' + s + '" height="' + Math.round(s * 1.18) + '" viewBox="0 0 34 40" aria-hidden="true"><path d="M3 38V17a14 14 0 0 1 28 0v21z" fill="#B23A5E"/><path d="M17 16v12M11 22h12" stroke="#FBF5F1" stroke-width="2.6" stroke-linecap="round"/></svg>'; }
  function sparkle(l, t, s, c, cls) { return '<svg class="twinkle ' + (cls || "") + '" style="left:' + l + ';top:' + t + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c.8 5.6 5.4 10.2 11 11-5.6.8-10.2 5.4-11 11-.8-5.6-5.4-10.2-11-11C6.6 11.2 11.2 6.6 12 1z" fill="' + c + '"/></svg>'; }
  var PATTERN = '<svg class="pat" aria-hidden="true"><defs><pattern id="zl" width="48" height="48" patternUnits="userSpaceOnUse"><rect x="14" y="14" width="20" height="20" fill="none" stroke="#B23A5E" stroke-opacity=".15"/><rect x="14" y="14" width="20" height="20" fill="none" stroke="#B23A5E" stroke-opacity=".15" transform="rotate(45 24 24)"/></pattern></defs><rect width="100%" height="100%" fill="url(#zl)"/></svg>';

  /* ---------- cart ---------- */
  var Cart = {
    get: function () { return lsGet("ronaq_cart", []).filter(function (l) { var p = product(l.id); return p && p.inStock; }); },
    set: function (c) { lsSet("ronaq_cart", c); Cart.badge(true); },
    add: function (id, q) {
      var c = Cart.get(), f = c.filter(function (l) { return l.id === id; })[0];
      if (f) f.qty = Math.min(10, f.qty + (q || 1)); else c.push({ id: id, qty: q || 1 });
      Cart.set(c); var p = product(id); track("AddToCart", { value: p.price * (q || 1), ids: [id] });
    },
    qty: function (id, q) { var c = Cart.get(); c.forEach(function (l) { if (l.id === id) l.qty = Math.max(1, Math.min(10, q)); }); Cart.set(c); },
    remove: function (id) { Cart.set(Cart.get().filter(function (l) { return l.id !== id; })); },
    count: function () { return Cart.get().reduce(function (s, l) { return s + l.qty; }, 0); },
    badge: function (anim) {
      var n = DATA ? Cart.count() : 0;
      document.querySelectorAll(".cartbtn .n").forEach(function (el) { el.textContent = n ? n : ""; if (anim) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); } });
    }
  };

  /* ---------- attribution & pixels ---------- */
  function cookie(n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : undefined; }
  (function () {
    var q = new URLSearchParams(location.search), src = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "ttclid"].forEach(function (k) { if (q.get(k)) src[k] = q.get(k); });
    if (Object.keys(src).length) { src.landing = location.href.slice(0, 300); src.at = Date.now(); lsSet("ronaq_src", src); }
  })();
  function attribution() {
    var s = lsGet("ronaq_src", {}); if (s.at && Date.now() - s.at > 7 * 864e5) s = {};
    var fbc = cookie("_fbc") || (s.fbclid ? "fb.1." + (s.at || Date.now()) + "." + s.fbclid : undefined);
    return { utm_source: s.utm_source, utm_medium: s.utm_medium, utm_campaign: s.utm_campaign, utm_content: s.utm_content, fbclid: s.fbclid, ttclid: s.ttclid, landing: s.landing, fbc: fbc, fbp: cookie("_fbp"), page: location.href.slice(0, 300) };
  }
  function initPixels() {
    var fb = S().fbPixelId, tt = S().tiktokPixelId;
    if (fb) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", fb); window.fbq("track", "PageView");
    }
    if (tt) {
      !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.load = function (e) { var n = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = n; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); var o = d.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = n + "?sdkid=" + e + "&lib=" + t; var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a); }; ttq.load(tt); ttq.page(); }(window, document, "ttq");
    }
  }
  var TT = { ViewContent: "ViewContent", AddToCart: "AddToCart", InitiateCheckout: "InitiateCheckout", Lead: "PlaceAnOrder" };
  function track(ev, d) {
    d = d || {};
    var pl = { value: d.value || 0, currency: "DZD", content_ids: d.ids || [], content_type: "product" };
    try { if (window.fbq) window.fbq("track", ev, pl, d.eventID ? { eventID: d.eventID } : undefined); } catch (e) {}
    try { if (window.ttq) window.ttq.track(TT[ev] || ev, { value: pl.value, currency: "DZD", contents: (d.ids || []).map(function (id) { return { content_id: id }; }) }, d.eventID ? { event_id: d.eventID } : undefined); } catch (e) {}
  }

  /* ---------- API ---------- */
  function post(path, body, beacon) {
    if (DEMO) return Promise.resolve(path === "/api/order" ? demoOrder(body) : { ok: true });
    var payload = JSON.stringify(body);
    if (beacon && navigator.sendBeacon) { try { navigator.sendBeacon(SITE + path, new Blob([payload], { type: "text/plain" })); return Promise.resolve({ ok: true }); } catch (e) {} }
    var attempt = function (n) {
      var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : 0;
      return fetch(SITE + path, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: payload, keepalive: !!beacon, signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(timer); return r.json().catch(function () { return { ok: false, error: "net" }; }); },
          function () { clearTimeout(timer); if (n > 0) return new Promise(function (res) { setTimeout(res, 1500); }).then(function () { return attempt(n - 1); }); return { ok: false, error: "net" }; });
    };
    return attempt(beacon ? 0 : 1);
  }
  function demoOrder(b) {
    var items = b.items.map(function (l) { var p = product(l.productId); return { productId: p.id, name: p.name.fr, qty: l.qty, price: p.price }; });
    var sub = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0), fee = quote(b.wilayaCode, b.commune, b.mode, sub) || 0;
    return { ok: true, number: "RQ-DEMO" + Math.floor(Math.random() * 9000 + 1000), subtotal: sub, shipping: fee, total: sub + fee, items: items };
  }

  /* ---------- UI helpers ---------- */
  var toastEl, toastT;
  function toast(html) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.innerHTML = html; requestAnimationFrame(function () { toastEl.classList.add("show"); });
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 3200);
  }
  function reveal() {
    var els = document.querySelectorAll(".rv:not(.in)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
    els.forEach(function (e) { io.observe(e); });
  }
  function cleanPhone(v) { return String(v).replace(/[\s.\-()]/g, "").replace(/^\+213/, "0").replace(/^00213/, "0"); }
  function validPhone(v) { return /^0[567]\d{8}$/.test(cleanPhone(v)); }

  /* ---------- layout ---------- */
  function header() {
    var t = T(), el = document.getElementById("hdr"); if (!el) return;
    var navCats = DATA.categories.filter(function (c) { return !c.parent; }).slice(0, 6);
    el.outerHTML =
      '<div class="topbar"><span class="i">' + ic("cash", 16) + t.top1 + '</span><span class="i">' + ic("truck", 16) + t.top2 + '</span><span class="i">' + ic("phone", 16) + t.top3 + ' <span dir="ltr">' + esc(S().phone) + '</span></span><span class="rot" aria-live="polite"></span></div>' +
      '<header class="hdr"><div class="wrap"><a class="logo" href="index.html">' + logo(28) + '<span><b>' + esc(tx(S().name)) + '</b><small>' + esc(tx(S().tagline)) + '</small></span></a>' +
      '<nav class="nav" aria-label="' + t.catTitle + '">' + navCats.map(function (c) { return '<a href="index.html?cat=' + encodeURIComponent(c.slug) + '#catalog">' + esc(tx(c.name)) + '</a>'; }).join("") + '</nav>' +
      '<div class="hdr-r"><div class="lang" role="group" aria-label="' + t.langLabel + '"><button type="button" data-lang="ar" aria-pressed="' + (lang === "ar") + '">ع</button><button type="button" data-lang="fr" aria-pressed="' + (lang === "fr") + '">FR</button></div>' +
      '<a class="cartbtn" href="cart.html" aria-label="' + t.cart + '">' + ic("bag", 22) + '<span class="n"></span></a></div></div></header>';
    document.querySelectorAll("[data-lang]").forEach(function (b) { b.onclick = function () { setLang(b.getAttribute("data-lang")); }; });
    var rot = document.querySelector(".topbar .rot"), msgs = [t.top1, t.top2, t.top3 + " " + S().phone], i = 0;
    if (rot) { rot.textContent = msgs[0]; setInterval(function () { i = (i + 1) % msgs.length; rot.textContent = msgs[i]; if (rot.animate) rot.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 400 }); }, 3200); }
    Cart.badge();
    var hdr = document.querySelector(".hdr"), ticking = false;
    window.addEventListener("scroll", function () { if (ticking) return; ticking = true; requestAnimationFrame(function () { hdr.classList.toggle("scrolled", window.scrollY > 8); ticking = false; }); }, { passive: true });
    if (DEMO) { var d = document.createElement("div"); d.style.cssText = "background:#FFF4D6;color:#5C4300;font-size:13px;text-align:center;padding:6px 16px"; d.textContent = t.demo; document.body.insertBefore(d, document.body.firstChild); }
  }
  function footer() {
    var t = T(), el = document.getElementById("ftr"); if (!el) return;
    var wa = String(S().whatsapp || "").replace(/\D/g, "");
    el.outerHTML = '<footer class="ftr"><div class="wrap"><div class="cols">' +
      '<div class="col"><a class="logo" href="index.html" style="color:#fff">' + logo(26) + '<b>' + esc(tx(S().name)) + '</b></a><span class="c" style="line-height:1.7;max-width:320px">' + t.about + '</span></div>' +
      '<div class="col"><b>' + t.fShop + '</b>' + DATA.categories.filter(function (c) { return !c.parent; }).slice(0, 5).map(function (c) { return '<a href="index.html?cat=' + encodeURIComponent(c.slug) + '#catalog">' + esc(tx(c.name)) + '</a>'; }).join("") + '</div>' +
      '<div class="col"><b>' + t.fHelp + '</b><a href="index.html#how">' + t.fHow + '</a><a href="cart.html">' + t.cart + '</a></div>' +
      '<div class="col"><b>' + t.fContact + '</b><a href="tel:' + cleanPhone(S().phone) + '" dir="ltr">' + esc(S().phone) + '</a>' + (wa ? '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : "") + '</div>' +
      '</div><div class="bot"><span>' + t.disclaimer + '</span><span>© ' + new Date().getFullYear() + ' ' + esc(tx(S().name)) + '</span></div></div></footer>';
  }
  function stepsHTML() {
    return '<div class="steps">' + T().steps.map(function (s, i) { return '<div class="step rv"><div class="n">' + (i + 1) + '</div><div><b>' + s[0] + '</b><p>' + fill(s[1], { confirm: tx(S().confirmDelay) }) + '</p></div></div>'; }).join("") + '</div>';
  }

  /* ---------- checkout form ---------- */
  function checkout(root, opts) {
    var t = T(), st = { mode: "home", sending: false, desks: [] }, q = 1;
    var draftId = ssGet("ronaq_draft", null) || ("D" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    ssSet("ronaq_draft", draftId);
    var saved = lsGet("ronaq_customer", {});
    root.innerHTML =
      '<form class="fields" novalidate>' +
      '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      (opts.title ? '<div><h2 class="disp" style="margin:0;font-size:clamp(24px,3vw,32px);line-height:1.25">' + t.orderTitle + '</h2><p style="margin:4px 0 0;color:var(--teal);font-weight:500;font-size:15px">' + t.orderSub + '</p></div>' : "") +
      '<div class="f" data-f="name"><label for="c-name">' + t.lName + '</label><input id="c-name" name="name" autocomplete="name" placeholder="' + t.phName + '" value="' + esc(saved.name || "") + '"><span class="e">' + t.errName + '</span></div>' +
      '<div class="f" data-f="phone"><label for="c-phone">' + t.lPhone + '</label><input id="c-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:' + (lang === "ar" ? "right" : "left") + '" placeholder="05XX XX XX XX" value="' + esc(saved.phone || "") + '"><span class="e">' + t.errPhone + '</span></div>' +
      '<div class="two"><div class="f" data-f="wilaya"><label for="c-wilaya">' + t.lWilaya + '</label><select id="c-wilaya" name="wilaya"><option value="">' + t.chooseW + '</option>' +
      GEO.wilayas.map(function (w) { return '<option value="' + w.c + '"' + (String(saved.wilaya) === String(w.c) ? " selected" : "") + '>' + (w.c < 10 ? "0" : "") + w.c + " - " + esc(wName(w)) + '</option>'; }).join("") +
      '</select><span class="e">' + t.errWilaya + '</span></div>' +
      '<div class="f" data-f="commune"><label for="c-commune">' + t.lCommune + '</label><select id="c-commune" name="commune"><option value="">' + t.chooseC + '</option></select>' +
      '<input id="c-commune-o" name="communeOther" placeholder="' + t.phCommune + '" style="display:none;margin-top:8px"><span class="e">' + t.errCommune + '</span></div></div>' +
      '<div class="f"><span id="c-mode-l" style="font-size:15px;font-weight:500">' + t.lMode + '</span><div class="opts" role="group" aria-labelledby="c-mode-l"><button type="button" class="opt" data-mode="home" aria-pressed="true"><b>' + t.home + '</b><span data-fee="home">—</span></button><button type="button" class="opt" data-mode="desk" aria-pressed="false"><b>' + t.desk + '</b><span data-fee="desk">—</span></button></div></div>' +
      '<div class="f" data-f="desk" style="display:none"><label for="c-desk">' + t.lDesk + ' <i>(' + t.optional + ')</i></label><select id="c-desk" name="desk"><option value="">' + t.chooseD + '</option></select></div>' +
      '<div class="f" data-f="address"><label for="c-address">' + t.lAddress + ' <i>(' + t.optional + ')</i></label><input id="c-address" name="address" autocomplete="street-address" placeholder="' + t.phAddress + '" value="' + esc(saved.address || "") + '"></div>' +
      (opts.qty ? '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><span id="c-qty-l" style="font-size:15px;font-weight:500">' + t.lQty + '</span><div class="qty" role="group" aria-labelledby="c-qty-l"><button type="button" data-q="-1" aria-label="−">' + ic("minus", 18) + '</button><output aria-live="polite">1</output><button type="button" data-q="1" aria-label="+">' + ic("plus", 18) + '</button></div></div>' : "") +
      '<div class="sum"><div class="l"><span>' + t.sub + ' (<span data-s="count">0</span>)</span><span data-s="sub">—</span></div><div class="l"><span>' + t.ship + ' <span data-s="wname"></span></span><span data-s="fee">—</span></div><hr><div class="tot"><b>' + t.total + '</b><strong data-s="total">—</strong></div></div>' +
      '<div class="alert" role="alert" hidden></div>' +
      '<button class="btn lg pulse" type="submit"><span class="lbl">' + t.submit + '</span></button>' +
      '<p class="note" style="margin:0">' + ic("cash", 18) + '<span>' + t.payNote + '</span></p></form>';
    var form = root.querySelector("form"), $ = function (s) { return form.querySelector(s); };
    function items() { return opts.items(q); }
    function commune() { return form.commune.value === "__other" ? form.communeOther.value.trim() : form.commune.value; }
    function totals() {
      var it = items(), sub = it.reduce(function (s, l) { return s + product(l.id).price * l.qty; }, 0);
      var f = form.wilaya.value ? quote(form.wilaya.value, commune(), st.mode, sub) : null;
      return { items: it, sub: sub, fee: f, total: sub + (f || 0), count: it.reduce(function (s, l) { return s + l.qty; }, 0) };
    }
    function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    function fillCommunes() {
      var code = form.wilaya.value, keep = saved.commune;
      var paint = function (list) {
        if (form.wilaya.value !== code) return;
        form.commune.innerHTML = '<option value="">' + t.chooseC + '</option>' + list.map(function (c) { var n = c[0]; return '<option value="' + esc(n) + '"' + (keep === n ? " selected" : "") + '>' + esc(lang === "ar" ? (c[1] || n) : n) + '</option>'; }).join("") + '<option value="__other">' + t.otherC + '</option>';
        form.commune.disabled = false; render(false);
      };
      saved.commune = null;
      if (!code) { paint([]); return; }
      form.commune.disabled = true; form.commune.innerHTML = '<option value="">' + T().loading + '</option>';
      // If the list can't load (bad signal), let the customer type the commune instead of blocking the order.
      communes(code).then(paint, function () { paint([]); form.commune.value = "__other"; render(false); });
      loadDesks();
    }
    function loadDesks() {
      var carrier = S().defaultCarrier, code = form.wilaya.value;
      st.desks = []; renderDesks();
      if (!carrier || !code || DEMO) return;
      getJSON(SITE + "/api/desks?carrier=" + encodeURIComponent(carrier) + "&wilaya=" + encodeURIComponent(code)).then(function (d) { st.desks = d || []; renderDesks(); }).catch(function () {});
    }
    function renderDesks() {
      $("#c-desk").innerHTML = '<option value="">' + t.chooseD + '</option>' + st.desks.map(function (d) { return '<option value="' + esc(d.code) + '">' + esc(d.name + (d.commune ? " — " + d.commune : "")) + '</option>'; }).join("");
      $('[data-f="desk"]').style.display = st.mode === "desk" && st.desks.length ? "" : "none";
    }
    function render(animate) {
      var tt = totals(), w = wilaya(form.wilaya.value);
      $('[data-s="count"]').textContent = tt.count;
      $('[data-s="sub"]').textContent = money(tt.sub);
      $('[data-s="wname"]').textContent = w ? "· " + wName(w) : "";
      $('[data-s="fee"]').textContent = tt.fee == null ? "—" : (tt.fee === 0 ? t.free : money(tt.fee));
      $('[data-s="total"]').textContent = money(tt.total);
      ["home", "desk"].forEach(function (m) {
        var v = w ? quote(w.c, commune(), m, tt.sub) : undefined, b = $('[data-mode="' + m + '"]');
        $('[data-fee="' + m + '"]').textContent = v === undefined ? "—" : v === null ? t.notOffered : (v === 0 ? t.free : money(v));
        b.disabled = v === null; b.style.opacity = v === null ? ".5" : "";
        if (v === null && st.mode === m) st.mode = m === "home" ? "desk" : "home";
      });
      form.querySelectorAll(".opt").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-mode") === st.mode); });
      $('[data-f="address"]').style.display = st.mode === "home" ? "" : "none";
      $('[data-f="desk"]').style.display = st.mode === "desk" && st.desks.length ? "" : "none";
      $("#c-commune-o").style.display = form.commune.value === "__other" ? "" : "none";
      if (opts.qty) $("output").textContent = q;
      if (animate) bump($('[data-s="total"]'));
      if (opts.onChange) opts.onChange(tt);
    }
    form.querySelectorAll(".opt").forEach(function (b) { b.onclick = function () { st.mode = b.getAttribute("data-mode"); render(true); }; });
    form.querySelectorAll("[data-q]").forEach(function (b) { b.onclick = function () { q = Math.max(1, Math.min(10, q + Number(b.getAttribute("data-q")))); render(true); bump($("output")); }; });
    form.wilaya.onchange = function () { clearErr("wilaya"); fillCommunes(); render(true); saveDraft(); };
    form.commune.onchange = function () { clearErr("commune"); render(true); saveDraft(); if (form.commune.value === "__other") form.communeOther.focus(); };
    function clearErr(k) { var f = $('[data-f="' + k + '"]'); if (f) f.classList.remove("bad"); }
    ["name", "phone", "address", "communeOther"].forEach(function (k) { form[k].addEventListener("input", function () { clearErr(k === "communeOther" ? "commune" : k); if (k === "communeOther") render(false); saveDraft(); }); });

    var dt, started = false;
    function saveDraft() {
      if (!started) { started = true; track("InitiateCheckout", { value: totals().total, ids: items().map(function (l) { return l.id; }) }); }
      clearTimeout(dt);
      dt = setTimeout(function () {
        if (!validPhone(form.phone.value)) return;
        post("/api/abandon", { draftId: draftId, name: form.name.value.trim(), phone: cleanPhone(form.phone.value), wilayaCode: Number(form.wilaya.value) || undefined, commune: commune(), items: items().map(function (l) { return { productId: l.id, qty: l.qty }; }), page: location.pathname, lang: lang }, true);
      }, 1500);
    }

    form.onsubmit = function (e) {
      e.preventDefault(); if (st.sending) return;
      var bad = [];
      if (form.name.value.trim().length < 2) bad.push("name");
      if (!validPhone(form.phone.value)) bad.push("phone");
      if (!form.wilaya.value) bad.push("wilaya");
      if (!commune()) bad.push("commune");
      form.querySelectorAll(".f.bad").forEach(function (f) { f.classList.remove("bad"); });
      if (bad.length) {
        void form.offsetWidth; bad.forEach(function (k) { $('[data-f="' + k + '"]').classList.add("bad"); });
        var first = form[bad[0]]; first.focus(); first.scrollIntoView({ block: "center", behavior: "smooth" }); return;
      }
      if (form.website.value) return;
      var tt = totals(); if (!tt.items.length) return;
      var btn = $('button[type="submit"]'), al = $(".alert"); al.hidden = true;
      st.sending = true; btn.disabled = true; btn.classList.remove("pulse");
      btn.innerHTML = '<svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg><span>' + t.sending + '</span>';
      var w = wilaya(form.wilaya.value);
      var body = {
        name: form.name.value.trim(), phone: cleanPhone(form.phone.value), wilayaCode: w.c, commune: commune(), address: st.mode === "home" ? form.address.value.trim() : "",
        mode: st.mode, stopDeskCode: st.mode === "desk" ? form.desk.value || undefined : undefined, lang: lang, draftId: draftId, website: "",
        items: tt.items.map(function (l) { return { productId: l.id, qty: l.qty }; }), source: attribution()
      };
      lsSet("ronaq_customer", { name: body.name, phone: body.phone, wilaya: w.c, commune: body.commune, address: body.address });
      post("/api/order", body).then(function (r) {
        if (!r || !r.ok) {
          var err = new Error((r && r.error) || "net"); err.field = r && r.field; throw err;
        }
        var order = { number: r.number, name: body.name, phone: body.phone, wilayaCode: w.c, commune: body.commune, address: body.address, mode: body.mode, items: r.items, subtotal: r.subtotal, shipping: r.shipping, total: r.total, page: location.pathname, at: Date.now() };
        lsSet("ronaq_last_order", order);
        try { sessionStorage.removeItem("ronaq_draft"); } catch (e2) {}
        location.href = "merci.html?n=" + encodeURIComponent(r.number);
      }).catch(function (e) {
        st.sending = false; btn.disabled = false; btn.innerHTML = '<span class="lbl">' + t.submit + '</span>';
        var code = e && e.message, map = { name: "name", phone: "phone", wilaya: "wilaya", commune: "commune" };
        if (map[code]) { $('[data-f="' + map[code] + '"]').classList.add("bad"); return; }
        al.hidden = false;
        var draft = { number: "", name: body.name, phone: body.phone, wilayaCode: w.c, commune: body.commune, address: body.address, mode: body.mode, items: tt.items.map(function (l) { var p = product(l.id); return { name: tx(p.name), qty: l.qty, price: p.price }; }), total: tt.total };
        al.innerHTML = esc(t.errs[code] || t.errs.net) + (code === "net" || !t.errs[code] ? ' <a href="' + waLink(draft) + '" target="_blank" rel="noopener" style="color:inherit;font-weight:600">WhatsApp</a>' : "");
      });
    };
    if (saved.wilaya) fillCommunes();
    render(false);
    return { render: render };
  }

  function waText(o) {
    var t = T(), L = [t.waIntro + (o.number ? " (" + o.number + ")" : "")];
    o.items.forEach(function (l) { var p = l.productId && product(l.productId); L.push("• " + l.qty + " × " + (p ? tx(p.name) : l.name) + " — " + money(l.price * l.qty)); });
    L.push(t.delivery + ": " + (o.mode === "home" ? t.home : t.desk) + " · " + wName(wilaya(o.wilayaCode)) + " / " + o.commune);
    if (o.address) L.push(o.address);
    L.push(t.total + ": " + money(o.total)); L.push(o.name + " · " + o.phone);
    return L.join("\n");
  }
  function waLink(o) { return "https://wa.me/" + String(S().whatsapp || "").replace(/\D/g, "") + "?text=" + encodeURIComponent(waText(o)); }

  /* ---------- pages ---------- */
  function cardHTML(p, i) {
    var t = T(), href = "product.html?p=" + encodeURIComponent(p.slug);
    return '<article class="card" style="animation-delay:' + (i * 60) + 'ms">' +
      '<a class="img" href="' + href + '" style="background:' + tint(p)[2] + '" aria-label="' + esc(tx(p.name)) + '">' + visual(p, 110) + '</a>' +
      '<div class="info"><span class="cat">' + esc(catName(p.cat)) + '</span><h3><a href="' + href + '">' + esc(tx(p.name)) + '</a></h3><span class="muted" style="font-size:14px">' + esc(tx(p.size)) + '</span>' +
      '<span class="price">' + money(p.price) + (p.compareAt ? ' <s class="muted" style="font-size:15px;font-family:var(--body)">' + money(p.compareAt) + '</s>' : "") + '</span></div>' +
      (p.inStock ? '<div class="acts"><a class="btn sm" href="' + href + '">' + t.buy + '</a><button type="button" class="iconbtn" data-add="' + esc(p.id) + '" aria-label="' + t.addCart + '">' + ic("bag", 20) + '</button></div>'
        : '<div class="acts"><span class="btn sm" style="background:#EEE9E7;color:#5B5052;cursor:default">' + t.out + '</span></div>') + '</article>';
  }
  function bindAdd(root) {
    root.querySelectorAll("[data-add]").forEach(function (b) {
      b.onclick = function () {
        Cart.add(b.getAttribute("data-add"), 1); b.classList.add("ok"); b.innerHTML = ic("check", 20);
        setTimeout(function () { b.classList.remove("ok"); b.innerHTML = ic("bag", 20); }, 1500);
        toast(ic("check", 20) + '<span>' + T().added + '</span><a href="cart.html">' + T().viewCart + '</a>');
      };
    });
  }

  function pageHome() {
    var t = T(), app = document.getElementById("app"), cat = new URLSearchParams(location.search).get("cat") || "all";
    var ps = DATA.products, a = ps[1] || ps[0], b = ps[0], c = ps[ps.length - 1] || ps[0];
    var tops = DATA.categories.filter(function (x) { return !x.parent; });
    app.innerHTML =
      '<section class="hero"><div class="wrap"><div>' +
      '<span class="kicker up d1">' + t.kicker + '</span><h1 class="up d2">' + t.heroTitle + '</h1><p class="up d3">' + t.heroText + '</p>' +
      '<div class="ctas up d4"><a class="btn pulse" href="#catalog"><span>' + t.heroCta + '</span><span class="arrw">' + ic("arrow", 18, 'class="arr"') + '</span></a><a class="btn ghost" href="#how">' + t.heroCta2 + '</a></div></div>' +
      '<div class="stage up d2" aria-hidden="true"><div class="arch">' + PATTERN + '</div><div class="plinth"></div>' +
      (b ? '<div class="b float f2" style="left:17%">' + art(a, 120) + '</div><div class="b float" style="left:35%;bottom:11.5%">' + art(b, 160) + '</div><div class="b float f3" style="left:59%">' + art(c, 120) + '</div>' : "") +
      sparkle("31%", "19%", 22, "#B23A5E") + sparkle("66%", "30%", 16, "#1E5A55", "t2") + sparkle("27%", "52%", 14, "#C9955A", "t3") +
      '<div class="badge floatB" style="left:0;top:30%"><span class="ic">' + ic("cash", 22) + '</span><span><b>' + t.badge1 + '</b><span class="muted">' + t.badge1s + '</span></span></div>' +
      '<div class="badge float f3" style="right:0;top:8%"><span style="color:var(--rose)">' + ic("truck", 22) + '</span><b>' + t.badge2 + '</b></div></div></div></section>' +
      '<div class="wrap"><div class="trust up d4">' + t.trust.map(function (x, i) { return '<div class="t"><span class="ic">' + ic(["cash", "truck", "phone", "box"][i]) + '</span><span><b>' + x[0] + '</b><span>' + x[1] + '</span></span></div>'; }).join("") + '</div></div>' +
      '<section class="sec" id="catalog"><div class="wrap"><div class="rv"><h2>' + t.catTitle + '</h2><p class="sub">' + t.catSub + '</p></div>' +
      '<div class="chips" role="group" aria-label="' + t.catTitle + '"><button type="button" class="chip" data-cat="all" aria-pressed="' + (cat === "all") + '">' + t.all + '</button>' +
      tops.map(function (k) { return '<button type="button" class="chip" data-cat="' + esc(k.slug) + '" aria-pressed="' + (k.slug === cat) + '">' + esc(tx(k.name)) + '</button>'; }).join("") + '</div>' +
      '<div class="grid" id="grid"></div></div></section>' +
      '<section class="sec" id="how"><div class="wrap" style="text-align:center"><h2 class="rv">' + t.stepsTitle + '</h2>' + stepsHTML() + '</div></section>';
    var grid = document.getElementById("grid");
    function inCat(p) {
      if (cat === "all") return true;
      if (p.cat === cat) return true;
      var sub = DATA.categories.filter(function (x) { return x.slug === p.cat; })[0];
      return !!(sub && sub.parent === cat);
    }
    function draw() { grid.innerHTML = DATA.products.filter(inCat).map(cardHTML).join(""); bindAdd(grid); }
    app.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.onclick = function () { cat = btn.getAttribute("data-cat"); app.querySelectorAll("[data-cat]").forEach(function (x) { x.setAttribute("aria-pressed", x === btn); }); draw(); history.replaceState(null, "", cat === "all" ? "index.html#catalog" : "index.html?cat=" + encodeURIComponent(cat) + "#catalog"); };
    });
    draw();
  }

  function pageProduct() {
    var t = T(), app = document.getElementById("app"), q = new URLSearchParams(location.search), p = product(q.get("p") || q.get("id") || "");
    if (!p) { app.innerHTML = '<div class="wrap empty"><h1 class="disp">' + t.notFound + '</h1><a class="btn" href="index.html">' + t.backShop + '</a></div>'; return; }
    document.title = tx(p.name) + " · " + tx(S().name);
    var bens = p.benefits ? tx(p.benefits) : null, gal = p.images || [];
    app.innerHTML =
      '<div class="wrap"><div class="pgrid"><div class="up d1 pstick">' +
      '<div class="pimg" style="background:' + tint(p)[2] + '">' + (gal.length ? '<img id="mainimg" src="' + esc(gal[0]) + '" alt="' + esc(tx(p.name)) + '" width="600" height="630" fetchpriority="high" decoding="async">' : PATTERN + '<div class="bt float">' + art(p, 200) + '</div>' + sparkle("24%", "26%", 20, "#B23A5E") + sparkle("70%", "36%", 15, "#1E5A55", "t2")) + '</div>' +
      (gal.length > 1 ? '<div style="display:flex;gap:8px;margin-top:10px;overflow-x:auto">' + gal.map(function (u, i) { return '<button type="button" data-img="' + i + '" style="flex-shrink:0;width:64px;height:64px;border-radius:12px;overflow:hidden;border:2px solid ' + (i ? "transparent" : "var(--teal)") + ';padding:0;cursor:pointer;background:none"><img src="' + esc(u) + '" alt="" loading="lazy" decoding="async" width="64" height="64" style="width:100%;height:100%;object-fit:cover"></button>'; }).join("") + '</div>' : "") +
      '</div><div><span class="up d1" style="color:var(--teal);font-weight:500;font-size:14px">' + esc(catName(p.cat)) + (p.size ? ' · ' + esc(tx(p.size)) : "") + '</span>' +
      '<h1 class="ptitle up d2">' + esc(tx(p.name)) + '</h1>' + (p.desc ? '<p class="up d2" style="margin:0;color:var(--soft);font-size:17px;line-height:1.7">' + esc(tx(p.desc)) + '</p>' : "") +
      '<div class="pprice up d3" style="margin-top:10px">' + money(p.price) + (p.compareAt ? ' <s class="muted" style="font-size:20px;font-family:var(--body)">' + money(p.compareAt) + '</s>' : "") + '</div>' +
      '<div class="minis up d3"><span class="mini">' + ic("cash") + t.trust[0][0] + '</span><span class="mini">' + ic("truck") + t.trust[1][0] + '</span><span class="mini">' + ic("box") + t.trust[3][0] + '</span></div>' +
      (p.inStock ? '<div class="panel up d4" id="order"></div><button type="button" class="btn ghost" data-addp style="width:100%;margin-top:12px">' + ic("bag", 20) + '<span>' + t.addCart + '</span></button>' : '<div class="panel"><b>' + t.out + '</b></div>') +
      (bens && bens.length ? '<section class="rv" style="margin-top:40px"><h2 class="disp" style="margin:0;font-size:26px">' + t.benefits + '</h2><ul class="blist">' + bens.map(function (x) { return '<li><span class="ck">' + ic("check", 16) + '</span><span>' + esc(x) + '</span></li>'; }).join("") + '</ul></section>' : "") +
      (p.usage && tx(p.usage) ? '<section class="rv" style="margin-top:24px;padding:18px;background:#F3E9DA;border-radius:16px"><b>' + t.usage + '</b><p style="margin:6px 0 0;color:#4A3540">' + esc(tx(p.usage)) + '</p></section>' : "") +
      '<section style="margin-top:40px"><h2 class="disp rv" style="margin:0;font-size:26px">' + t.faqTitle + '</h2><div class="faq">' + t.faq.map(function (f) { return '<details class="rv"><summary>' + f[0] + ic("plus", 20) + '</summary><p>' + fill(f[1], { delivery: tx(S().deliveryDelay) }) + '</p></details>'; }).join("") + '</div></section>' +
      '</div></div><section class="sec" style="text-align:center"><h2 class="rv">' + t.stepsTitle + '</h2>' + stepsHTML() + '</section></div>' +
      (p.inStock ? '<div class="stickybar"><div style="display:flex;flex-direction:column"><span class="muted" style="font-size:12px">' + esc(tx(p.name)) + '</span><b class="disp" style="font-size:20px">' + money(p.price) + '</b></div><a class="btn" href="#order"><span>' + t.sticky + '</span><span class="arrw">' + ic("arrow", 16, 'class="arr"') + '</span></a></div>' : "");
    app.querySelectorAll("[data-img]").forEach(function (b) { b.onclick = function () { document.getElementById("mainimg").src = gal[Number(b.getAttribute("data-img"))]; app.querySelectorAll("[data-img]").forEach(function (x) { x.style.borderColor = x === b ? "var(--teal)" : "transparent"; }); }; });
    track("ViewContent", { value: p.price, ids: [p.id] });
    if (!p.inStock) return;
    document.body.classList.add("has-sticky");
    checkout(document.getElementById("order"), { title: true, qty: true, items: function (qq) { return [{ id: p.id, qty: qq }]; } });
    app.querySelector("[data-addp]").onclick = function () { Cart.add(p.id, 1); toast(ic("check", 20) + '<span>' + t.added + '</span><a href="cart.html">' + t.viewCart + '</a>'); };
    var bar = app.querySelector(".stickybar"), form = document.getElementById("order");
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { bar.classList.toggle("show", !e[0].isIntersecting); }, { threshold: 0.05 }).observe(form);
  }

  function pageCart() {
    var t = T(), app = document.getElementById("app");
    function draw() {
      var c = Cart.get();
      if (!c.length) {
        app.innerHTML = '<div class="wrap"><div class="panel empty up d1" style="margin-top:40px"><span style="width:84px;height:84px;border-radius:50%;background:var(--blush);color:var(--rose-d);display:flex;align-items:center;justify-content:center">' + ic("bag", 36) + '</span><h1 class="disp" style="margin:0;font-size:30px">' + t.cartEmpty + '</h1><p class="muted" style="margin:0">' + t.cartEmptySub + '</p><a class="btn" href="index.html#catalog">' + t.continueShop + '</a></div></div>';
        return;
      }
      app.innerHTML = '<div class="wrap"><h1 class="disp up d1" style="font-size:clamp(28px,4vw,42px);margin:36px 0 20px">' + t.cartTitle + ' <span class="muted" style="font-size:18px;font-family:var(--body);font-weight:400">(' + Cart.count() + ' ' + t.items + ')</span></h1><div class="cartgrid"><div class="panel up d2" id="lines"></div><div class="panel up d3 pstick" id="order"></div></div></div>';
      var lines = document.getElementById("lines");
      lines.innerHTML = (S().freeShippingFrom ? '<div id="free" style="margin-bottom:10px"></div>' : "") + c.map(function (l, i) {
        var p = product(l.id), href = "product.html?p=" + encodeURIComponent(p.slug);
        return '<div class="line" data-id="' + esc(p.id) + '" style="animation-delay:' + (i * 60) + 'ms"><a class="th" href="' + href + '" style="background:' + tint(p)[2] + '">' + visual(p, 54) + '</a>' +
          '<div><h3><a href="' + href + '" style="color:inherit;text-decoration:none">' + esc(tx(p.name)) + '</a></h3><span class="muted" style="font-size:14px">' + esc(tx(p.size)) + ' · ' + money(p.price) + '</span>' +
          '<div class="qty" style="display:inline-flex;margin-top:8px" role="group" aria-label="' + t.lQty + '"><button type="button" data-d="-1" aria-label="−">' + ic("minus", 16) + '</button><output>' + l.qty + '</output><button type="button" data-d="1" aria-label="+">' + ic("plus", 16) + '</button></div></div>' +
          '<div class="end"><b class="disp" style="font-size:20px">' + money(p.price * l.qty) + '</b><button type="button" class="rm">' + t.remove + '</button></div></div>';
      }).join("");
      checkout(document.getElementById("order"), {
        title: true, items: function () { return Cart.get(); },
        onChange: function (tt) {
          var fr = document.getElementById("free"); if (!fr) return;
          var left = S().freeShippingFrom - tt.sub;
          fr.innerHTML = '<p style="margin:0 0 8px;font-size:14px;color:var(--teal);font-weight:500">' + (left > 0 ? fill(t.freeLeft, { x: money(left) }) : t.freeOk) + '</p><div class="freebar"><i style="width:' + Math.min(100, tt.sub / S().freeShippingFrom * 100) + '%"></i></div>';
        }
      });
      lines.querySelectorAll(".line").forEach(function (row) {
        var id = row.getAttribute("data-id");
        row.querySelectorAll("[data-d]").forEach(function (b) { b.onclick = function () { var l = Cart.get().filter(function (x) { return x.id === id; })[0]; Cart.qty(id, l.qty + Number(b.getAttribute("data-d"))); draw(); }; });
        row.querySelector(".rm").onclick = function () { row.classList.add("out"); setTimeout(function () { Cart.remove(id); draw(); }, 280); };
      });
    }
    draw();
  }

  function pageThanks() {
    var t = T(), app = document.getElementById("app"), o = lsGet("ronaq_last_order", null), n = new URLSearchParams(location.search).get("n");
    if (!o || (n && o.number !== n)) { location.replace("index.html"); return; }
    if (o.page && /cart/.test(o.page)) Cart.set([]);
    app.innerHTML = '<div class="wrap"><div class="thanks">' +
      '<div class="okc"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="draw" pathLength="30" d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
      '<h1 class="disp up d2" style="margin:0;font-size:clamp(28px,4vw,42px)">' + t.thanksTitle + '</h1>' +
      '<p class="up d3" style="margin:0;font-size:17px;line-height:1.7;color:var(--soft)">' + esc(fill(t.thanksText, { phone: o.phone, confirm: tx(S().confirmDelay), total: money(o.total) })) + '</p>' +
      '<span class="oid up d3">' + t.orderNo + ' <span dir="ltr">' + esc(o.number) + '</span></span>' +
      '<div class="panel recap up d4"><h2 style="margin:0 0 12px;font-size:18px">' + t.recap + '</h2><div class="sum">' +
      o.items.map(function (l) { var p = l.productId && product(l.productId); return '<div class="l"><span>' + l.qty + ' × ' + esc(p ? tx(p.name) : l.name) + '</span><span>' + money(l.price * l.qty) + '</span></div>'; }).join("") +
      '<div class="l"><span>' + t.ship + ' · ' + (o.mode === "home" ? t.home : t.desk) + ' · ' + esc(wName(wilaya(o.wilayaCode))) + '</span><span>' + (o.shipping ? money(o.shipping) : t.free) + '</span></div><hr><div class="tot"><b>' + t.total + '</b><strong>' + money(o.total) + '</strong></div></div>' +
      '<p class="muted" style="margin:12px 0 0;font-size:14px">' + fill(t.eta, { d: tx(S().deliveryDelay) }) + '</p></div>' +
      '<div class="up d4" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;width:100%"><a class="btn wa" href="' + waLink(o) + '" target="_blank" rel="noopener">' + ic("chat", 20) + '<span>' + t.waBtn + '</span></a><a class="btn ghost" href="index.html">' + t.backShop + '</a></div>' +
      '</div><section class="sec" style="text-align:center">' + stepsHTML() + '</section></div>';
    if (!ssGet("ronaq_tracked_" + o.number, false)) { track("Lead", { value: o.total, ids: o.items.map(function (l) { return l.productId; }), eventID: o.number + "-Lead" }); ssSet("ronaq_tracked_" + o.number, true); }
    if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      var colors = ["#E7B7B9", "#B23A5E", "#BFD3CA", "#E8D2B0"];
      for (var i = 0; i < 26; i++) { var s = document.createElement("span"); s.className = "petal"; s.style.left = Math.random() * 100 + "vw"; s.style.background = colors[i % 4]; s.style.animationDuration = (2.8 + Math.random() * 2.4) + "s"; s.style.animationDelay = (Math.random() * 0.8) + "s"; document.body.appendChild(s); (function (el) { setTimeout(function () { el.remove(); }, 6500); })(s); }
    }
  }

  /* ---------- boot ---------- */
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  document.addEventListener("DOMContentLoaded", function () {
    var app = document.getElementById("app");
    if (app && !DATA) app.innerHTML = '<div class="wrap" aria-busy="true" aria-label="' + T().loading + '" style="padding:32px 0"><div class="sk" style="height:44px;width:60%;margin-bottom:18px"></div><div class="grid">' + [0, 1, 2, 3].map(function () { return '<div class="sk" style="aspect-ratio:1/1.35"></div>'; }).join("") + '</div></div>';
    loadAll().then(function () {
      header(); footer(); initPixels();
      ({ home: pageHome, product: pageProduct, cart: pageCart, thanks: pageThanks }[document.body.getAttribute("data-page")] || function () {})();
      reveal();
      var h = location.hash && document.getElementById(location.hash.slice(1));
      if (h) setTimeout(function () { h.scrollIntoView(); }, 60); else window.scrollTo(0, 0);
    }).catch(function () {
      if (app) app.innerHTML = '<div class="wrap empty"><p>' + T().loadErr + '</p><button class="btn" type="button" onclick="location.reload()">↻</button></div>';
    });
  });
})();
