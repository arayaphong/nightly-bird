-- Landscape layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local box,text=kit.box,kit.text
local WHITE,MUTED,ACCENT,PANEL=kit.WHITE,kit.MUTED,kit.ACCENT,kit.PANEL
local categories=require('studio.catalog');local scenarios=require('scenarios.catalog')
local function section(self,name,title,subtitle)
    local root=box(640,360,1280,720,vmath.vector4());self.roots[name]=root;self.buttons[name]={}
    local function add(fn,...)
        local n=fn(...);gui.set_parent(n,root,true);gui.set_inherit_alpha(n,false);return n
    end
    local function label(...) return add(text,...) end
    local function button(y,route,caption,description,x)
        x=x or 640
        local n=add(box,x,y,550,100,PANEL);self.buttons[name][route]=n
        label(x,y+16,caption,30);label(x,y-20,description,20,MUTED)
    end
    label(640,668,'NIGHTLY BIRD',36);label(640,614,title,32,ACCENT);label(640,573,subtitle,22,MUTED)
    return label,button
end
    do
        local label,button=section(self,'home','เลือกพื้นที่ทำงาน','พัฒนาส่วนประกอบ หรือทดสอบภาพรวม')
        button(370,'studio','Studio','พัฒนาและทดสอบส่วนประกอบทีละหน่วย',340)
        button(370,'scenarios','Scenarios','ทดสอบภาพรวมเป็นฉากอิสระ',940)
        button(210,'system_info','System Info','FPS · WebGL renderer · ความละเอียดที่เรนเดอร์')
        label(640,130,'1: Studio · 2: Scenarios · 3: System Info',14,MUTED)
    end
    do
        local label,button=section(self,'studio','Studio','เลือกหมวดทดสอบ')
        for i,item in ipairs(categories) do button(460-(i-1)*120,item.route,item.title,item.description) end
        label(640,100,'1–3: เลือกหมวด · Esc: หน้าหลัก',13,MUTED)
    end
    do
        local label,button=section(self,'scenarios','Scenarios','เลือกฉากทดสอบภาพรวม')
        if #scenarios==0 then
            label(640,410,'ยังไม่มีฉากทดสอบ',25)
            label(640,360,'แต่ละฉากจะเลือกเข้าได้อย่างอิสระ',17,MUTED)
            label(640,325,'เมื่อพร้อมทดสอบส่วนประกอบร่วมกัน',17,MUTED)
        else
            for i,item in ipairs(scenarios) do button(460-(i-1)*120,item.route,item.title,item.description) end
        end
    end
    do
        local label,button=section(self,'scenery','ฉากและฟิสิกส์','ฉาก · platform · การชน · state')
        button(460,'night_sky','ท้องฟ้ากลางคืน','ดาวระยิบระยับ · ฝุ่นเรืองแสง · ทิศทางลม')
        button(340,'night_water','ท้องฟ้าและผิวน้ำ','ท้องฟ้ากลางคืน · คลื่นเวกเตอร์เคลื่อนไหว')
        button(220,'fish_test','ฉากทดสอบปลา','ปลาว่ายสุ่มขึ้นลงซ้ายขวาในน้ำ')
        label(640,110,'เลือกชุดทดสอบฉาก',17,MUTED)
    end
    for _,item in ipairs({{'rules_and_items','กติกาและไอเท็ม','คุณสมบัติ · การติดตั้ง · ปฏิสัมพันธ์'}}) do
        local label=section(self,item[1],item[2],item[3])
        label(640,410,'ยังไม่มีชุดทดสอบในหมวดนี้',23)
        label(640,360,'พร้อมเพิ่มการทดสอบในขั้นถัดไป',17,MUTED)
    end
    self.back=box(76,668,112,44,vmath.vector4(.15,.23,.38,1))
    self.back_label=text(76,668,'หน้าหลัก',16)
end
