# สร้างแอป Android

โปรเจกต์ Android อยู่ในโฟลเดอร์ `android/` และใช้ Capacitor ห่อเว็บที่ https://168.db357.com

ไฟล์ดีบักที่คอมไพล์แล้วอยู่ที่ `public/land-finance.apk` และเปิดดาวน์โหลดที่ https://168.db357.com/land-finance.apk นี่เป็นแพ็กเกจดีบักที่ลงนามด้วยคีย์ดีบักของเครื่องสร้าง ไม่ใช่แพ็กเกจร้านค้าที่ลงนามสำหรับ Play

ถ้าจะสร้างใหม่ ให้ติดตั้ง Android SDK แล้วทำตามขั้นตอนนี้

1. ติดตั้งแพ็กเกจจากรากโปรเจกต์ด้วย `npm install`
2. ซิงก์เว็บเข้าโปรเจกต์ Android ด้วย `npx cap sync android`
3. เปิด Android Studio ด้วย `npx cap open android` หรือรันเกรเดิลเอง
4. จากโฟลเดอร์ `android/` สร้างแพ็กเกจดีบักด้วย `./gradlew assembleDebug`
5. ไฟล์ APK จะอยู่ที่ `android/app/build/outputs/apk/debug/app-debug.apk`

ต้องมี Android SDK และ Java ที่ Android Studio ติดตั้งให้ ถ้าคำสั่งเกรเดิลบอกว่าไม่พบ SDK แสดงว่ายังไม่ได้คอมไพล์ APK
