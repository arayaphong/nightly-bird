-- Portrait layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local label,set=kit.label,kit.set
local WHITE,MUTED,ACCENT=kit.WHITE,kit.MUTED,kit.ACCENT
    self.root=gui.new_box_node(vmath.vector3(240,400,0),vmath.vector3(480,800,0))
    gui.set_color(self.root,vmath.vector4())
    local function fixed(x,y,value,size,color,width)
        local node=label(self,x,y,size,color,width);set(node,value);return node
    end
    fixed(130,752,'SYSTEM INFO',26,ACCENT,300)
    self.build=label(self,30,708,13,MUTED,420)
    fixed(30,674,'RENDERER',18,ACCENT)
    self.api=label(self,30,642,16)
    self.status=label(self,30,618,14)
    fixed(30,592,'GPU / Renderer',12,MUTED)
    self.renderer=label(self,30,568,16,WHITE,420,90)
    self.vendor=label(self,30,470,14,WHITE,420,50)
    self.version=label(self,30,412,12,MUTED,420,40)
    self.details=label(self,30,374,12,MUTED,420,40)
    fixed(30,340,'FRAME / DISPLAY',18,ACCENT)
    self.fps=label(self,30,312,16)
    self.slowest=label(self,30,286,12,MUTED)
    self.scene=label(self,30,258,14)
    self.scene_fps=label(self,30,234,16,ACCENT)
    self.css=label(self,30,197,14)
    self.pixels=label(self,30,173,14)
    self.dpr=label(self,30,149,14)
    self.workload=label(self,30,125,13,MUTED)
    fixed(30,90,'FPS อย่างเดียวบอกไม่ได้ว่าคอขวดอยู่ที่ CPU หรือ GPU',13,WHITE,420)
    fixed(30,52,'WebGL อาจใช้ GPU หรือ software renderer · เบราว์เซอร์ไม่เปิดเผย GPU usage (%)',11,MUTED,420)
end
