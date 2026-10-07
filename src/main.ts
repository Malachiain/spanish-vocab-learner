import './style.css';
import { parseVocabCsv, type Word } from './csv';
import { Session, shuffle, type Direction } from './session';
import {
  deleteCustomSet,
  difficulty,
  loadCustomSets,
  loadStats,
  recordAnswer,
  saveCustomSet,
} from './storage';

interface WordSet {
  name: string;
  words: Word[];
  custom: boolean;
}

type Order = 'shuffle' | 'weakest';

interface Settings {
  selected: string[];
  direction: Direction;
  order: Order;
  limit: number;
}

const app = document.querySelector<HTMLElement>('#app')!;
const settings: Settings = { selected: [], direction: 'es-en', order: 'shuffle', limit: 0 };
let sets: WordSet[] = [];
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const { class: className, ...rest } = props;
  const el = Object.assign(document.createElement(tag), rest);
  if (className) el.className = className;
  el.append(...children);
  return el;
}

function setKeys(handler: ((e: KeyboardEvent) => void) | null): void {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = handler;
  if (handler) document.addEventListener('keydown', handler);
}

async function loadBundledSets(): Promise<WordSet[]> {
  const base = import.meta.env.BASE_URL;
  try {
    const index: { name: string; file: string }[] = await (await fetch(`${base}sets/index.json`)).json();
    return await Promise.all(
      index.map(async ({ name, file }) => ({
        name,
        words: parseVocabCsv(await (await fetch(`${base}sets/${file}`)).text()),
        custom: false,
      })),
    );
  } catch (err) {
    console.error('Failed to load bundled sets', err);
    return [];
  }
}

function refreshSets(bundled: WordSet[]): void {
  const custom = Object.entries(loadCustomSets()).map(([name, words]) => ({ name, words, custom: true }));
  sets = [...bundled, ...custom];
  settings.selected = settings.selected.filter((n) => sets.some((s) => s.name === n));
  if (settings.selected.length === 0 && sets.length > 0) settings.selected = [sets[0].name];
}

function radioGroup<T extends string>(
  name: string,
  options: [T, string][],
  current: T,
  onChange: (v: T) => void,
): HTMLElement {
  return h(
    'div',
    { class: 'radio-group' },
    ...options.map(([value, label]) => {
      const input = h('input', { type: 'radio', name, value, checked: value === current });
      input.addEventListener('change', () => onChange(value));
      return h('label', {}, input, label);
    }),
  );
}

function renderSetup(bundled: WordSet[]): void {
  setKeys(null);
  refreshSets(bundled);

  const setList = h(
    'ul',
    { class: 'set-list' },
    ...sets.map((set) => {
      const box = h('input', { type: 'checkbox', checked: settings.selected.includes(set.name) });
      box.addEventListener('change', () => {
        settings.selected = box.checked
          ? [...settings.selected, set.name]
          : settings.selected.filter((n) => n !== set.name);
        updateStart();
      });
      const item = h(
        'li',
        {},
        h('label', {}, box, set.name, h('span', { class: 'muted' }, ` (${set.words.length})`)),
      );
      if (set.custom) {
        const del = h('button', { class: 'link', textContent: 'remove', title: `Remove ${set.name}` });
        del.addEventListener('click', () => {
          if (!confirm(`Remove "${set.name}"?`)) return;
          deleteCustomSet(set.name);
          renderSetup(bundled);
        });
        item.append(del);
      }
      return item;
    }),
  );

  const fileInput = h('input', { type: 'file', accept: '.csv,text/csv', multiple: true });
  const uploadMsg = h('p', { class: 'muted' });
  fileInput.addEventListener('change', async () => {
    const added: string[] = [];
    for (const file of Array.from(fileInput.files ?? [])) {
      const words = parseVocabCsv(await file.text());
      if (words.length === 0) {
        uploadMsg.textContent = `No words found in ${file.name}. Expected columns: spanish, english, notes.`;
        return;
      }
      const name = file.name.replace(/\.csv$/i, '');
      saveCustomSet(name, words);
      added.push(name);
    }
    settings.selected = [...new Set([...settings.selected, ...added])];
    renderSetup(bundled);
  });

  const limitInput = h('input', {
    type: 'number',
    min: '0',
    value: String(settings.limit),
    class: 'limit',
  });
  limitInput.addEventListener('input', () => {
    settings.limit = Math.max(0, Number(limitInput.value) || 0);
  });

  const start = h('button', { class: 'primary', textContent: 'Start' });
  const updateStart = () => {
    start.disabled = selectedWords().length === 0;
  };
  start.addEventListener('click', () => startSession(buildDeck(), bundled));
  updateStart();

  app.replaceChildren(
    h('h1', { textContent: 'Spanish Vocab Learner' }),
    h(
      'section',
      { class: 'panel' },
      h('h2', { textContent: 'Vocabulary sets' }),
      sets.length ? setList : h('p', { class: 'muted', textContent: 'No sets yet — upload a CSV below.' }),
      h(
        'label',
        { class: 'upload' },
        'Add CSV set(s): ',
        fileInput,
      ),
      h('p', { class: 'muted small', textContent: 'Columns: spanish, english, notes. Uploaded sets are saved in this browser.' }),
      uploadMsg,
    ),
    h(
      'section',
      { class: 'panel' },
      h('h2', { textContent: 'Options' }),
      h('h3', { textContent: 'Show first' }),
      radioGroup<Direction>(
        'direction',
        [
          ['es-en', 'Spanish'],
          ['en-es', 'English'],
          ['mixed', 'Mixed'],
        ],
        settings.direction,
        (v) => (settings.direction = v),
      ),
      h('h3', { textContent: 'Order' }),
      radioGroup<Order>(
        'order',
        [
          ['shuffle', 'Shuffled'],
          ['weakest', 'Weakest first'],
        ],
        settings.order,
        (v) => (settings.order = v),
      ),
      h('label', { class: 'limit-label' }, 'Max cards (0 = all): ', limitInput),
    ),
    start,
  );
}

function selectedWords(): Word[] {
  const seen = new Map<string, Word>();
  for (const set of sets) {
    if (!settings.selected.includes(set.name)) continue;
    for (const v of set.words) if (!seen.has(v.spanish)) seen.set(v.spanish, v);
  }
  return [...seen.values()];
}

function buildDeck(): Word[] {
  let deck = shuffle(selectedWords());
  if (settings.order === 'weakest') {
    const stats = loadStats();
    deck.sort((a, b) => difficulty(stats[b.spanish]) - difficulty(stats[a.spanish]));
  }
  if (settings.limit > 0) deck = deck.slice(0, settings.limit);
  return settings.order === 'weakest' ? shuffle(deck) : deck;
}

function startSession(words: Word[], bundled: WordSet[]): void {
  const session = new Session(words, settings.direction);
  let flipped = false;

  const progressBar = h('div', { class: 'progress-fill' });
  const progressText = h('span', { class: 'muted' });
  const front = h('div', { class: 'front' });
  const back = h('div', { class: 'back' });
  const card = h('button', { class: 'card', title: 'Flip (Space)' }, front, back);
  const again = h('button', { class: 'again', textContent: 'Again (1)' });
  const known = h('button', { class: 'known', textContent: 'Got it (2)' });
  const actions = h('div', { class: 'actions' }, again, known);
  const quit = h('button', { class: 'link', textContent: '← Back to sets' });

  const flip = () => {
    flipped = !flipped;
    card.classList.toggle('flipped', flipped);
    actions.classList.toggle('visible', flipped);
  };

  const show = () => {
    if (session.done) return renderDone(session, bundled);
    const c = session.current!;
    flipped = false;
    card.classList.remove('flipped');
    actions.classList.remove('visible');
    progressBar.style.width = `${(session.known / session.total) * 100}%`;
    progressText.textContent = `${session.known} / ${session.total}`;

    const [q, a] = c.spanishFront ? [c.word.spanish, c.word.english] : [c.word.english, c.word.spanish];
    front.replaceChildren(
      h('span', { class: 'lang', textContent: c.spanishFront ? 'Español' : 'English' }),
      h('span', { class: 'word', textContent: q }),
    );
    back.replaceChildren(
      h('span', { class: 'lang', textContent: c.spanishFront ? 'English' : 'Español' }),
      h('span', { class: 'word', textContent: a }),
      ...(c.word.notes ? [h('span', { class: 'notes', textContent: c.word.notes })] : []),
    );
  };

  const answer = (correct: boolean) => {
    if (!flipped || session.done) return;
    recordAnswer(session.current!.word, correct);
    if (correct) session.markKnown();
    else session.markAgain();
    show();
  };

  card.addEventListener('click', flip);
  again.addEventListener('click', () => answer(false));
  known.addEventListener('click', () => answer(true));
  quit.addEventListener('click', () => renderSetup(bundled));

  setKeys((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flip();
    } else if (e.key === '1' || e.key === 'ArrowLeft') answer(false);
    else if (e.key === '2' || e.key === 'ArrowRight') answer(true);
    else if (e.key === 'Escape') renderSetup(bundled);
  });

  app.replaceChildren(
    h('div', { class: 'topbar' }, quit, progressText),
    h('div', { class: 'progress' }, progressBar),
    card,
    actions,
    h('p', { class: 'muted small hint', textContent: 'Space: flip · 1/←: again · 2/→: got it · Esc: quit' }),
  );
  show();
}

function renderDone(session: Session, bundled: WordSet[]): void {
  setKeys(null);
  const missed = [...session.missed];
  const back = h('button', { class: 'primary', textContent: 'Back to sets' });
  back.addEventListener('click', () => renderSetup(bundled));

  const children: (Node | string)[] = [
    h('h1', { textContent: '¡Bien hecho!' }),
    h('p', {
      textContent: `You finished ${session.total} card${session.total === 1 ? '' : 's'}` +
        (missed.length ? `, missing ${missed.length} at least once.` : ' with no misses.'),
    }),
  ];

  if (missed.length) {
    const retry = h('button', { class: 'primary', textContent: `Study the ${missed.length} missed again` });
    retry.addEventListener('click', () => startSession(shuffle(missed), bundled));
    children.push(
      h(
        'ul',
        { class: 'missed' },
        ...missed.map((v) =>
          h('li', {}, h('strong', { textContent: v.spanish }), ` — ${v.english}`),
        ),
      ),
      retry,
    );
  }
  children.push(back);
  app.replaceChildren(h('section', { class: 'panel done' }, ...children));
}

loadBundledSets().then(renderSetup);
