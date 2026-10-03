/* Texts of the information pages (Arabic / French).
   {store} {phone} {confirm} {delivery} are filled from the store settings (admin › الإعدادات),
   so changing the phone or delays there updates these pages too. Edit the wording freely. */
export type Block = { h?: string; p?: string[]; list?: string[] };
export type InfoPage = { title: string; kicker: string; intro: string; blocks: Block[] };
export type InfoSlug = "about" | "delivery" | "returns" | "privacy" | "terms";

export { NAV } from "./infoNav";

export const INFO: Record<"ar" | "fr", Record<InfoSlug, InfoPage>> = {
  ar: {
    about: {
      title: "من نحن", kicker: "{store}",
      intro: "منتجات طبيعية مختارة بعناية للعناية بالجمال، الصحة والمظهر، بجودة واهتمام يليق بك. نقدّم لكم منتجات مميزة تجمع بين المكونات الطبيعية، الجودة والتجربة الجميلة. 💚",
      blocks: [
        { h: "ما نعدكِ به", list: [
          "منتجات مختارة بعناية 📦",
          "مكونات طبيعية 🌿",
          "جودة واهتمام بالتفاصيل ✨",
          "للطلب والاستفسار تواصلوا معنا 📩",
        ] },
        { h: "رؤيتنا", p: ["رونق الحياة — لمسة طبيعية لجمال يومك. ✨"] },
      ],
    },
    delivery: {
      title: "التوصيل والدفع", kicker: "69 ولاية · الدفع عند الاستلام",
      intro: "نوصل طلبكِ إلى كل ولايات الجزائر، وتدفعين نقداً فقط عند وصول الطرد.",
      blocks: [
        { h: "كيف يتم الطلب؟", list: [
          "تملئين الاستمارة: الاسم، رقم الهاتف، الولاية والبلدية.",
          "نتصل بكِ خلال {confirm} لتأكيد الطلب والعنوان.",
          "نرسل الطرد مع شركة التوصيل، ويصلكِ خلال {delivery} حسب ولايتكِ.",
          "تدفعين المبلغ نقداً لعامل التوصيل عند الاستلام.",
        ] },
        { h: "طريقتا التوصيل", list: [
          "إلى المنزل: يوصل عامل التوصيل الطرد إلى عنوانكِ ويتصل بكِ قبل الوصول.",
          "مكتب التوصيل (Stop desk): تستلمين الطرد بنفسكِ من مكتب شركة التوصيل في ولايتكِ، وغالباً بسعر أقل.",
        ] },
        { h: "الدفع", p: ["الدفع نقداً فقط عند الاستلام. لا نطلب منكِ أي دفع مسبق أو معلومات بنكية. المبلغ الذي تدفعينه هو المجموع الظاهر في الاستمارة: ثمن المنتجات + سعر التوصيل."] },
        { h: "إذا لم نتمكن من الوصول إليكِ", p: ["إذا لم تردّي على الهاتف، نعيد الاتصال عدة مرات. تأكدي من كتابة رقم صحيح ومتاح، فالطلب لا يُرسل قبل التأكيد."] },
      ],
    },
    returns: {
      title: "الاستبدال والإرجاع", kicker: "استبدال خلال 7 أيام",
      intro: "رضاكِ يهمنا. يمكنكِ طلب استبدال المنتج خلال 7 أيام من تاريخ الاستلام، وفق الشروط التالية.",
      blocks: [
        { h: "شروط الاستبدال", list: [
          "أن يكون الطلب خلال 7 أيام من تاريخ استلام الطرد.",
          "أن يكون المنتج غير مفتوح وغير مستعمل، في علبته الأصلية وبغلافه الواقي.",
          "لأسباب صحية، لا يمكن استبدال منتجات العناية أو النظافة الحميمة بعد فتحها.",
        ] },
        { h: "منتج تالف أو خاطئ؟", p: ["إذا وصلكِ منتج تالف أو غير الذي طلبتِه، تواصلي معنا خلال 48 ساعة من الاستلام مع صورة للمنتج والطرد. نستبدله لكِ ونتحمل مصاريف التوصيل."] },
        { h: "كيف تطلبين الاستبدال؟", list: [
          "اتصلي بنا على {phone} أو راسلينا عبر WhatsApp.",
          "أرسلي رقم الطلب (يبدأ بـ RQ) وسبب الاستبدال.",
          "نتفق معكِ على طريقة إرجاع المنتج واستلام البديل.",
        ] },
        { h: "مصاريف التوصيل", p: ["في حالة تغيير الرأي، تتحملين مصاريف توصيل الاستبدال. وفي حالة خطأ منا أو منتج تالف، نتحملها نحن."] },
        { h: "رفض الطرد", p: ["يمكنكِ رفض الطرد عند الاستلام إذا كان الغلاف متضرراً. الرفض المتكرر للطرود بدون سبب قد يمنعنا من قبول طلبات جديدة من نفس الرقم."] },
      ],
    },
    privacy: {
      title: "سياسة الخصوصية", kicker: "حماية معطياتكِ",
      intro: "نحترم خصوصيتكِ. توضح هذه الصفحة المعلومات التي نجمعها ولماذا، وفقاً للقانون الجزائري رقم 18-07 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي.",
      blocks: [
        { h: "ما نجمعه", list: [
          "الاسم واللقب ورقم الهاتف.",
          "الولاية والبلدية والعنوان (للتوصيل فقط).",
          "تفاصيل الطلب: المنتجات والكميات والمبلغ.",
          "إذا كتبتِ رقم هاتفكِ في الاستمارة ولم تكملي الطلب، نحفظ المعلومات المكتوبة لنتمكن من مساعدتكِ في إكماله.",
        ] },
        { h: "لماذا نستعملها", list: [
          "لتأكيد طلبكِ عبر الهاتف أو WhatsApp.",
          "لإرسال الطرد مع شركة التوصيل ومتابعته.",
          "لتحسين المتجر وقياس فعالية إعلاناتنا.",
        ] },
        { h: "مع من نشاركها", p: ["نشارك الاسم ورقم الهاتف والعنوان مع شركة التوصيل فقط، لإيصال الطرد. لا نبيع معطياتكِ ولا نؤجرها لأي طرف."] },
        { h: "ملفات تعريف الارتباط والإعلانات", p: ["قد يستعمل الموقع أدوات قياس من Facebook (Meta) وTikTok لمعرفة الإعلانات التي أوصلتكِ إلينا. كما يحفظ متصفحكِ سلتكِ ولغتكِ ومعلوماتكِ لتسهيل الطلب القادم."] },
        { h: "حقوقكِ", p: ["يمكنكِ في أي وقت طلب الاطلاع على معطياتكِ أو تصحيحها أو حذفها، بالاتصال بنا على {phone} أو عبر WhatsApp."] },
      ],
    },
    terms: {
      title: "الشروط والأحكام", kicker: "{store}",
      intro: "باستعمالكِ للموقع وإرسالكِ لطلب، فإنكِ توافقين على الشروط التالية.",
      blocks: [
        { h: "الطلبات", list: [
          "يُعتبر الطلب نهائياً بعد تأكيده معكِ عبر الهاتف.",
          "يمكننا رفض أو إلغاء طلب في حال نفاد المخزون، أو معلومات غير صحيحة، أو طلبات متكررة غير جدية.",
          "لا يُقبل عدد كبير من الطلبات من نفس الرقم في نفس اليوم، إلا بالاتصال بنا.",
        ] },
        { h: "الأسعار", p: ["الأسعار بالدينار الجزائري وتشمل ثمن المنتج. سعر التوصيل يُضاف حسب الولاية وطريقة التوصيل، ويظهر قبل تأكيد الطلب. قد تتغير الأسعار، والسعر المعتمد هو الظاهر وقت الطلب."] },
        { h: "الدفع والتوصيل", p: ["الدفع نقداً عند الاستلام. مدة التوصيل المذكورة ({delivery}) تقديرية وقد تتأخر لأسباب خارجة عن إرادتنا، مثل ضغط شركات التوصيل أو الأحوال الجوية."] },
        { h: "المنتجات", p: ["نسعى لعرض صور ومعلومات دقيقة، وقد يختلف شكل العلبة قليلاً حسب الدفعة. المعلومات لا تغني عن استشارة الطبيب أو الصيدلي، ويجب احترام طريقة الاستعمال المكتوبة على المنتج."] },
        { h: "الاستبدال", p: ["تخضع طلبات الاستبدال لشروط صفحة «الاستبدال والإرجاع»."] },
        { h: "التواصل", p: ["لأي سؤال: {phone} أو عبر WhatsApp."] },
      ],
    },
  },
  fr: {
    about: {
      title: "Qui sommes-nous", kicker: "{store}",
      intro: "Des produits naturels soigneusement sélectionnés pour la beauté, la santé et l'apparence, avec une qualité et une attention que vous méritez. Nous vous proposons des produits exceptionnels alliant ingrédients naturels, qualité et une belle expérience. 💚",
      blocks: [
        { h: "Nos engagements", list: [
          "Produits soigneusement sélectionnés 📦",
          "Ingrédients naturels 🌿",
          "Qualité et attention aux détails ✨",
          "Pour commander ou vous renseigner, contactez-nous 📩",
        ] },
        { h: "Notre vision", p: ["Ronaq El Hayat — Une touche naturelle pour votre beauté au quotidien. ✨"] },
      ],
    },
    delivery: {
      title: "Livraison et paiement", kicker: "69 wilayas · paiement à la livraison",
      intro: "Nous livrons votre commande dans toutes les wilayas d'Algérie, et vous payez en espèces uniquement à l'arrivée du colis.",
      blocks: [
        { h: "Comment ça se passe ?", list: [
          "Vous remplissez le formulaire : nom, téléphone, wilaya et commune.",
          "On vous appelle sous {confirm} pour confirmer la commande et l'adresse.",
          "Le colis part avec le transporteur et arrive sous {delivery} selon votre wilaya.",
          "Vous payez en espèces au livreur à la réception.",
        ] },
        { h: "Deux modes de livraison", list: [
          "À domicile : le livreur apporte le colis à votre adresse et vous appelle avant d'arriver.",
          "Stop desk : vous récupérez le colis au bureau du transporteur dans votre wilaya, souvent moins cher.",
        ] },
        { h: "Paiement", p: ["Paiement en espèces uniquement, à la réception. Nous ne demandons jamais de paiement à l'avance ni d'informations bancaires. Vous payez le total affiché dans le formulaire : produits + livraison."] },
        { h: "Si nous n'arrivons pas à vous joindre", p: ["Si vous ne répondez pas, nous rappelons plusieurs fois. Indiquez un numéro correct et joignable : la commande n'est envoyée qu'après confirmation."] },
      ],
    },
    returns: {
      title: "Échange et retour", kicker: "Échange sous 7 jours",
      intro: "Votre satisfaction compte. Vous pouvez demander l'échange d'un produit dans les 7 jours suivant la réception, aux conditions suivantes.",
      blocks: [
        { h: "Conditions d'échange", list: [
          "Demande faite dans les 7 jours suivant la réception du colis.",
          "Produit non ouvert et non utilisé, dans sa boîte d'origine avec son film de protection.",
          "Pour des raisons d'hygiène, les soins et produits d'hygiène intime ouverts ne peuvent pas être échangés.",
        ] },
        { h: "Produit abîmé ou erroné ?", p: ["Si vous recevez un produit abîmé ou différent de votre commande, contactez-nous sous 48 h avec une photo du produit et du colis. Nous le remplaçons et prenons en charge la livraison."] },
        { h: "Comment demander un échange ?", list: [
          "Appelez-nous au {phone} ou écrivez-nous sur WhatsApp.",
          "Indiquez le numéro de commande (commence par RQ) et le motif.",
          "Nous convenons avec vous du retour du produit et de l'envoi du remplacement.",
        ] },
        { h: "Frais de livraison", p: ["En cas de changement d'avis, les frais de livraison de l'échange sont à votre charge. En cas d'erreur de notre part ou de produit abîmé, ils sont à notre charge."] },
        { h: "Refus du colis", p: ["Vous pouvez refuser le colis à la livraison si l'emballage est endommagé. Des refus répétés sans motif peuvent nous amener à ne plus accepter de commandes de ce numéro."] },
      ],
    },
    privacy: {
      title: "Politique de confidentialité", kicker: "Protection de vos données",
      intro: "Nous respectons votre vie privée. Cette page explique quelles informations nous collectons et pourquoi, conformément à la loi algérienne n° 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.",
      blocks: [
        { h: "Ce que nous collectons", list: [
          "Nom, prénom et numéro de téléphone.",
          "Wilaya, commune et adresse (uniquement pour la livraison).",
          "Détails de la commande : produits, quantités, montant.",
          "Si vous saisissez votre téléphone sans terminer la commande, nous gardons les informations saisies pour vous aider à la finaliser.",
        ] },
        { h: "Pourquoi", list: [
          "Confirmer votre commande par téléphone ou WhatsApp.",
          "Envoyer et suivre le colis avec le transporteur.",
          "Améliorer la boutique et mesurer l'efficacité de nos publicités.",
        ] },
        { h: "Avec qui", p: ["Nous partageons nom, téléphone et adresse uniquement avec le transporteur, pour livrer le colis. Nous ne vendons ni ne louons vos données."] },
        { h: "Cookies et publicité", p: ["Le site peut utiliser les outils de mesure de Facebook (Meta) et TikTok pour savoir quelle publicité vous a amenée chez nous. Votre navigateur garde aussi votre panier, votre langue et vos informations pour faciliter la prochaine commande."] },
        { h: "Vos droits", p: ["Vous pouvez à tout moment demander à consulter, corriger ou supprimer vos données en nous contactant au {phone} ou sur WhatsApp."] },
      ],
    },
    terms: {
      title: "Conditions générales", kicker: "{store}",
      intro: "En utilisant le site et en passant commande, vous acceptez les conditions suivantes.",
      blocks: [
        { h: "Commandes", list: [
          "La commande est définitive après confirmation par téléphone.",
          "Nous pouvons refuser ou annuler une commande en cas de rupture de stock, d'informations incorrectes ou de commandes répétées non sérieuses.",
          "Le nombre de commandes par numéro et par jour est limité ; appelez-nous pour en ajouter.",
        ] },
        { h: "Prix", p: ["Les prix sont en dinars algériens. Les frais de livraison s'ajoutent selon la wilaya et le mode choisi, et sont affichés avant la confirmation. Les prix peuvent changer ; le prix appliqué est celui affiché au moment de la commande."] },
        { h: "Paiement et livraison", p: ["Paiement en espèces à la livraison. Le délai indiqué ({delivery}) est estimatif et peut varier pour des raisons indépendantes de notre volonté (charge des transporteurs, météo…)."] },
        { h: "Produits", p: ["Nous veillons à des photos et informations exactes ; l'emballage peut légèrement varier selon les lots. Les informations ne remplacent pas l'avis d'un médecin ou d'un pharmacien ; respectez le mode d'emploi indiqué sur le produit."] },
        { h: "Échanges", p: ["Les demandes d'échange suivent les conditions de la page « Échange et retour »."] },
        { h: "Contact", p: ["Pour toute question : {phone} ou WhatsApp."] },
      ],
    },
  },
};

export const FAQ: Record<"ar" | "fr", [string, string][]> = {
  ar: [
    ["كيف أطلب؟", "اختاري المنتج، املئي الاستمارة (الاسم، الهاتف، الولاية والبلدية) واضغطي «تأكيد الطلب». نتصل بكِ خلال {confirm} للتأكيد."],
    ["هل يجب أن أدفع مسبقاً؟", "لا. الدفع نقداً فقط عند استلام الطرد، ولا نطلب أي معلومات بنكية."],
    ["متى يصلني الطلب؟", "خلال {delivery} حسب ولايتكِ، بعد التأكيد عبر الهاتف."],
    ["كم سعر التوصيل؟", "يظهر تلقائياً في الاستمارة حسب ولايتكِ وطريقة التوصيل (المنزل أو المكتب). يمكنكِ أيضاً معرفته من صفحة «التوصيل والدفع»."],
    ["ما الفرق بين التوصيل للمنزل والمكتب؟", "للمنزل: يوصل عامل التوصيل الطرد إلى عنوانكِ. للمكتب: تستلمينه من مكتب شركة التوصيل في ولايتكِ، وغالباً بسعر أقل."],
    ["هل الطرد سري؟", "نعم، التغليف لا يحمل أي إشارة إلى المحتوى."],
    ["هل يمكنني تعديل أو إلغاء طلبي؟", "نعم، قبل الإرسال. أخبرينا عند اتصالنا بكِ للتأكيد، أو اتصلي بنا على {phone}."],
    ["هل يمكنني استبدال منتج؟", "نعم، خلال 7 أيام من الاستلام إذا كان المنتج غير مفتوح وفي علبته الأصلية. التفاصيل في صفحة «الاستبدال والإرجاع»."],
    ["لم يتصل بي أحد بعد الطلب، ماذا أفعل؟", "تأكدي أن رقمكِ صحيح ومتاح، أو راسلينا عبر WhatsApp مع رقم الطلب الذي ظهر في صفحة الشكر."],
    ["هل المنتجات مناسبة للحامل أو المرضع؟", "بعض المنتجات تحتاج استشارة الطبيب أو الصيدلي أولاً، خاصة المكملات. اسألينا قبل الطلب إن كان لديكِ شك."],
  ],
  fr: [
    ["Comment commander ?", "Choisissez le produit, remplissez le formulaire (nom, téléphone, wilaya et commune) puis « Confirmer la commande ». On vous appelle sous {confirm} pour confirmer."],
    ["Dois-je payer à l'avance ?", "Non. Paiement en espèces uniquement à la réception, et aucune information bancaire n'est demandée."],
    ["Quand vais-je recevoir ma commande ?", "Sous {delivery} selon votre wilaya, après confirmation par téléphone."],
    ["Combien coûte la livraison ?", "Le prix s'affiche automatiquement dans le formulaire selon votre wilaya et le mode choisi (domicile ou stop desk). Vous pouvez aussi le voir sur la page « Livraison et paiement »."],
    ["Domicile ou stop desk ?", "À domicile : le livreur vient à votre adresse. Stop desk : vous récupérez le colis au bureau du transporteur, souvent moins cher."],
    ["Le colis est-il discret ?", "Oui, l'emballage ne mentionne pas le contenu."],
    ["Puis-je modifier ou annuler ma commande ?", "Oui, avant l'envoi. Dites-le-nous lors de l'appel de confirmation ou appelez le {phone}."],
    ["Puis-je échanger un produit ?", "Oui, sous 7 jours après réception si le produit n'est pas ouvert et dans sa boîte d'origine. Détails sur la page « Échange et retour »."],
    ["Personne ne m'a appelée, que faire ?", "Vérifiez que votre numéro est correct et joignable, ou écrivez-nous sur WhatsApp avec le numéro de commande affiché sur la page de remerciement."],
    ["Les produits conviennent-ils pendant la grossesse ?", "Certains produits, surtout les compléments, nécessitent l'avis d'un médecin ou d'un pharmacien. Demandez-nous avant de commander en cas de doute."],
  ],
};
