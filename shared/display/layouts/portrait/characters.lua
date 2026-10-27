-- Portrait layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local group=kit.group;local update_page_dots=kit.update_page_dots
local WHITE,MUTED,ACCENT=kit.WHITE,kit.MUTED,kit.ACCENT
local PAGES,CHARACTER_LABELS,ITEMS,LABELS=kit.PAGES,kit.CHARACTER_LABELS,kit.ITEMS,kit.LABELS
    do
        local text,box
        self.home_root,text,box=group();self.cards={}
        text(240,752,'NIGHTLY BIRD',32)
        text(240,710,'CHARACTER GALLERY',17,ACCENT)
        text(240,680,'เลือกตัวละคร',25,WHITE)
        text(240,641,'แตะไอคอนเพื่อดูแอนิเมชัน',16,MUTED)
        for i,name in ipairs(PAGES) do
            local x,y=90+((i-1)%3)*150,500-math.floor((i-1)/3)*200
            self.cards[name]=box(x,y,132,170,vmath.vector4())
            text(x,y-42,CHARACTER_LABELS[i],18)
            text(x,y-65,'ดูแอนิเมชัน',12,MUTED)
        end
        text(240,135,'1–6: เลือกตัวละคร',14,MUTED)
    end
    do
        local text,box
        self.bird_root,text,box=group()
        text(240,752,'NIGHTLY BIRD',32)
        text(240,710,'RIVE · VECTOR 2D',17,ACCENT)
        text(240,680,'แตะค้างเพื่อกระพือปีก · ปล่อยเพื่อพัก',16,MUTED)
        self.items={};self.badges={}
        for i,key in ipairs(ITEMS) do
            local x=75+(i-1)*110
            self.items[key]=box(x,340,94,106,vmath.vector4())
            text(x,326,LABELS[i],14);self.badges[key]=text(x,304,'ปิด',12,MUTED)
        end
        self.blink=box(130,245,190,48,vmath.vector4(.15,.23,.38,1))
        self.chew=box(350,245,190,48,vmath.vector4(.15,.23,.38,1))
        text(130,245,'กระพริบตา',20);text(350,245,'เคี้ยว',20)
        self.hold=box(240,155,410,66,ACCENT)
        text(240,155,'แตะค้างเพื่อกระพือปีก',23,vmath.vector4(.04,.09,.12,1))
        self.status=text(240,95,'ปีก: พัก',17,MUTED)
        text(240,53,'Space: กระพือ · B: ตา · C: เคี้ยว',13,MUTED)
        text(240,30,'1–4: ไอเท็ม · ปัดซ้ายเพื่อทดสอบปลา',12,MUTED)
    end
    do
        local text,box
        self.fish_root,text,box=group()
        text(240,752,'NIGHTLY BIRD',32)
        text(240,710,'FISH · VECTOR 2D',17,ACCENT)
        text(240,680,'ทดสอบปลาว่ายน้ำ',21,WHITE)
        text(240,641,'หาง · ครีบ · เหงือก ขยับอัตโนมัติ',15,MUTED)
        self.fish_status=text(240,290,'หันขวา',18,MUTED)
        self.turn=box(240,190,270,66,ACCENT)
        text(240,190,'กลับตัว',25,vmath.vector4(.04,.09,.12,1))
        text(240,94,'ปัดซ้าย: เหยี่ยว · ปัดขวา: นก',16,MUTED)
        text(240,53,'Space: กลับตัว · ลูกศร: เปลี่ยนหน้า',13,MUTED)
        gui.set_enabled(self.fish_root,false)
    end
    do
        local text,box
        self.hawk_root,text,box=group()
        text(240,752,'NIGHTLY BIRD',32)
        text(240,710,'HAWK · VECTOR 2D',17,ACCENT)
        text(240,680,'ทดสอบเหยี่ยวบิน',21,WHITE)
        text(240,641,'พุ่งตัว 3 วินาที แล้วกลับมาบิน',15,MUTED)
        self.hawk_status=text(240,290,'กำลังบิน · หันขวา',18,MUTED)
        self.hawk_turn=box(130,190,190,66,vmath.vector4(.15,.23,.38,1))
        text(130,190,'กลับตัว',25)
        self.dive=box(350,190,190,66,ACCENT)
        self.dive_label=text(350,190,'พุ่งตัว',25,vmath.vector4(.04,.09,.12,1))
        text(240,94,'ปัดขวาเพื่อกลับหน้าปลา',17,MUTED)
        text(240,53,'Space: พุ่งตัว · T: กลับตัว',13,MUTED)
        gui.set_enabled(self.hawk_root,false)
    end
    for _,entry in ipairs({{'firefly','หิ่งห้อย','FIREFLY · VECTOR 2D'},
                            {'balloon','ลูกโป่ง','BALLOON · VECTOR 2D'},
                            {'cloud','เมฆฝน','RAIN CLOUD · VECTOR 2D'}}) do
        local add_text,add_box
        self[entry[1]..'_root'],add_text,add_box=group()
        add_text(240,752,'NIGHTLY BIRD',32)
        add_text(240,710,entry[3],17,ACCENT)
        add_text(240,680,entry[2],25,WHITE)
        add_text(240,641,entry[1]=='cloud' and 'ฝนตก · กดปุ่มเพื่อทดสอบฟ้าแลบ' or 'แอนิเมชันอัตโนมัติ',16,MUTED)
        if entry[1]=='cloud' then
                    self.lightning=add_box(240,190,270,66,ACCENT)
            self.lightning_label=add_text(240,190,'ฟ้าแลบ',25,vmath.vector4(.04,.09,.12,1))
        end
        add_text(240,94,'หน้ารวมเพื่อเลือกตัวละครอื่น',16,MUTED)
        add_text(240,53,entry[1]=='cloud' and 'Space: ฟ้าแลบ · Esc: หน้ารวม' or 'ปัด: เปลี่ยนตัวละคร · Esc: หน้ารวม',13,MUTED)
    end
    for _,name in ipairs(PAGES) do gui.set_enabled(self[name..'_root'],false) end
    self.page_dots={}
    for i=1,#PAGES do
        local dot=gui.new_pie_node(vmath.vector3(240+(i-(#PAGES+1)/2)*20,12,0),vmath.vector3(8,8,0))
        gui.set_fill_angle(dot,360);gui.set_inner_radius(dot,0)
        gui.set_perimeter_vertices(dot,32)
        self.page_dots[i]=dot
    end
    gui.set_enabled(self.home_root,false)
    update_page_dots(self)
end
