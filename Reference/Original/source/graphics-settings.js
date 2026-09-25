(function () {
  const presets = {
    auto: { label: 'Auto — follows detail preset' },
    sparse: { label: 'Sparse', density: .65, fauna: 12, detail: 120 },
    balanced: { label: 'Balanced', density: 1, fauna: 18, detail: 240 },
    lush: { label: 'Lush', density: 1.35, fauna: 24, detail: 360 },
  };
  let selected = 'auto',revision=0;
  try { const saved = localStorage.getItem('space-patriot-population'); if (presets[saved]) selected = saved; } catch {}
  const effective=()=>selected==='auto'?(window.longway?.renderer.software||window.longway?.renderer.quality===0?'sparse':window.longway?.renderer.quality===2?'lush':'balanced'):selected;
  const state = window.LongwayGraphics = { presets, get revision() { return revision*10+['sparse','balanced','lush'].indexOf(effective()); }, get population() { return presets[effective()]; },
    setPopulation(value) { if (!presets[value]) return; selected = value; revision++;
      try { localStorage.setItem('space-patriot-population', value); } catch {}
      if (window.longway) longway.renderer.needsRender = true;
    },
  };
  const row = document.createElement('label'); row.className = 'field';
  row.textContent = 'World population';
  const select = document.createElement('select'); select.id = 'worldPopulation';
  for (const [value, preset] of Object.entries(presets)) select.add(new Option(preset.label, value));
  select.value = selected; select.onchange = () => state.setPopulation(select.value); row.append(select);
  document.getElementById('settings').append(row);
  const note = document.createElement('p'); note.className = 'panel-note';
  note.textContent = 'Auto follows Fast, Balanced or High detail. You can also choose population separately. Distant detail uses simpler shapes; Sparse reduces work on slower devices.';
  row.after(note);
})();
