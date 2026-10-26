"""Apply a narrow WebGL resize repair to the pinned public Rive renderer.

Bob 1.14.0 can assert in AttachRenderTargetAttachment while resizing Rive's
combined depth/stencil render target. Recreating that target preserves the Rive
context, artboards and animation state. Native backends keep their existing path.
Only this public C++ source entry is changed; no libraries/assets are modified.
"""
from pathlib import Path
import hashlib,zipfile
from defold_rive_plugin import PIN

ENTRY=PIN+'defold-rive/commonsrc/renderer/renderer_context_opengl.cpp'
UPSTREAM_BLOB="8fe4b32deb001d6093d12700ffe71b96bcdb579c"
NEEDLE="            // Otherwise, use an intermediate framebuffer for the final blit\n            if (!m_DefoldRenderTarget)"
REPLACEMENT="            // Bob 1.14.0's WebGL resize path can assert while reattaching\n            // depth/stencil buffers. Recreate only the offscreen target.\n#if defined(RIVE_WEBGL)\n            if (m_DefoldRenderTarget)\n            {\n                m_RenderTarget.reset();\n                dmGraphics::DeleteRenderTarget(m_GraphicsContext, m_DefoldRenderTarget);\n                m_DefoldRenderTarget = 0;\n            }\n#endif\n            // Otherwise, use an intermediate framebuffer for the final blit\n            if (!m_DefoldRenderTarget)"

def blob_sha(data):
    return hashlib.sha1(b'blob '+str(len(data)).encode()+bytes([0])+data).hexdigest()

def prepare(project):
    for archive in (project/'.internal/lib').glob('*.zip'):
        with zipfile.ZipFile(archive) as original:
            if ENTRY not in original.namelist(): continue
            source=original.read(ENTRY)
            text=source.decode()
            if REPLACEMENT in text:
                restored=text.replace(REPLACEMENT,NEEDLE,1).encode()
                if blob_sha(restored)!=UPSTREAM_BLOB:
                    raise RuntimeError('Patched Rive renderer does not match the pinned upstream source.')
                return
            if blob_sha(source)!=UPSTREAM_BLOB or text.count(NEEDLE)!=1:
                raise RuntimeError('Pinned Rive renderer changed; review the resize repair.')
            patched=text.replace(NEEDLE,REPLACEMENT,1).encode()
            output=archive.with_suffix('.resize.zip')
            try:
                with zipfile.ZipFile(output,'w') as target:
                    for entry in original.infolist():
                        target.writestr(entry,patched if entry.filename==ENTRY else original.read(entry))
            except BaseException:
                output.unlink(missing_ok=True)
                raise
        output.replace(archive)
        print('Prepared pinned Rive WebGL render-target resize repair.',flush=True)
        return
    raise RuntimeError('Pinned Rive renderer not found after Bob resolve.')
