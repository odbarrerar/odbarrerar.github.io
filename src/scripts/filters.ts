/**
 * Progressive-enhancement filters for lists (research, publications, talks,
 * writing). Without JavaScript every item stays visible.
 *
 * Markup contract:
 *   [data-filter-scope]                     wrapper
 *     button[data-filter-key][data-filter-value]   toggle buttons ("all" resets)
 *     select[data-sort]                     optional: "new" | "old" | "title"
 *     [data-filter-count]                   optional: live result count
 *     [data-filter-empty]                   optional: shown when nothing matches
 *     [data-filter-note data-note-key data-note-value]  optional: shown only for that filter value
 *     [data-filter-section]                 optional: hidden when it has no visible items
 *       [data-sort-list]                    optional: container whose items get sorted
 *         [data-filter-item data-topics="a b" data-group="x" data-type="y" data-year="2020"]
 *
 * The key "topics" is synced with ?theme= in the address bar, so links such
 * as /research/?theme=taxation open pre-filtered.
 */

type State = Record<string, string>;
const URL_PARAM: Record<string, string> = { topics: 'theme', group: 'status', type: 'type' };

function matches(item: HTMLElement, state: State): boolean {
  return Object.entries(state).every(([key, value]) => {
    if (value === 'all') return true;
    const attr = item.dataset[key] ?? '';
    return attr.split(/\s+/).includes(value);
  });
}

function init(scope: HTMLElement) {
  const buttons = [...scope.querySelectorAll<HTMLButtonElement>('button[data-filter-key]')];
  const items = [...scope.querySelectorAll<HTMLElement>('[data-filter-item]')];
  const sections = [...scope.querySelectorAll<HTMLElement>('[data-filter-section]')];
  const count = scope.querySelector<HTMLElement>('[data-filter-count]');
  const empty = scope.querySelector<HTMLElement>('[data-filter-empty]');
  const sort = scope.querySelector<HTMLSelectElement>('select[data-sort]');
  const notes = [...scope.querySelectorAll<HTMLElement>('[data-filter-note]')];
  const total = items.length;

  const state: State = {};
  for (const b of buttons) state[b.dataset.filterKey!] ??= 'all';

  // Initial state from the URL (e.g. ?theme=taxation)
  const params = new URLSearchParams(window.location.search);
  for (const key of Object.keys(state)) {
    const fromUrl = params.get(URL_PARAM[key] ?? key);
    if (fromUrl && buttons.some((b) => b.dataset.filterKey === key && b.dataset.filterValue === fromUrl)) {
      state[key] = fromUrl;
    }
  }

  function apply(updateUrl: boolean) {
    for (const b of buttons) {
      b.setAttribute('aria-pressed', String(state[b.dataset.filterKey!] === b.dataset.filterValue));
    }
    let shown = 0;
    for (const item of items) {
      const ok = matches(item, state);
      item.hidden = !ok;
      if (ok) shown++;
    }
    for (const section of sections) {
      section.hidden = !section.querySelector('[data-filter-item]:not([hidden])');
    }
    for (const note of notes) {
      note.hidden = state[note.dataset.noteKey!] !== note.dataset.noteValue;
    }
    const noun = scope.dataset.filterNoun ?? 'items';
    if (count) count.textContent = shown === total ? `${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`;
    if (empty) empty.hidden = shown !== 0;

    if (updateUrl) {
      const url = new URL(window.location.href);
      for (const [key, value] of Object.entries(state)) {
        const param = URL_PARAM[key] ?? key;
        if (value === 'all') url.searchParams.delete(param);
        else url.searchParams.set(param, value);
      }
      window.history.replaceState(null, '', url);
    }
  }

  function applySort() {
    if (!sort) return;
    const mode = sort.value;
    scope.querySelectorAll<HTMLElement>('[data-sort-list]').forEach((list) => {
      const children = [...list.querySelectorAll<HTMLElement>(':scope > [data-filter-item]')];
      children.sort((a, b) => {
        if (mode === 'title') return (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '');
        const ya = Number(a.dataset.year || 0);
        const yb = Number(b.dataset.year || 0);
        return mode === 'old' ? ya - yb : yb - ya;
      });
      children.forEach((c) => list.append(c));
    });
  }

  for (const b of buttons) {
    b.addEventListener('click', () => {
      state[b.dataset.filterKey!] = b.dataset.filterValue!;
      apply(true);
    });
  }
  sort?.addEventListener('change', applySort);

  apply(false);
}

document.querySelectorAll<HTMLElement>('[data-filter-scope]').forEach(init);
