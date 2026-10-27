-- Portrait layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local box,text=kit.box,kit.text
local WHITE,MUTED,ACCENT,PANEL=kit.WHITE,kit.MUTED,kit.ACCENT,kit.PANEL
local categories=require('studio.catalog');local scenarios=require('scenarios.catalog')
local function section(self,name,title,subtitle)
    local root=box(240,400,480,800,vmath.vector4());self.roots[name]=root;self.buttons[name]={}
    local function add(fn,...)
        local n=fn(...);gui.set_parent(n,root,true);gui.set_inherit_alpha(n,false);return n
    end
    local function label(...) return add(text,...) end
    local function button(y,route,caption,description)
        local n=add(box,240,y,410,96,PANEL);self.buttons[name][route]=n
        label(240,y+16,caption,25);label(240,y-20,description,15,MUTED)
    end
    label(240,752,'NIGHTLY BIRD',32);label(240,694,title,27,ACCENT);label(240,650,subtitle,16,MUTED)
    return label,button
end
    do
        local label,button=section(self,'home','เลือกพื้นที่ทำงาน','พัฒนาส่วนประกอบ หรือทดสอบภาพรวม')
        button(475,'studio','Studio','พัฒนาและทดสอบส่วนประกอบทีละหน่วย')
        button(345,'scenarios','Scenarios','ทดสอบภาพรวมเป็นฉากอิสระ')
        button(215,'system_info','System Info','FPS · WebGL · ความละเอียดเรนเดอร์')
        label(240,115,'1: Studio · 2: Scenarios · 3: System Info',12,MUTED)
    end
    do
        local label,button=section(self,'studio','Studio','เลือกหมวดทดสอบ')
        for i,item in ipairs(categories) do button(500-(i-1)*130,item.route,item.title,item.description) end
        label(240,100,'1–3: เลือกหมวด · Esc: หน้าหลัก',13,MUTED)
    end
    do
        local label,button=section(self,'scenarios','Scenarios','เลือกฉากทดสอบภาพรวม')
        if #scenarios==0 then
            label(240,425,'ยังไม่มีฉากทดสอบ',25)
            label(240,380,'แต่ละฉากจะเลือกเข้าได้อย่างอิสระ',17,MUTED)
            label(240,350,'เมื่อพร้อมทดสอบส่วนประกอบร่วมกัน',17,MUTED)
        else
            for i,item in ipairs(scenarios) do button(500-(i-1)*130,item.route,item.title,item.description) end
        end
    end
    do
        local label,button=section(self,'scenery','ฉากและฟิสิกส์','ฉาก · platform · การชน · state')
        button(500,'night_sky','ท้องฟ้ากลางคืน','ดาวระยิบระยับ · ฝุ่นเรืองแสง · ทิศทางลม')
        button(370,'night_water','ท้องฟ้าและผิวน้ำ','ท้องฟ้ากลางคืน · คลื่นเวกเตอร์เคลื่อนไหว')
        button(240,'fish_test','ฉากทดสอบปลา','ปลาว่ายสุ่มขึ้นลงซ้ายขวาในน้ำ')
        label(240,125,'เลือกชุดทดสอบฉาก',17,MUTED)
    end
    for _,item in ipairs({{'rules_and_items','กติกาและไอเท็ม','คุณสมบัติ · การติดตั้ง · ปฏิสัมพันธ์'}}) do
        local label=section(self,item[1],item[2],item[3])
        label(240,425,'ยังไม่มีชุดทดสอบในหมวดนี้',23)
        label(240,375,'พร้อมเพิ่มการทดสอบในขั้นถัดไป',17,MUTED)
    end
    self.back=box(48,752,70,34,vmath.vector4(.15,.23,.38,1))
    self.back_label=text(48,752,'หน้าหลัก',12)
end
