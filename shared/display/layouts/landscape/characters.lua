-- Landscape layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local group=kit.group;local update_page_dots=kit.update_page_dots
local WHITE,MUTED,ACCENT=kit.WHITE,kit.MUTED,kit.ACCENT
local PAGES,CHARACTER_LABELS,ITEMS,LABELS=kit.PAGES,kit.CHARACTER_LABELS,kit.ITEMS,kit.LABELS
    do
        local text,box
        self.home_root,text,box=group();self.cards={}
        text(640,668,'NIGHTLY BIRD',32);text(640,617,'CHARACTER GALLERY',17,ACCENT)
        text(640,577,'เลือกตัวละคร',25);text(640,543,'แตะไอคอนเพื่อดูแอนิเมชัน',16,MUTED)
        for i,name in ipairs(PAGES) do
            local x,y=260+((i-1)%3)*380,405-math.floor((i-1)/3)*205
            self.cards[name]=box(x,y,320,180,vmath.vector4())
            text(x,y-49,CHARACTER_LABELS[i],20);text(x,y-75,'ดูแอนิเมชัน',13,MUTED)
        end
        text(640,51,'1–6: เลือกตัวละคร',14,MUTED)
    end
    do
        local text,box
        self.bird_root,text,box=group()
        text(640,668,'นกแดง · RIVE VECTOR 2D',28)
        text(640,625,'แตะค้างเพื่อกระพือปีก · ปล่อยเพื่อพัก',17,MUTED)
        self.items={};self.badges={}
        for i,key in ipairs(ITEMS) do
            local x=850+((i-1)%2)*230;local y=470-math.floor((i-1)/2)*140
            self.items[key]=box(x,y,200,116,vmath.vector4())
            text(x,y-15,LABELS[i],17);self.badges[key]=text(x,y-39,'ปิด',14,MUTED)
        end
        self.blink=box(850,210,200,54,vmath.vector4(.15,.23,.38,1))
        self.chew=box(1080,210,200,54,vmath.vector4(.15,.23,.38,1))
        text(850,210,'กระพริบตา',21);text(1080,210,'เคี้ยว',21)
        self.hold=box(965,123,430,70,ACCENT)
        text(965,123,'แตะค้างเพื่อกระพือปีก',23,vmath.vector4(.04,.09,.12,1))
        self.status=text(360,110,'ปีก: พัก',18,MUTED)
        text(640,52,'Space: กระพือ · B: ตา · C: เคี้ยว · 1–4: ไอเท็ม · ปัด: เปลี่ยนตัวละคร',15,MUTED)
    end
    do
        local text,box
        self.fish_root,text,box=group()
        text(640,668,'ปลา · VECTOR 2D',28);text(640,625,'หาง · ครีบ · เหงือก ขยับอัตโนมัติ',17,MUTED)
        self.fish_status=text(950,390,'หันขวา',19,MUTED)
        self.turn=box(950,300,290,72,ACCENT);text(950,300,'กลับตัว',25,vmath.vector4(.04,.09,.12,1))
        text(640,52,'Space: กลับตัว · ปัดหรือลูกศร: เปลี่ยนตัวละคร',15,MUTED)
    end
    do
        local text,box
        self.hawk_root,text,box=group()
        text(640,668,'เหยี่ยว · VECTOR 2D',28);text(640,625,'พุ่งตัว 3 วินาที แล้วกลับมาบิน',17,MUTED)
        self.hawk_status=text(975,450,'กำลังบิน · หันขวา',19,MUTED)
        self.hawk_turn=box(975,345,290,72,vmath.vector4(.15,.23,.38,1));text(975,345,'กลับตัว',25)
        self.dive=box(975,240,290,72,ACCENT)
        self.dive_label=text(975,240,'พุ่งตัว',25,vmath.vector4(.04,.09,.12,1))
        text(640,52,'Space: พุ่งตัว · T: กลับตัว · ปัดหรือลูกศร: เปลี่ยนตัวละคร',15,MUTED)
    end
    for _,entry in ipairs({{'firefly','หิ่งห้อย'},{'balloon','ลูกโป่ง'},{'cloud','เมฆฝน'}}) do
        local text,box
        self[entry[1]..'_root'],text,box=group()
        text(640,668,entry[2]..' · VECTOR 2D',28)
        text(640,625,entry[1]=='cloud' and 'ฝนตก · กดปุ่มเพื่อทดสอบฟ้าแลบ' or 'แอนิเมชันอัตโนมัติ',17,MUTED)
        if entry[1]=='cloud' then
            self.lightning=box(1070,120,280,70,ACCENT)
            self.lightning_label=text(1070,120,'ฟ้าแลบ',25,vmath.vector4(.04,.09,.12,1))
        end
        text(640,52,entry[1]=='cloud' and 'Space: ฟ้าแลบ · ปัด: เปลี่ยนตัวละคร · Esc: หน้ารวม' or 'ปัด: เปลี่ยนตัวละคร · Esc: หน้ารวม',15,MUTED)
    end
    for _,name in ipairs(PAGES) do gui.set_enabled(self[name..'_root'],false) end
    self.page_dots={}
    for i=1,#PAGES do
        local dot=gui.new_pie_node(vmath.vector3(640+(i-(#PAGES+1)/2)*24,22,0),vmath.vector3(8,8,0))
        gui.set_fill_angle(dot,360);gui.set_inner_radius(dot,0);gui.set_perimeter_vertices(dot,32)
        self.page_dots[i]=dot
    end
    gui.set_enabled(self.home_root,false);update_page_dots(self)
end
