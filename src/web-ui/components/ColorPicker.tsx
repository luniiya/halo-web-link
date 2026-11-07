import { useEffect, useRef, useState } from "react";
import { applyColors, COLOR_PRESETS, DEFAULT_ACCENT, DEFAULT_SECONDARY, savedColors, type Colors } from "../theme.ts";
import { CheckIcon, PaletteIcon } from "./icons.tsx";

const ROWS = [
  { key: "accent", label: "Accent", hint: "Buttons and the logo" },
  { key: "secondary", label: "Highlight", hint: "Selected things and focus" },
] as const;

// Sidebar popover: the dashboard's two colors, saved per browser.
export function ColorPicker() {
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<Colors>(() => (typeof localStorage === "undefined" ? { accent: DEFAULT_ACCENT, secondary: DEFAULT_SECONDARY } : savedColors()));
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function change(next: Colors) {
    setColors(next);
    applyColors(next);
  }

  return (
    <div className="color-picker" ref={wrap}>
      <button type="button" className="icon-button" title="Colors" aria-label="Colors" aria-expanded={open} onClick={() => setOpen(!open)}><PaletteIcon /></button>
      {open && (
        <div className="color-popover pop-in" role="dialog" aria-label="Dashboard colors">
          {ROWS.map(({ key, label, hint }) => (
            <div key={key} className="color-row">
              <div className="color-row-head"><strong>{label}</strong><small>{hint}</small></div>
              <div className="swatches">
                {COLOR_PRESETS.map((preset) => {
                  const selected = colors[key].toLowerCase() === preset;
                  return (
                    <button key={preset} type="button" className="swatch" style={{ background: preset }} aria-label={`${label} ${preset}`} aria-pressed={selected}
                      onClick={() => change({ ...colors, [key]: preset })}>{selected && <CheckIcon />}</button>
                  );
                })}
                <label className="swatch swatch-custom" title="Custom color">
                  <input type="color" value={colors[key]} aria-label={`Custom ${label.toLowerCase()} color`} onChange={(event) => change({ ...colors, [key]: event.target.value })} />
                </label>
              </div>
            </div>
          ))}
          <button type="button" className="button button-ghost color-reset" onClick={() => change({ accent: DEFAULT_ACCENT, secondary: DEFAULT_SECONDARY })}>Reset</button>
        </div>
      )}
    </div>
  );
}
