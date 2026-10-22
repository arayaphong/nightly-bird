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

| ตำแหน่ง                 | หน้าที่                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `index.html`, `styles/` | โครงหน้าจอและ CSS                                                     |
| `src/main.js`           | เชื่อมระบบ รับอินพุต และเริ่มวงรอบเกม                                 |
| `src/game/`             | สถานะ วงรอบเกม ลำดับอัปเดต การเริ่มใหม่ การตาย ชุบชีวิต และซื้อไอเท็ม |
| `src/config/`           | ค่าปรับสมดุล แอนิเมชัน และตัวเลือกทดสอบ                               |
| `src/player/`           | การบิน การสัมผัสน้ำ และท่าทางนก                                       |
| `src/enemies/`          | สร้างศัตรู พฤติกรรมปลา/เหยี่ยว และพิกัดภาพปลา                         |
| `src/world/`            | ลม พายุ และการปลดล็อกอันตรายตามระยะทาง                                |
| `src/items/`            | หิ่งห้อย ของขวัญ แม่เหล็ก และอาวุธ                                    |
| `src/effects/`          | อายุและการเคลื่อนที่ของอนุภาค ข้อความ และซากปลา                       |
| `src/rendering/`        | วาดตัวละคร ฉาก ไอเท็ม และเอฟเฟกต์บน Canvas                            |
| `src/ui/`               | แสดง HUD หน้าจอเริ่ม/จบเกม และร้านค้า                                 |
| `src/platform/`         | Canvas ขนาดจอ คีย์บอร์ด/สัมผัส และ localStorage                       |
| `src/math/`             | ฟังก์ชันเรขาคณิตและสี                                                 |
| `assets/art/`           | ข้อมูลเวกเตอร์ สี และจุดหมุนของงานภาพ                                 |
| `tests/`                | ทดสอบกติกาเกมด้วย Node.js test runner                                 |

## หลักการทำงาน

- `src/game/state.js` แบ่งสถานะเป็น `session`, `viewport`, `controls`, `bird`, `enemies`, `world`, `items`, `effects` และ `uiState` โมดูล import เฉพาะกลุ่มที่ใช้ ไม่มีตัวแปรเกมบน `window`
- โมดูลแต่ละหมวดดูแลสถานะของหมวดนั้น ส่วน `game/lifecycle.js` ประสานการเปลี่ยนหลายระบบเมื่อเริ่มใหม่ ตาย หรือชุบชีวิต
- `game/update.js` ระบุลำดับอัปเดตอย่างชัดเจน โดยรักษาลำดับเดิมเพื่อไม่ให้จังหวะการชนและการโจมตีเปลี่ยน
- `rendering/renderer.js` กำหนดลำดับการวาด ภาพอ่านสถานะเกม ส่วนการเปลี่ยนสถานะอยู่ฝั่ง simulation
- `ui/` อ่านสถานะและอัปเดต DOM เฉพาะเมื่อข้อมูลเปลี่ยน ปุ่มส่งคำสั่งกลับผ่าน callback ที่ผูกไว้ใน `main.js`
- `game/loop.js` หยุด simulation ในร้านค้า แต่ยังวาดหน้าจอ และจำกัด `dt` สูงสุดเท่าต้นฉบับ
- โค้ดเกมไม่ import จาก UI หรือ renderer และไม่มี circular imports

ค่าหลักสำหรับปรับเกมอยู่ใน `src/config/game.js` เช่น AGI ระยะเริ่มมีปลา/เหยี่ยว/เมฆ
จำนวนหนอนที่ใช้ชุบชีวิต และระยะเวลาไอเท็ม ตัวเลือกทดลองเริ่มพร้อมปืนหรือเหยี่ยวอยู่ใน `src/config/debug.js`
ค่าท้องถิ่นด้านฟิสิกส์และสัดส่วนการวาดบางส่วนยังอยู่ในโมดูลที่ใช้งาน

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

เวอร์ชันนี้แยกโครงสร้างจาก HTML เริ่มต้นเป็น ESM โดยคงกติกาและงานภาพเดิม
