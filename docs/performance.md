# Rive subscription polling: 0.8.26

The night-sky CPU bottleneck was traced to the pinned Rive extension's automatic
property subscriptions. It subscribes every numeric field in a bound view model,
including hidden water geometry and reflections. The shared sky model has 637
numeric properties and is instantiated by the sky, water and fish fixtures.

In a Release Linux process sampled with its matching unstripped symbols,
40 of 50 main-thread stacks were inside
`rive::CommandServer::checkPropertySubscriptions()`. These stacks traversed
`ViewModelInstanceRuntime::property()` → `properties()` →
`ViewModelRuntime::buildPropertiesData()`, with repeated vector/string allocation.
This is CPU work performed while checking subscriptions, even when Lua values
stop changing or particle counts are zero. Disabled components are skipped by
the extension's component update/render loops, but the subscription registry
belongs to the shared command server.

The extension installs these subscriptions in
[`FileListener::onViewModelPropertiesListed`](https://github.com/defold/extension-rive/blob/0283d4ecb604953057385ca5a4fae7130c776ae9/defold-rive/src/script_rive_listeners.cpp).
Its public Lua command `rive.cmd.unsubscribeToViewModelProperty(instance,path,2)`
removes a numeric subscription. The `2` is `rive::DataType::number` in this pin.

`shared/render/write_only_view_model.lua` now uses that API for the three sky
fixtures. It first waits for the initial cached `water_alpha` request to finish;
otherwise a later automatic subscription could undo an early unsubscribe.
Lua writes wait for this readiness check, so a setter cannot falsely populate the
probe cache. The helper then unsubscribes the complete numeric schema once per
instance. It also prepares inactive fixtures, without advancing their motion or
enabling their graphics. The sky controllers do not consume Rive-to-Lua property
updates, so their animation and data bindings continue to use the existing
`setViewModelInstanceNumber` writes. Other Rive models retain their behavior.

No Rive library fork, native C++ modification, artwork change, particle reduction,
resolution/DPR cap, or render-backend change is involved.

## Evidence and limits

A controlled native Wayland comparison used the same Release engine binary,
same `.riv` asset, full 72-star/26-dust scene, compositor and software Vulkan
driver. Four warmed overlay readings per case were:

| Case | FPS readings | Median |
| --- | --- | --- |
| Original subscriptions | 12.7, 11.5, 11.2, 12.9 | 12.1 |
| Numeric polling removed | 38.7, 38.4, 37.7, 38.2 | 38.3 |

Both cases retained moving/twinkling geometry. The captures were 1280×900.
This is a cloud Mesa llvmpipe software rendering comparison, not a benchmark of
the user's GPU or a guarantee of the FPS on their machine. There may be further
GPU/driver or rendering costs.

The Release web comparison also used identical engine WASM, with the same
405×676 backing canvas at DPR 1 in cloud Chromium/SwiftShader. A 40-frame sample
per case measured:

| Web scene | Original FPS | Fixed FPS |
| --- | --- | --- |
| Full 72 stars / 26 dust | 10.6 | 22.6 |
| Both particle sliders at zero | 12.2 | 51.1 |

These are average animation-frame rates in this software rendering environment.
The full scene still has rendering cost after removing CPU polling. The user's
native Linux and mobile web hardware must be measured independently.

Lua tests cover asynchronous readiness, the complete 637-field schema, one-time
unsubscription, fixture isolation, retained motion and zero-particle behavior.
