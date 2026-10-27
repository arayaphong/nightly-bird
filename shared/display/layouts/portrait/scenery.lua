-- Portrait layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local box,text,child,line,arrow,slider,angle_label=kit.box,kit.text,kit.child,kit.line,kit.arrow,kit.slider,kit.angle_label
local WHITE,MUTED,ACCENT,DARK,PANEL,BUTTON=kit.WHITE,kit.MUTED,kit.ACCENT,kit.DARK,kit.PANEL,kit.BUTTON
local sky=require('shared.scenery.night_sky.motion')
    self.root=box(240,400,480,800,vmath.vector4())
    self.title=child(text(215,752,'ท้องฟ้ากลางคืน',20,WHITE),self.root)
    child(text(215,718,'STUDIO · SCENERY',12,MUTED),self.root)
    self.star_speed_button=child(box(275,674,260,44,BUTTON),self.root)
    self.star_speed_label=child(text(275,674,'',16,WHITE),self.root)
    self.star_speed_hint=child(text(275,639,'แตะเพื่อสลับ '..sky.STAR_SPEEDS[1]..' / '..sky.STAR_SPEEDS[2]..' หน่วย/วิ',12,MUTED),self.root)
    self.water_toggle=child(box(240,615,350,48,BUTTON),self.root)
    self.water_toggle_label=child(text(240,615,'',20,WHITE),self.root)
    self.fish_toggle=child(box(240,545,350,48,BUTTON),self.root)
    self.fish_toggle_label=child(text(240,545,'',20,WHITE),self.root)
    self.visibility_nodes={self.water_toggle,self.water_toggle_label,self.fish_toggle,self.fish_toggle_label}
    self.level_slider=slider(self.root,275,578);self.rough_slider=slider(self.root,275,500)
    self.star_slider=slider(self.root,275,422,sky.MAX_STARS);self.dust_slider=slider(self.root,275,344,sky.MAX_DUST)
    self.sliders={water_level=self.level_slider,water_roughness=self.rough_slider,star_count=self.star_slider,dust_count=self.dust_slider}
    child(text(275,474,'25% = Legacy',11,MUTED),self.rough_slider.root)
    self.body=child(box(240,100,480,200,PANEL),self.root)
    for row,side in ipairs({-1,1}) do
        local y=row==1 and 146 or 66
        child(text(30,y,side==-1 and 'ซ้าย' or 'ขวา',13,MUTED),self.body)
        for step,value in ipairs(sky.angles) do
            local x=96+(step-1)*82
            local b={side=side,step=step,node=child(box(x,y,70,64,BUTTON),self.body)}
            b.label=child(text(x,y-18,angle_label(step),15),self.body)
            local a=math.rad(value)
            b.arrow=arrow(self.body,x,y+10,math.atan2(math.sin(a),side*math.cos(a)),WHITE)
            self.buttons[#self.buttons+1]=b
        end
    end
    child(text(240,12,'Space: พับแถบ · T: สลับฝั่ง · ← →: เลือกมุม',11,MUTED),self.body)
    self.header=child(box(240,28,480,56,PANEL),self.root)
    child(text(78,28,'ทิศทางลม',17,WHITE),self.header)
    self.current=child(text(335,28,'',16,WHITE),self.header)
    self.current_arrow=child(box(263,28,1,1,vmath.vector4()),self.header)
    arrow(self.current_arrow,263,28,0,ACCENT)
    self.chevron_up={line(self.header,447,28,-7,-3,0,4,MUTED),line(self.header,447,28,0,4,7,-3,MUTED)}
    self.chevron_down={line(self.header,447,28,-7,3,0,-4,MUTED),line(self.header,447,28,0,-4,7,3,MUTED)}
end
