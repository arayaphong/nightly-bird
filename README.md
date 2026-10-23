# นกแดงราตรี · Nightly Bird

เกมนกบินบน Canvas 2D เขียนด้วย JavaScript ES modules (`import` / `export`)
เบราว์เซอร์โหลดโมดูลโดยตรง ไม่ต้อง bundle และไม่มี runtime dependency

## เริ่มเล่นในเครื่อง

ใช้ Node.js 22 ขึ้นไป:

```sh
npm start
```

เปิด <http://localhost:8080> แตะค้าง หรือกด Space / ลูกศรขึ้นค้างเพื่อบินขึ้น ปล่อยเพื่อร่อนลง
เปลี่ยนพอร์ตได้ด้วย `PORT=3000 npm start`

ต้องเปิดผ่าน HTTP server เพราะเบราว์เซอร์จำกัดการโหลด ESM ผ่าน `file://`
สามารถใช้ static server อื่นแทนได้ โดยเสิร์ฟไฟล์ `.js` ด้วย JavaScript MIME type
ฟอนต์ Mitr โหลดจาก Google Fonts หากโหลดไม่ได้จะใช้ฟอนต์สำรองของเครื่อง

## โครงสร้าง

เกมประกอบจาก `Platform` และวัตถุที่มีสถานะของตัวเอง เช่น `Redbird`, `Shark`, `Hawk`,
`Firefly`, `BalloonGift`, `MessageBox`, `HIDTap` และ `RuleSet`
รายละเอียดหน้าที่ ความสัมพันธ์ lifecycle และตัวอย่างอยู่ใน [เอกสารสถาปัตยกรรม](./docs/architecture.md)

| ตำแหน่ง                    | หน้าที่                                                 |
| -------------------------- | ------------------------------------------------------- |
| `src/main.js`              | หน้าโหลด ปุ่มลองใหม่ และเริ่ม loop                      |
| `src/game/create-game.js`  | จุดประกอบ Platform, วัตถุ, input, UI และกฎ              |
| `src/core/`                | Platform, lifecycle, physics, collision และ RuleSet     |
| `src/objects/`             | นก ปลา เหยี่ยว หิ่งห้อย ของขวัญ กระสุน เมฆ น้ำ และฉาก   |
| `src/components/`          | อุปกรณ์ สถานะชั่วคราว และสายรุ้งที่มีเจ้าของเป็นนก      |
| `src/rules/`               | รอบเกม ผิวน้ำ การต่อสู้ รางวัล อาวุธ การเกิด และร้านค้า |
| `src/visuals/`             | แอนิเมชันและตัววาดภาพที่ผูกกับวัตถุแต่ละตัว             |
| `src/input/`               | รวม input และ adapter สัมผัส/คีย์บอร์ด/ตัวเลือก gamepad |
| `src/platform/`            | โหลด SVG/เสียง, viewport, renderer และบันทึกสถิติ       |
| `src/effects/`             | อนุภาคและเอฟเฟกต์                                       |
| `src/ui/`                  | HUD, MessageBox และ ShopPanel                           |
| `src/config/`, `src/math/` | ค่าปรับเกม จุดยึดภาพ และฟังก์ชันคำนวณ                   |
| `assets/svg/`              | ภาพ SVG ที่เกมโหลดจริง                                  |
| `assets/gallery.html`      | หน้ารวมภาพ SVG                                          |
| `tests/`                   | ทดสอบกติกาและ lifecycle โดยไม่ต้องมี DOM                |

## หลักการทำงาน

- Platform รับผิดชอบตำแหน่งจริงและการชน วัตถุระบุความเร็ว/แรงและดูแลพฤติกรรมตัวเอง
- กฎตัดสินผลข้ามวัตถุ เช่น ของซ้ำกลายเป็นหนอนหรืออุปกรณ์ป้องกันการโจมตี
- นกที่ถูกปลาคาบใช้ attachment และหยุดการเคลื่อนที่อิสระจนกว่าจะถูกปล่อย
- ไม่มีสถานะเกมแบบ singleton ในโมดูล สร้างหลาย instance ได้
- ภาพ SVG โหลดร่วมกันผ่าน AssetStore ส่วนแอนิเมชันและอุปกรณ์แยกต่อวัตถุ
- การวาดไม่แก้สถานะ simulation และ UI ส่งคำสั่งผ่าน Platform
- ร้านค้าและ pause หยุดเวลาเกม แต่เวลา UI เดินต่อ; ใช้ P/Escape เพื่อพักหรือเล่นต่อ
- input รวมการกดค้างจากหลายอุปกรณ์ และไม่รับการกดปุ่มเมนูเป็นการกระพือ
- ยังคง JavaScript ESM และค่า delta สูงสุดเดิม ไม่มี bundler หรือ runtime dependency

ค่าปรับสมดุลอยู่ใน `src/config/game.js` ตัวเลือกทดลองใน `src/config/debug.js`
และข้อมูลจุดยึดภาพอยู่ใน `src/config/art.js`
`HIDGamepad` เป็น adapter เสริม ยังไม่ได้เปิดในเกมเริ่มต้นและยังไม่มีการเลือกเมนูด้วย gamepad

## งานภาพ SVG

เปิด [หน้ารวมภาพ](./assets/gallery.html) ผ่าน `npm start` ที่ <http://localhost:8080/assets/gallery.html>
หรือเปิดไฟล์ใน `assets/svg/` ด้วยเบราว์เซอร์หรือโปรแกรมวาดเวกเตอร์ได้โดยตรง

เกมใช้ไฟล์เหล่านี้เป็นต้นฉบับจริง ไม่มีสำเนารูปทรงตัวละครใน JavaScript:

- `characters/bird.svg`: ลำตัว ปีก ขนปีก ตาแต่ละแบบ แก้ม และปาก
- `characters/fish.svg`: ลำตัว หาง ครีบ และเหงือก
- `characters/hawk.svg`, `characters/hawk-dive.svg`: ท่าบินและท่าพุ่ง พร้อมขนปีกแยกชิ้น
- `items/`: อุปกรณ์ ของขวัญ ลูกโป่ง หิ่งห้อย และไอคอน HUD; ชุดกันฟ้าแยกเสื้อกับฮู้ด

`src/platform/asset-store.js` โหลด SVG และถอด `<g data-sprite>` แต่ละชิ้นเป็นภาพที่เบราว์เซอร์ decode เพียงครั้งเดียว
จากนั้น Canvas วาดด้วย `drawImage` โดย JavaScript คุมเฉพาะตำแหน่ง การหมุน การย่อขยาย และสีแสง
ไม่มีการ fetch หรือ decode SVG ในวงรอบเกม ภาพที่ใช้แสดงสถานะไหม้เก็บสีไว้ใน `data-scorched-fill` / `data-scorched-stroke`
ส่วนแสงเรือง สีตา และแสงหิ่งห้อยเปลี่ยนสีจากหน้ากากภาพที่โหลดไว้และ cache แบบจำกัดจำนวน

เมื่อแก้ภาพ ให้แก้ path, สี หรือ gradient ใน SVG โดยรักษา `id`, `data-sprite` และข้อมูลจุดหมุน `data-*`
ของชิ้นส่วนไว้ `transform` ของกลุ่มกำหนดท่าพื้นฐาน ชิ้นส่วนที่มี `display="none"` เป็นท่าทางทางเลือก เช่น ตาตาย
ไม่ควรรวมทุกชิ้นเป็น path เดียว เพราะเกมต้องขยับปีก ตา ปาก หาง และครีบแยกกัน
หากเปลี่ยนระบบพิกัดหรือขนาดตัวละคร ให้ปรับ anchor ใน `src/config/art.js` และตรวจตำแหน่งการชนด้วย
แก้ SVG แล้วรีโหลดหน้าเกมเพื่อโหลดภาพใหม่ ไม่ต้องสร้างรูปจาก JavaScript หรือรันตัวสร้างภาพ

หน้าเริ่มเกมรอให้โหลดภาพครบ หากโหลดไม่ได้จะแสดงปุ่มลองอีกครั้ง
เอฟเฟกต์ที่สร้างตามสถานะ เช่น แสง น้ำ เมฆ สายฟ้า อนุภาค และเส้นเชื่อมลูกโป่งยังวาดด้วย Canvas
ไฟล์ไอคอนใน CSS และภาพทั้งหมดอยู่ใน `assets/` จึงถูกรวมใน `npm run build` และ GitHub Pages ด้วย

เมื่อกินหิ่งห้อย ตัวหิ่งห้อยจะติดอยู่ในปากและขยับตามนกระหว่างเคี้ยว
จากนั้นหายไปเมื่อเคี้ยวเสร็จ ใช้ทั้งแบบปกติและสายรุ้ง
หากกินหลายตัวติดกันจะหายพร้อมกันเมื่อจบรอบเคี้ยวล่าสุด

## เสียง

`assets/audio/crunch.wav` เป็นเสียงตอนนกกินหิ่งห้อย ทั้งแบบปกติและแบบสายรุ้ง
โหลดและ decode ครั้งเดียวผ่าน `AudioSystem` แล้วเล่นเมื่อได้รับเหตุการณ์ `firefly-eaten`
จากการเก็บสำเร็จ ไฟล์ถูกตัดช่วงเบาต้นเสียงออกแล้ว เหลือประมาณ 0.365 วินาที (64 KB)
จึงเล่นจากต้นไฟล์ได้ทันทีและลดข้อมูลที่ต้องโหลด รายการไฟล์เสียงอยู่ใน `src/config/audio.js`
การแตะหรือกดปุ่มจะปลดล็อกเสียงตามเงื่อนไขของเบราว์เซอร์
รองรับการกินหลายตัวติดกันโดยจำกัดจำนวนเสียงซ้อน หากโหลดเสียงไม่ได้เกมยังเล่นต่อได้

## ตรวจสอบ

```sh
npm run check
npm test
```

ไม่ต้องติดตั้ง dependency สำหรับสองคำสั่งนี้ `check` ตรวจ syntax, import path และ circular imports
ส่วน tests ตรวจการบิน กระเด้งน้ำ ศัตรู ไอเท็ม ชุบชีวิต ร้านค้า และการบันทึกคะแนน
การตรวจภาพและอินพุตจริงให้เปิดเกมในเบราว์เซอร์ทั้งแนวตั้งและแนวนอน

## CI/CD และ GitHub Pages

Workflow อยู่ที่ [`.github/workflows/pages.yml`](./.github/workflows/pages.yml)

- Push และ PR เข้า `development` หรือ `main`: ตรวจ syntax/imports, รัน tests และสร้างไฟล์เว็บไซต์
- Push เข้า `development`: เมื่อผ่านทั้งหมด จะ deploy ไป GitHub Pages อัตโนมัติ
- PR และ push เข้า `main` จะตรวจสอบเท่านั้น ขณะนี้ใช้ `development` เป็นสาขาสำหรับเผยแพร่เกม
- ใช้ `GITHUB_TOKEN` ที่ GitHub ออกให้แต่ละ run ไม่ต้องเพิ่ม PAT หรือ secret
- ให้สิทธิ์ `pages: write` และ `id-token: write` เฉพาะ job deploy; PR ไม่สามารถ deploy ได้

ตั้งค่าครั้งแรกใน repository:

1. เปิด **Settings → Pages → Build and deployment → Source** เลือก **GitHub Actions**
2. หาก environment `github-pages` จำกัดสาขาที่ deploy ได้ ให้เพิ่ม `development` ใน **Settings → Environments → github-pages**
3. หาก workflow รอบแรกหยุดเพราะยังไม่ได้เปิด Pages ให้เปิด run ใน **Actions** แล้วเลือก **Re-run failed jobs** หรือ push commit ใหม่เข้า `development`

หลัง deploy สำเร็จ เว็บไซต์อยู่ที่ <https://arayaphong.github.io/nightly-bird/>
ดูผลแต่ละรอบและลิงก์เว็บไซต์ได้ใน job **Deploy to GitHub Pages**

สร้างชุดไฟล์เผยแพร่ในเครื่องด้วย:

```sh
npm run build
```

คำสั่งนี้ล้างและสร้าง `dist/` ใหม่ โดยคัดลอกเฉพาะ `index.html`, `styles/`, `src/`, `assets/` และ `LICENSE`
พร้อม `.nojekyll` ไม่แปลงโค้ด ESM และไม่รวม tests หรือสคริปต์พัฒนาในเว็บไซต์
ไฟล์ใช้ relative paths จึงเปิดได้ทั้งที่ root ของเว็บและใต้ `/nightly-bird/`

## License

Copyright (c) 2026 Arayaphong Traisopon

ดู [LICENSE](./LICENSE): งานภาพ เสียง และเอกสารใช้ CC BY-NC 4.0
ซอร์สโค้ดใช้เงื่อนไข noncommercial ของโครงการ การนำไปใช้เชิงพาณิชย์ต้องได้รับอนุญาตก่อน

เวอร์ชันนี้ใช้ Platform และคลาสวัตถุแบบ ESM โดยรักษางานภาพและกติกาหลัก พร้อมแก้การจมน้ำ การรับ input และการตรวจชนระหว่างเฟรม
