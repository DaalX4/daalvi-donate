/* DAALVI /donate — CONTENT & CONFIG. Everything you are likely to edit lives here; no need to touch the HTML/CSS/JS.
   (Plain JS object instead of .json so the page also opens straight from disk with a double click. Converting it to JSON later is trivial.) */
window.DONATE_CONTENT = {

  /* 1 — the goal */
  goal: {
    title: 'جبران محبت خانواده'
  },

  /* Progress. ONE switch: progress.enabled.
     false → NO number is shown; the oval stays an empty pencil line (calm, honest, nothing invented).
     true  → the page asks `endpoint` and draws goal.percent as a sage stroke around the oval + the number inside.
             If the request fails, the page falls back to the empty state by itself (never shows a guess).
     The hub address below is LOCAL (only works on the streaming PC). Before enabling this on the public site, point `endpoint`
     to a small public read-only JSON that returns the same shape: { "goal": { "percent": 0, "raised": 0, "target": 50000000 } }. */
  progress: {
    enabled: false,
    mode: 'manual',            /* 'manual' = raised / target typed in the admin panel (default, safe for the public site); 'hub' = read the local streaming hub */
    raised: 0,
    target: 50000000,
    endpoint: '',
    refreshSeconds: 120
  },

  /* Saved edits (admin panel) are loaded from this public read-only address and laid over everything below. If it is unreachable the defaults here are shown. */
  remote: { enabled: true, url: 'https://www.daalvi.com/_functions/donateConfig' },

  /* 2 — story sections, in order. Each paragraph is one string. */
  sections: [
    {
      heading: 'چرا این هدف برام مهمه؟',
      paragraphs: [
        'تا امروز، خانواده‌ام بزرگ‌ترین پشتوانه من توی روزهای سخت زندگی بودن. بارها دستم رو گرفتن و نذاشتن زمین بخورم. توی هر دو مسیر مهاجرتم، با تمام سختی‌هایی که داشت، همیشه کنارم بودن.',
        'حالا دوست دارم این هدف رو به خانواده‌ام تقدیم کنم؛ به آدم‌هایی که این روزها خودشون هم سخت در تلاش هستن تا زندگی بهتری بسازن.',
        'دلم می‌خواد بتونم بخشی از بار روی دوششون رو سبک کنم؛ از هزینه‌های جابه‌جایی گرفته تا بدهی‌هایی که پیش رو دارن. بیشتر از هر چیزی، دوست دارم کمی از آرامش خاطری رو که توی تمام این سال‌ها بهم دادن، به زندگی خودشون برگردونم.',
        'می‌دونم این عدد هیچ‌وقت نمی‌تونه جبران تمام زحمت‌ها و محبت‌هاشون باشه. اما برای من، قدم کوچیکیه برای اینکه بتونم ذره‌ذره عشق و آرامش بیشتری به زندگی و آینده‌شون اضافه کنم.'
      ]
    },
    {
      heading: 'کمی درباره من و مسیری که دوستش دارم',
      paragraphs: [
        'یکی از بزرگ‌ترین دغدغه‌های من همیشه این بوده که بتونم مسیر هنری‌ام رو ادامه بدم و زنده نگهش دارم.',
        'فکر می‌کنم خیلی از ما، حداقل یک بار، به این فکر کردیم که چیزی رو که واقعاً دوست داریم کنار بذاریم و سراغ کاری بریم که شاید هیچ علاقه‌ای بهش نداریم، اما درآمد بیشتری داره.',
        'توی دنیایی که گاهی هنر و تلاش هنرمندها اون‌طور که باید دیده نمی‌شه، من هنوز دلم می‌خواد این روزنه نور رو روشن نگه دارم.',
        'حمایت شما فقط کمک مالی نیست؛ بهم امید می‌ده که بتونم به این مسیر ادامه بدم و کاری رو رها نکنم که عاشقانه دوستش دارم و سال‌ها براش تلاش کردم.'
      ]
    }
  ],

  /* 4 — donation options. Data-driven: to add one later (e.g. crypto) add an item here. `enabled:false` keeps it hidden.
     Order here = order on the page. `tone` only picks the colour of the pencil underline (sage | kraft | ink). */
  donate: [
    { id: 'usd',  icon: 'usd', label: 'حمایت دلاری',  href: 'https://ko-fi.com/daalvi',    tone: 'sage',  enabled: true,  newTab: true },
    { id: 'toman', icon: 'toman', label: 'حمایت تومانی', href: 'https://donofa.com/daalvi', tone: 'kraft', enabled: true,  newTab: true },
    /* crypto slot — prepared, NOT shown. Fill in label/href and set enabled:true when it exists. */
    { id: 'crypto', icon: 'crypto', label: '', href: '', tone: 'ink', enabled: false, newTab: true }
  ],

  /* Site menu shown at the top (same destinations as the daalvi.com menu; opens in the same tab). */
  nav: [
    { label: 'HOME', href: 'https://www.daalvi.com' },
    { label: 'PORTFOLIO', href: 'https://www.daalvi.com/portfolio' },
    { label: 'CONTACT', href: 'https://www.daalvi.com/contact' },
    { label: 'ABOUT', href: 'https://www.daalvi.com/about' }
  ],

  /* Top supporters: empty state for now (no names, no amounts). Not connected to any donation data yet. */
  supporters: { heading: 'برترین حامیان', note: 'هنوز حامی برتری ثبت نشده است.', slots: 3 },

  /* Contact & collaboration (very short block above the footer). */
  reach: { heading: 'ارتباط و همکاری', email: 'aboutdaalvi@gmail.com' },

  /* 5 — footer. Only entries with enabled:true and a real href are drawn. Add the other handles when confirmed. */
  footer: {
    signature: 'DAALVI',
    home: { label: 'daalvi.com', href: 'https://www.daalvi.com' },
    socials: [   /* same social links as the main website footer (LinkedIn is not live there yet, so it is left out) */
      { label: 'Instagram', href: 'https://www.instagram.com/aboutdaalvi/' },
      { label: 'YouTube', href: 'https://www.youtube.com/c/Daalvi' }
    ],
    brand: { label: 'DAALVI', href: 'https://daalvi.com/' },
    copyright: '© 2025 DAALVI. All rights reserved.',
    links: [
      { label: 'Kick', href: 'https://kick.com/daalvi', enabled: true },
      { label: 'Instagram', href: '', enabled: false },
      { label: 'YouTube', href: '', enabled: false },
      { label: 'Telegram', href: '', enabled: false }
    ]
  }
};

/* English overlay (shown when the visitor picks English). Texts only; links, amounts and progress come from the settings above. */
window.DONATE_EN = {
  title: 'Giving Back My Family’s Love',
  sections: [
    { heading: 'Why does this goal matter to me?', paragraphs: [
      'Until today, my family has been my greatest support through the hardest days of my life. Again and again they took my hand and never let me fall. Through both of my migrations, with all the hardship they carried, they were always by my side.',
      'Now I’d love to dedicate this goal to them — to people who, even these days, are working hard themselves to build a better life.',
      'I want to lighten some of the weight on their shoulders, from moving costs to the debts still ahead of them. More than anything, I’d like to give back a little of the peace of mind they gave me through all these years.',
      'I know this number could never repay all their effort and love. But to me, it’s a small step toward adding a little more love and calm, bit by bit, to their life and their future.' ] },
    { heading: 'A little about me, and the path I love', paragraphs: [
      'One of my biggest concerns has always been how to keep my artistic path going and keep it alive.',
      'I think many of us have, at least once, thought about setting aside what we truly love and going after work we may have no interest in at all, simply because it pays more.',
      'In a world where art and the effort of artists aren’t always seen the way they should be, I still want to keep this small glimmer of light burning.',
      'Your support isn’t only financial help; it gives me hope that I can keep going on this path, and not give up the work I love so deeply and have worked toward for years.' ] }
  ],
  donate: { usd: 'Support in USD', toman: 'Support in Toman' },
  supporters: { heading: 'Top Supporters', note: 'No top supporter has been recorded yet.' },
  reach: 'Contact & Collaboration'
};
