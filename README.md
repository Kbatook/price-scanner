# سكنر أسعار – Price Scanner

محرك بحث يقارن أسعار المنتجات في المتاجر السعودية والعالمية التي تشحن للسعودية، ويعرضها بالريال السعودي. **مجاني بالكامل.**

## الملفات

| الملف | الوظيفة |
|---|---|
| `index.html` | الصفحة (وفيها إعدادات SEO) |
| `styles.css` | التصميم، يبدأ من الجوال ويدعم RTL |
| `app.js` | منطق البحث والفلاتر والتبديل بين العربية والإنجليزية |
| `config.js` | **الملف الوحيد الذي تعدّله**: رابط الـ Worker |
| `favicon.svg` | أيقونة الموقع |
| `worker/worker.js` | الطبقة الخلفية على Cloudflare (لا تُرفع إلى GitHub Pages، لكن رفعها آمن) |

> إذا كان `WORKER_URL` فارغاً، يعمل الموقع في **وضع تجريبي** ويعرض أسعاراً توضيحية.

---

## خطوات التشغيل (حوالي 15 دقيقة)

### 1) مفتاح SerpApi (مجاني، 250 بحثاً شهرياً)
1. سجّل في https://serpapi.com، ولا يحتاج التسجيل بطاقة ائتمان.
2. من صفحة **Dashboard** انسخ **Your Private API Key**.
3. ⚠️ لا تضع هذا المفتاح في أي ملف داخل GitHub.

### 2) الـ Worker على Cloudflare (مجاني)
1. سجّل في https://dash.cloudflare.com.
2. افتح **Workers & Pages**، ثم **Create**، ثم **Create Worker**، وسمّه `price-scanner` واضغط **Deploy**.
3. اضغط **Edit code**، واحذف الكود الموجود، والصق محتوى `worker/worker.js` كاملاً، ثم اضغط **Deploy**.
4. **مخزن الكاش (KV):** من القائمة الجانبية افتح **Storage & Databases**، ثم **KV**، ثم **Create**، وسمّه `price-scanner-cache`.
5. ارجع إلى الـ Worker وافتح **Settings**، ثم **Bindings**، ثم **Add**، واختر **KV namespace**:
   - Variable name: `CACHE`
   - KV namespace: `price-scanner-cache`
6. من **Settings** افتح **Variables and Secrets**، ثم **Add**:
   - `SERPAPI_KEY` من نوع **Secret**، وقيمته المفتاح الذي نسخته من SerpApi.
   - `ALLOWED_ORIGINS` من نوع **Text**، وقيمته `https://kbatook.github.io`، دون مسار أو `/` في النهاية.
   - `DAILY_LIMIT` من نوع **Text**، وقيمته `8`، وهي عدد عمليات البحث الجديدة المسموح بها يومياً حتى تكفي الحصة الشهرية.
7. انسخ رابط الـ Worker، ويكون بهذا الشكل: `https://price-scanner.xxxx.workers.dev`
8. للتأكد من أن الـ Worker يعمل، افتح الرابط مضافاً إليه `/health`. يجب أن يظهر `{"ok":true,...}`.

### 3) ربط الموقع بالـ Worker
افتح `config.js` وضع الرابط:
```js
window.PRICE_SCANNER_CONFIG = {
  WORKER_URL: 'https://price-scanner.xxxx.workers.dev',
};
```

### 4) النشر على GitHub Pages
1. في GitHub اضغط **New repository**، وسمّه `price-scanner` واجعله **Public**.
2. اضغط **Add file**، ثم **Upload files**، وارفع: `index.html` و`styles.css` و`app.js` و`config.js` و`favicon.svg` و`README.md`، ثم **Commit**.
3. افتح **Settings**، ثم **Pages**، واختر في **Source** خيار **Deploy from a branch**، ثم Branch `main` والمجلد `/ (root)`، واضغط **Save**.
4. بعد دقيقة إلى دقيقتين يصبح الموقع متاحاً على: `https://kbatook.github.io/price-scanner/`

### 5) تحسين SEO
تم ضبط الرابط الكامل للموقع (`https://kbatook.github.io/price-scanner/`) في `index.html` مسبقاً، ولا يحتاج أي تعديل.

---

## كيف يوفّر الموقع الحصة المجانية
- **كاش في المتصفح:** يحفظ النتائج 6 ساعات.
- **كاش في الـ Worker (KV):** يحفظ النتائج 6 ساعات، فإذا بحث شخص آخر عن المنتج نفسه لا تُستهلك الحصة.
- **حد يومي (`DAILY_LIMIT`):** إذا وصل الموقع للحد تظهر رسالة، وتبرز روابط البحث المباشرة في المتاجر، وهذه الروابط تعمل دائماً دون أي حد.

## الأمان
- مفتاح SerpApi محفوظ في Cloudflare كـ Secret فقط، ولا يظهر في أي ملف.
- يرفض الـ Worker الطلبات القادمة من مواقع أخرى (`ALLOWED_ORIGINS`).
- يُتحقق من نص البحث في المتصفح وفي الخادم، ويقتصر على 2 إلى 100 حرف، مع حذف الرموز الخطرة.
- كل البيانات تُعرض بـ `textContent`، وهذا يحمي من XSS.

## حدود معروفة
- 250 بحثاً جديداً شهرياً من SerpApi (الخطة المجانية).
- الأسعار مصدرها Google Shopping، وقد لا تظهر كل المتاجر لكل منتج.
- بعض الروابط تفتح صفحة المنتج في Google Shopping بدل المتجر مباشرة، حسب ما يتيحه Google.
