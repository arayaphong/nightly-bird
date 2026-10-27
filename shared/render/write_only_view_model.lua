-- Numeric models driven entirely by Lua do not need Rive-to-Lua polling.
-- The pinned extension auto-subscribes every property when binding a model.
local M={}
local NUMBER=2 -- rive::DataType::number in the pinned runtime's public API.
function M.new(api,component,channels,probe)
    assert(channels[probe]~=nil,'Readiness probe must belong to the numeric schema')
    return {api=api,component=component,channels=channels,probe=probe,ready=false}
end
function M.prepare(binding)
    if binding.ready then return binding.instance end
    local api=binding.api
    if not binding.instance then binding.instance=api.get_view_model_instance(binding.component) end
    if not binding.instance then return nil end
    -- Wait for the extension's initial property request to complete. Unsubscribing
    -- earlier could race its asynchronous automatic subscription commands.
    -- Callers must wait for prepare() before writing, so this cached probe cannot
    -- accidentally be satisfied by a Lua setter before initialization finishes.
    local initialized=pcall(api.cmd.getViewModelInstanceNumber,binding.instance,binding.probe)
    if not initialized then return nil end
    for name in pairs(binding.channels) do
        api.cmd.unsubscribeToViewModelProperty(binding.instance,name,NUMBER)
    end
    binding.ready=true
    return binding.instance
end
return M
