نشر متجر عالم المكسرات (يحتاج كمبيوتر، حوالي 10 دقائق)

0) قبل أي شي: افتح BotFather واكتب /revoke لتحصل على توكن جديد، واستخدمه بدل القديم.
1) أنشئ حساباً مجانياً على github.com، وأنشئ مستودعاً جديداً، وارفع إليه ملف index.html ومجلد api (وفيه order.js).
2) أنشئ حساباً على vercel.com بدخول GitHub، ثم Add New > Project، واختر المستودع.
3) قبل Deploy افتح Environment Variables وأضف:
   TELEGRAM_TOKEN = التوكن الجديد
   TELEGRAM_CHAT_ID = 7148857160
4) اضغط Deploy، ثم افتح الرابط وجرب طلباً تجريبياً. يجب أن يصلك على تليجرام.

تنبيه: لا تكتب التوكن داخل أي ملف، يوضع فقط في Environment Variables.
