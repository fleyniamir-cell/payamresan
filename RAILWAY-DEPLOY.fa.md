# راهنمای دیپلوی Songbird روی Railway

این پروژه از قبل یک `Dockerfile` کامل (کلاینت + سرور + ffmpeg) داره، پس روی Railway به راحتی
با همون Dockerfile ساخته و اجرا می‌شه. فایل `railway.json` اضافه شده تا Railway مستقیم از
Dockerfile استفاده کنه.

## ۱. آماده‌سازی مخزن (Repository)

Railway معمولاً از یک ریپوی گیت‌هاب دیپلوی می‌کنه:

1. یک ریپوی جدید روی گیت‌هاب بساز.
2. کل محتوای این پوشه (شامل `railway.json`) رو داخلش push کن.

اگه نمی‌خوای از گیت‌هاب استفاده کنی، می‌تونی با **Railway CLI** مستقیم از روی سیستم خودت
دیپلوی کنی (بخش ۶).

## ۲. ساخت پروژه روی Railway

1. وارد [railway.app](https://railway.app) شو و یک پروژه جدید بساز.
2. گزینه **Deploy from GitHub repo** رو انتخاب کن و ریپوی بالا رو وصل کن.
3. Railway به‌طور خودکار `railway.json` رو تشخیص می‌ده و از `Dockerfile` برای build استفاده می‌کنه.

## ۳. اضافه کردن Volume برای دیتای دائمی (خیلی مهم)

سرور دیتابیس (SQLite via sql.js)، فایل‌های آپلودی و کلیدهای Push رو داخل `/app/data` ذخیره
می‌کنه. بدون Volume، با هر ری‌دیپلوی همه‌ی این‌ها پاک می‌شن.

در پنل سرویس روی Railway:
1. برو به تب **Volumes**.
2. یک Volume جدید بساز و مسیر Mount رو دقیقاً روی این مقدار بذار:
   ```
   /app/data
   ```

## ۴. تنظیم متغیرهای محیطی (Environment Variables)

در تب **Variables** سرویس، این‌ها رو اضافه کن:

| متغیر | مقدار پیشنهادی |
|---|---|
| `APP_ENV` | `production` |
| `SIGN_UP` | `true` یا `false` (بسته به نیازت) |
| `ADMIN_PANEL` | `true` |
| `STORAGE_ENCRYPTION_KEY` | **حتماً خودت یک مقدار ثابت بذار** (پایین توضیح داده شده) |
| `VAPID_SUBJECT` | مثلاً `mailto:you@example.com` |

> [!IMPORTANT]
> `STORAGE_ENCRYPTION_KEY` رو حتماً *خودت* از قبل مقداردهی کن و ثابت نگه دار.
> اگه خالی بمونه، سرور در هر اجرا یک کلید تصادفی جدید می‌سازه و توی فایل `.env` ریشه‌ی
> پروژه می‌نویسه — که روی Railway جزو دیتای دائمی نیست و با هر ری‌دیپلوی از بین می‌ره.
> نتیجه‌ش این می‌شه که پیام‌ها/فایل‌های رمزنگاری‌شده با کلید قبلی دیگه قابل خوندن نیستن.
>
> برای ساخت یک کلید امن، این دستور رو یک‌بار لوکال روی خودت اجرا کن و خروجیش رو
> در Railway به عنوان مقدار `STORAGE_ENCRYPTION_KEY` بذار:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
> ```

کلیدهای VAPID (برای Push Notification) نیازی به تنظیم دستی ندارن — خودشون تولید و داخل
همون Volume دائمی (`/app/data/vapid.env`) ذخیره می‌شن و بین ری‌دیپلوی‌ها باقی می‌مونن.

## ۵. پورت و دامنه

- سرور به‌صورت خودکار از متغیر `PORT` که Railway تزریق می‌کنه استفاده می‌کنه (نیازی به
  تنظیم `SERVER_PORT` نیست).
- بعد از اولین دیپلوی موفق، از تب **Settings > Networking** روی سرویس، گزینه
  **Generate Domain** رو بزن تا یک آدرس عمومی (`*.up.railway.app`) بگیری، یا دامنه‌ی
  خودت رو وصل کن.
- چون HTTPS برای Push Notification لازمه، دامنه‌ی Railway یا هر دامنه‌ای که از Railway
  گواهی SSL خودکار می‌گیره کافیه — نیازی به تنظیم دستی nginx/certs (که در `docker-compose.yaml`
  اصلی برای دیپلوی روی VPS بود) نیست؛ Railway خودش این لایه رو مدیریت می‌کنه.

## ۶. جایگزین: دیپلوی مستقیم با Railway CLI (بدون گیت‌هاب)

```bash
npm i -g @railway/cli
railway login
cd Songbird-main
railway init
railway up
```

بعدش مراحل ۳ و ۴ (Volume و Environment Variables) رو از داشبورد وب انجام بده.

## ۷. نکته درباره‌ی Replica

فایل `railway.json` تعداد replica رو روی `1` قفل کرده. **این عمداً هست** — چون دیتابیس
sql.js یک فایل تکی روی دیسکه و چند نسخه‌ی همزمان از سرور نمی‌تونن به‌طور امن همزمان
بهش بنویسن. اگه بعداً خواستی مقیاس بدی، باید اول دیتابیس رو به یک سرویس واقعی مثل
Postgres مهاجرت بدی (که تغییر کد قابل توجهی می‌طلبه).

## خلاصه چک‌لیست

- [ ] ریپو به گیت‌هاب push شد (یا از CLI استفاده شد)
- [ ] پروژه روی Railway از Dockerfile ساخته شد
- [ ] Volume روی `/app/data` وصل شد
- [ ] `STORAGE_ENCRYPTION_KEY` با مقدار ثابت خودت تنظیم شد
- [ ] دامنه (Generate Domain) فعال شد
