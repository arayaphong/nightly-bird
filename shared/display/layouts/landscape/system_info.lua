-- Landscape layout construction only; interaction/state stay in the GUI script.
return function(self,kit)
local label,set=kit.label,kit.set
local WHITE,MUTED,ACCENT=kit.WHITE,kit.MUTED,kit.ACCENT
    self.root=gui.new_box_node(vmath.vector3(640,360,0),vmath.vector3(1280,720,0))
    gui.set_color(self.root,vmath.vector4())
    local function fixed(x,y,value,size,color,width)
        local node=label(self,x,y,size,color,width);set(node,value);return node
    end
    fixed(420,690,'SYSTEM INFO',32,ACCENT,600)
    self.build=label(self,70,625,20,MUTED,1130)
    fixed(70,575,'RENDERER',23,ACCENT)
    self.api=label(self,70,534,22)
    self.status=label(self,70,494,20)
    fixed(70,451,'GPU / Renderer',16,MUTED)
    self.renderer=label(self,70,422,22,WHITE,530,80)
    self.vendor=label(self,70,325,20,WHITE,530,62)
    self.version=label(self,70,252,18,MUTED,530,54)
    self.details=label(self,70,185,17,MUTED,530,50)
    fixed(670,575,'FRAME / DISPLAY',23,ACCENT)
    self.fps=label(self,670,534,22)
    self.slowest=label(self,670,494,18,MUTED)
    self.scene=label(self,670,445,20)
    self.scene_fps=label(self,670,410,22,ACCENT)
    self.css=label(self,670,345,20)
    self.pixels=label(self,670,305,20)
    self.dpr=label(self,670,265,20)
    self.workload=label(self,670,225,20,MUTED)
    fixed(70,113,'FPS อย่างเดียวบอกไม่ได้ว่าคอขวดอยู่ที่ CPU หรือ GPU',20,WHITE,1140)
    fixed(70,77,'WebGL อาจใช้ GPU หรือ software renderer · เบราว์เซอร์ไม่เปิดเผย GPU usage (%)',18,MUTED,1140)
end
