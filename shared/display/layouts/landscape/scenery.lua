-- Landscape layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local box,text,child,line,arrow,slider,angle_label=kit.box,kit.text,kit.child,kit.line,kit.arrow,kit.slider,kit.angle_label
local WHITE,MUTED,ACCENT,DARK,PANEL,BUTTON=kit.WHITE,kit.MUTED,kit.ACCENT,kit.DARK,kit.PANEL,kit.BUTTON
local sky=require('shared.scenery.night_sky.motion')
    self.root=box(640,360,1280,720,vmath.vector4())
    self.title=child(text(640,668,'ท้องฟ้ากลางคืน',26,WHITE),self.root)
    child(text(640,641,'STUDIO · SCENERY',12,MUTED),self.root)
    self.star_speed_button=child(box(230,596,280,48,BUTTON),self.root)
    self.star_speed_label=child(text(230,596,'',20,WHITE),self.root)
    self.star_speed_hint=child(text(230,560,'แตะเพื่อสลับ '..sky.STAR_SPEEDS[1]..' / '..sky.STAR_SPEEDS[2]..' หน่วย/วิ',16,MUTED),self.root)
    self.water_toggle=child(box(470,596,300,48,BUTTON),self.root)
    self.water_toggle_label=child(text(470,596,'',20,WHITE),self.root)
    self.fish_toggle=child(box(810,596,280,48,BUTTON),self.root)
    self.fish_toggle_label=child(text(810,596,'',20,WHITE),self.root)
    self.target_hint=child(text(640,540,'แตะเหนือผิวน้ำในระยะ 128 หน่วย เพื่อวางนกตาย',18,MUTED),self.root)
    self.reset_hint=child(text(640,512,'แตะนอกเขตเพื่อลบนก • ปลาโจมตีต่อจนลงน้ำ',16,MUTED),self.root)
    self.visibility_nodes={self.water_toggle,self.water_toggle_label,self.fish_toggle,self.fish_toggle_label,self.target_hint,self.reset_hint}
    self.level_slider=slider(self.root,640,590);self.rough_slider=slider(self.root,1050,590)
    self.star_slider=slider(self.root,640,490,sky.MAX_STARS);self.dust_slider=slider(self.root,1050,490,sky.MAX_DUST)
    self.sliders={water_level=self.level_slider,water_roughness=self.rough_slider,star_count=self.star_slider,dust_count=self.dust_slider}
    child(text(1050,564,'25% = Legacy',14,MUTED),self.rough_slider.root)
    self.body=child(box(640,100,900,200,PANEL),self.root)
    for row,side in ipairs({-1,1}) do
        local y=row==1 and 146 or 66
        child(text(340,y,side==-1 and 'ซ้าย' or 'ขวา',16,MUTED),self.body)
        for step,value in ipairs(sky.angles) do
            local x=440+(step-1)*100
            local b={side=side,step=step,node=child(box(x,y,80,64,BUTTON),self.body)}
            b.label=child(text(x,y-18,angle_label(step),16),self.body)
            local a=math.rad(value)
            b.arrow=arrow(self.body,x,y+10,math.atan2(math.sin(a),side*math.cos(a)),WHITE)
            self.buttons[#self.buttons+1]=b
        end
    end
    child(text(640,12,'Space: พับแถบ · T: สลับฝั่ง · ← →: เลือกมุม',13,MUTED),self.body)
    self.header=child(box(640,28,900,56,PANEL),self.root)
    child(text(400,28,'ทิศทางลม',18,WHITE),self.header)
    self.current=child(text(730,28,'',18,WHITE),self.header)
    self.current_arrow=child(box(650,28,1,1,vmath.vector4()),self.header)
    arrow(self.current_arrow,650,28,0,ACCENT)
    self.chevron_up={line(self.header,1040,28,-7,-3,0,4,MUTED),line(self.header,1040,28,0,4,7,-3,MUTED)}
    self.chevron_down={line(self.header,1040,28,-7,3,0,-4,MUTED),line(self.header,1040,28,0,-4,7,3,MUTED)}
end
