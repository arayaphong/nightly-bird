# Nightly Bird

โปรเจกต์ศึกษาเกม 2D ด้วย **Defold + Lua + Rive** เปิด `game.project` ที่ root
ภาพตัวละครและวัตถุยังเป็นเวกเตอร์จริงจาก SVG ไม่มี sprite sheet หรือ flipbook
ฟอนต์ไทยใช้ Mitr พร้อมระบบจัดวางสระและวรรณยุกต์ของ HarfBuzz/SkriBidi

ไอคอนหมุนจอด้านบนกลางสลับแนวตั้ง 480×800 กับแนวนอน 1280×720 ได้ทุกหน้า
รักษาสัดส่วนเวกเตอร์และค่าทดสอบเดิม พร้อมจำแนวที่เลือกไว้เมื่อเปิดเว็บใหม่
ทดลองเว็บผ่าน [Studio Preview](https://nightly-bird-studio-arayaphong.arme555.chatgpt.site)
(เข้าสู่ระบบด้วยบัญชีเจ้าของ) รายละเอียดอยู่ที่ [portrait.md](docs/portrait.md)

เวอร์ชัน 0.8.26 ลดงาน CPU ที่ตรวจค่า Rive subscription ในฉากกลางคืน/น้ำ/ปลา
โดยคงภาพและจำนวนวัตถุเดิม ดูสาเหตุและผลทดสอบที่ [performance.md](docs/performance.md)

เวอร์ชัน 0.8.27 เพิ่มการแตะเหนือผิวน้ำในระยะ 128 หน่วยเพื่อวางนกตาย
ให้ปลาพุ่งโจมตีแบบ legacy พร้อมเสียง ดู [ฉากทดสอบปลา](studio/scenery/fish/README.md)

เวอร์ชัน 0.8.28 เมื่อปลากระโดดกัดโดนนก จะคาบนกที่ย่อขนาดลงติดปากไปด้วย
ทั้งตอนกลับลงน้ำและว่ายต่อ แตะวางนกใหม่เพื่อเริ่มทดสอบอีกครั้งได้

เวอร์ชัน 0.8.29 ปลาที่คาบนกว่ายสลับซ้ายขวาอย่างรวดเร็วพร้อมเร่งหางและครีบ
และแก้ปากปลาถูกตัดเมื่อหมุน โดยปิดการตัดขอบกรอบนอกของ Rive

## พื้นที่ทำงาน

- **Studio** — ออกแบบและทดสอบส่วนประกอบทีละหน่วย: ตัวละคร/วัตถุ,
  ฉาก/ฟิสิกส์/การชน/state และกติกา/ไอเท็ม
- **Scenarios** — รวมส่วนประกอบเป็นฉากทดสอบอิสระ เลือกเข้าทีละฉากได้
  ยังไม่มีฉากรวมในเวอร์ชันนี้
- **Game** — ตัวเกมที่เชื่อมการดำเนินเกมและเรื่องราว ในมุมที่ผู้เล่นจริงเห็น
  ยังไม่เริ่มประกอบ และชื่อนี้ไม่ได้หมายถึงเกมที่เสร็จสมบูรณ์หรือพร้อม production

หน้าแรกมี Studio กับ Scenarios ภายใน Studio หมวดตัวละครและวัตถุมี
นกแดง ปลา เหยี่ยว หิ่งห้อย ลูกโป่ง และเมฆฝน ส่วนหมวดที่ยังไม่พัฒนาจะแจ้งไว้ชัดเจน
ปุ่มย้อนกลับหรือ Esc กลับขึ้นทีละระดับ

## หาไฟล์จากหน้าที่

```text
app/                 จุดเริ่มต้น เมนู การนำทาง และ native manifest
studio/              หน้าทดลองและตัวควบคุมสำหรับแต่ละหมวด
  characters/        หน้ารวม 6 ตัวละคร/วัตถุ และตัวควบคุมหน้าทดสอบ
  scenery/           พื้นที่สำหรับฉาก platform ฟิสิกส์ การชน และ state
  rules_and_items/   พื้นที่สำหรับการทดสอบกติกาและไอเท็ม
scenarios/           รายการและฉากทดสอบภาพรวมที่แยกอิสระ
game/              ตัวเกมที่เชื่อมการดำเนินเรื่อง (ยังไม่เริ่ม)
shared/              ส่วนประกอบที่ Studio / Scenarios / Game ใช้ร่วมกัน
  characters/        red_bird, fish, hawk: motion, rig, และภาพ Rive
  objects/           firefly, balloon, rain_cloud: motion และภาพ Rive
  items/             กลไกการติดตั้งไอเท็ม
  display/           หน่วยโลกและสัดส่วนหน้าจอ
  input/             กลไก gesture
  render/            การวาดเวกเตอร์และ GUI
  rules/             กติกา Lua ที่ไม่ผูกกับ renderer
assets/              ต้นฉบับ SVG ที่ใช้งาน เสียง และฟอนต์
input/               input bindings ของ Defold
scripts/             build, สร้างเวกเตอร์, parity, Pages และตัวเปิด Web preview
tests/              unit / browser / vector / font_proof
docs/               สถาปัตยกรรม วิธี build และแผน refactor
legacy/              HTML/JS เดิมพร้อม assets/tools/tests สำหรับอ้างอิง
```

## Build และตรวจสอบ

ใช้ Python 3.11+ และ Java 25 JDK โดยไม่ต้องเปิด GUI editor:

```sh
python3 scripts/defold.py build
python3 scripts/defold.py serve
python3 scripts/defold.py build --target android
python3 scripts/defold.py build --target linux
python3 scripts/package_linux.py
```

Web: `dist/defold/Nightly Bird/` ต้องเปิดผ่าน HTTP(S)
APK สำหรับทดสอบ ARM64: `dist/android/NightlyBird/NightlyBird.apk`
Linux x86_64 แบบ Release: `dist/linux-package/` รองรับ Wayland ใช้ Vulkan
ดูวิธีเปิดและข้อกำหนดระบบที่ [linux.md](docs/linux.md)
เก็บ `debug.keystore` และไฟล์รหัสผ่านไว้ในเครื่อง เพื่อให้ติดตั้งทับ APK เดิมได้

ดู [วิธี build และทดสอบ](docs/building.md), [โครงสร้างและการเพิ่มงาน](docs/architecture.md)
และ [แผน refactor พร้อมผลแต่ละขั้น](docs/refactor-plan.md)
การทดสอบแอนิเมชันยังเทียบกับ JS ใน `legacy/` โดยตรง

```sh
npm --prefix legacy run check
npm --prefix legacy test
npm --prefix legacy run build
python3 scripts/defold_pages.py
```

Pages ที่ประกอบแล้วอยู่ใน `dist/pages/`: Defold ที่ `/` และ HTML/JS เดิมที่ `/legacy/`
`legacy/assets/` เป็น snapshot อ้างอิง ส่วน `assets/svg/` เป็นต้นฉบับเวกเตอร์ที่พัฒนาต่อ

งานอยู่บน `defold/development` GitHub Actions build เฉพาะ Web
APK build ด้วยมือ และรอการอนุมัติหลังทดสอบ APK ก่อนทำ PR/merge เข้า `development`
