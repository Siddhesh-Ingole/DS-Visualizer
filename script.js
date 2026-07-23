/* ============================================================
   DS VISUALIZER — APPLICATION LOGIC
   Vanilla JS. No frameworks, no dependencies.
   ============================================================ */

/* ---------------------------------------------------------------
   0. SMALL UTILITIES
   --------------------------------------------------------------- */
let keyCounter = 1;
const nextKey = () => 'k' + (keyCounter++);

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** FLIP-animate a container's children from their old positions to new. */
function flipRender(container, newHTML) {
  const oldRects = new Map();
  container.querySelectorAll('[data-key]').forEach(node => {
    oldRects.set(node.dataset.key, node.getBoundingClientRect());
  });
  container.innerHTML = newHTML;
  container.querySelectorAll('[data-key]').forEach(node => {
    const old = oldRects.get(node.dataset.key);
    if (old) {
      const now = node.getBoundingClientRect();
      const dx = old.left - now.left, dy = old.top - now.top;
      if (dx || dy) {
        node.style.transition = 'none';
        node.style.transform = `translate(${dx}px,${dy}px)`;
        requestAnimationFrame(() => {
          node.style.transition = `transform ${0.4 / SPEED}s cubic-bezier(.4,0,.2,1)`;
          node.style.transform = '';
        });
      }
    } else {
      node.classList.add('entering');
    }
  });
}

let SPEED = 1; // multiplier used by animations & flip
function sleep(ms) { return new Promise(r => setTimeout(r, ms / SPEED)); }

function logTo(el_, html) { if (el_) el_.innerHTML = html; }

/* ---------------------------------------------------------------
   0b. VALIDATION & FEEDBACK HELPERS
   Every DS engine uses these so failed operations:
     - never mutate state
     - never animate
     - always show a clear, textbook-accurate message
   --------------------------------------------------------------- */

/** A thrown signal meaning "abort this operation, show `msg` as an error." */
class OpError extends Error { constructor(msg) { super(msg); this.isOpError = true; } }

function showError(logEl, msg) {
  logEl.innerHTML = `⚠ ${msg}`;
  logEl.classList.add('log-error');
  logEl.classList.remove('log-success');
  // brief shake to signal "rejected" without touching any DS state
  logEl.classList.remove('shake'); void logEl.offsetWidth; logEl.classList.add('shake');
  pushHistory(logEl, msg, 'error');
  updateExplain(logEl, msg, 'error');
  showToast(msg, 'error');
  if (/overflow/i.test(msg)) document.dispatchEvent(new CustomEvent('ai:overflow'));
  else if (/underflow/i.test(msg)) document.dispatchEvent(new CustomEvent('ai:underflow'));
  else document.dispatchEvent(new CustomEvent('ai:error'));
}
function showSuccess(logEl, msg) {
  logEl.innerHTML = `✔ ${msg}`;
  logEl.classList.add('log-success');
  logEl.classList.remove('log-error');
  pushHistory(logEl, msg, 'success');
  updateExplain(logEl, msg, 'success');
  showToast(msg, 'success');
  document.dispatchEvent(new CustomEvent('ai:success'));
}
function showInfo(logEl, msg) {
  logEl.innerHTML = msg;
  logEl.classList.remove('log-error', 'log-success');
}

/* ---- Toasts, per-structure history panel, and per-structure explanation panel ----
   All keyed off the convention that every log element has id "${key}-log", so the
   matching history/explain/opcount/complexity elements can be found automatically. */
function stripTags(html) { return html.replace(/<[^>]+>/g, ''); }

let opCounters = {};
function panelRefsFor(logEl) {
  const key = (logEl.id || '').replace(/-log$/, '');
  return {
    key,
    historyEl: document.getElementById(`${key}-history`),
    explainEl: document.getElementById(`${key}-explain`),
    opCountEl: document.getElementById(`${key}-opcount`),
    compEl: document.getElementById(`${key}-complexity`),
  };
}
function pushHistory(logEl, msg, type) {
  const { key, historyEl, opCountEl } = panelRefsFor(logEl);
  if (!historyEl) return;
  opCounters[key] = (opCounters[key] || 0) + 1;
  if (opCountEl) opCountEl.textContent = opCounters[key];
  const empty = historyEl.querySelector('.history-empty');
  if (empty) empty.remove();
  const entry = document.createElement('div');
  entry.className = 'history-entry';
  entry.innerHTML = `<span class="h-num">#${opCounters[key]}</span><span>${type === 'error' ? '✕' : '✓'} ${stripTags(msg)}</span>`;
  historyEl.appendChild(entry);
  while (historyEl.children.length > 40) historyEl.removeChild(historyEl.firstChild);
  historyEl.scrollTop = historyEl.scrollHeight;
}
function updateExplain(logEl, msg, type) {
  const { key, explainEl, compEl } = panelRefsFor(logEl);
  if (!explainEl) return;
  const meta = DS_META[key];
  if (!meta) return;
  explainEl.classList.add('show');
  const complexityText = compEl ? compEl.textContent.trim().replace(/\s+/g, ' ') : '—';
  explainEl.innerHTML = `
    <div class="explain-op">${type === 'error' ? '⚠' : '✔'} ${stripTags(msg)}</div>
    <div class="explain-grid">
      <div class="explain-item"><div class="e-label">Real-world example</div><div class="e-value">${meta.applications[0]}</div></div>
      <div class="explain-item"><div class="e-label">Time complexity (this op)</div><div class="e-value mono">${complexityText}</div></div>
      <div class="explain-item"><div class="e-label">Space complexity</div><div class="e-value mono">${meta.space.split('—')[0].trim()}</div></div>
    </div>`;
}

let toastCounter = 0;
function showToast(msg, type = 'info') {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const icons = { success: '✔', error: '⚠', info: 'ℹ', warning: '⚠' };
  const id = 'toast-' + (++toastCounter);
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.id = id;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span class="toast-text">${stripTags(msg)}</span>`;
  stack.appendChild(toast);
  while (stack.children.length > 4) stack.removeChild(stack.firstChild);
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 4200);
}

function burstConfetti(count = 60) {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const colors = ['#F2A65A', '#5EEAD4', '#7EE0A8', '#F2666A', '#E8E9F3'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const x = Math.random() * 100;
    const duration = 2.2 + Math.random() * 1.6;
    const delay = Math.random() * 0.4;
    piece.style.left = x + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = duration + 's';
    piece.style.animationDelay = delay + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + delay) * 1000 + 200);
  }
}

/** Require a non-empty value; letters/numbers both allowed (generic "value" fields). */
function requireValue(raw, label = 'Value') {
  const v = (raw || '').trim();
  if (!v) throw new OpError(`${label} cannot be empty. Please enter something first.`);
  return v;
}
/** Require a value that is a valid number — for structures whose ordering/comparison
 *  depends on numeric semantics (Array sort, BST, Heap). Rejects letters. */
function requireNumericValue(raw, label = 'Value') {
  const v = (raw || '').trim();
  if (!v) throw new OpError(`${label} cannot be empty. Please enter something first.`);
  if (!/^-?\d+(\.\d+)?$/.test(v)) throw new OpError(`${label} must be a number, not text — this structure orders elements numerically.`);
  return v;
}
/** Require a valid capacity/size integer within a sane demo range — used by the
 *  Stack/Queue "set size before starting" gate. Rejects decimals, letters,
 *  negatives, zero, and unreasonably large numbers (which would break the layout). */
function requireCapacity(raw, max = 100) {
  const v = (raw ?? '').toString().trim();
  if (!v) throw new OpError('Please enter a capacity — the stack/queue cannot start without one.');
  if (!/^-?\d+(\.\d+)?$/.test(v)) throw new OpError('Capacity must be a whole number — letters and symbols are not valid here.');
  if (/\./.test(v)) throw new OpError('Capacity must be a whole number, not a decimal (e.g. 5, not 5.5).');
  const n = parseInt(v, 10);
  if (n < 0) throw new OpError('Capacity cannot be negative.');
  if (n === 0) throw new OpError('Capacity cannot be 0 — there would be no room for any elements.');
  if (n > max) throw new OpError(`Capacity is too large for a smooth visualization — please pick a number between 1 and ${max}.`);
  return n;
}

/* ---------------------------------------------------------------
   0c. CAPACITY MODAL — a modern overlay dialog used by Stack and
   Queue to collect a capacity before any operation is allowed.
   Promise-based: `await openCapacityModal({...})` resolves with a
   validated positive integer once the user confirms.
   --------------------------------------------------------------- */
function ensureCapacityModalDOM() {
  if (document.getElementById('capacityModalOverlay')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="capacityModalOverlay" aria-hidden="true">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="capModalTitle">
        <div class="modal-icon" id="capModalIcon">📏</div>
        <h3 id="capModalTitle">Set Capacity</h3>
        <p class="modal-sub" id="capModalSub">Choose how many elements this structure can hold.</p>
        <label class="sr-only" for="capModalInput">Capacity</label>
        <div class="modal-input-row">
          <input type="text" id="capModalInput" inputmode="numeric" autocomplete="off" maxlength="4">
        </div>
        <p class="modal-error" id="capModalError" role="alert" hidden></p>
        <div class="modal-actions">
          <button class="btn btn-primary" id="capModalConfirm">Confirm Capacity</button>
        </div>
        <p class="modal-footnote">Whole numbers from 1–<span id="capModalMax">100</span>. You can change this later.</p>
      </div>
    </div>`);
}

function openCapacityModal({ title, subtitle, defaultValue = 5, max = 100, icon = '📏' }) {
  ensureCapacityModalDOM();
  const overlay = document.getElementById('capacityModalOverlay');
  const input = document.getElementById('capModalInput');
  const errorEl = document.getElementById('capModalError');
  const confirmBtn = document.getElementById('capModalConfirm');
  document.getElementById('capModalTitle').textContent = title;
  document.getElementById('capModalSub').textContent = subtitle;
  document.getElementById('capModalIcon').textContent = icon;
  document.getElementById('capModalMax').textContent = String(max);
  input.value = String(defaultValue);
  errorEl.hidden = true;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-locked');

  return new Promise((resolve) => {
    function cleanup() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-locked');
      confirmBtn.removeEventListener('click', onConfirm);
      input.removeEventListener('keydown', onKey);
    }
    function onConfirm() {
      try {
        const n = requireCapacity(input.value, max);
        cleanup();
        resolve(n);
      } catch (e) {
        errorEl.textContent = `⚠ ${e.message}`;
        errorEl.hidden = false;
        input.focus();
        input.select();
        overlay.querySelector('.modal-card').classList.remove('shake');
        void overlay.offsetWidth;
        overlay.querySelector('.modal-card').classList.add('shake');
      }
    }
    function onKey(e) { if (e.key === 'Enter') onConfirm(); }
    confirmBtn.addEventListener('click', onConfirm);
    input.addEventListener('keydown', onKey);
    setTimeout(() => { input.focus(); input.select(); }, 150);
  });
}
function requireIndex(raw, label = 'Index') {
  if (raw === '' || raw === null || raw === undefined) throw new OpError(`Please enter ${label.toLowerCase()}.`);
  if (!/^-?\d+$/.test(String(raw).trim())) throw new OpError(`${label} must be a whole number, not text.`);
  const n = parseInt(raw, 10);
  if (n < 0) throw new OpError(`${label} cannot be negative.`);
  return n;
}
/** Require a valid number (used for priority fields). */
function requireNumber(raw, label = 'Priority') {
  const v = (raw ?? '').toString().trim();
  if (v === '') throw new OpError(`${label} cannot be empty.`);
  if (!/^-?\d+(\.\d+)?$/.test(v)) throw new OpError(`${label} must be a number, not text.`);
  return Number(v);
}
function requireInBounds(idx, length, label = 'Index') {
  if (idx < 0 || idx >= length) throw new OpError(`${label} ${idx} is out of bounds (valid range: 0–${Math.max(length - 1, 0)}).`);
  return idx;
}
/** Simple clone helper (structuredClone with a JSON fallback for older browsers). */
function cloneState(state) {
  try { return structuredClone(state); } catch { return JSON.parse(JSON.stringify(state)); }
}

/** Undo/redo-style history so the Step Back / Step Forward controls do something real. */
class HistoryManager {
  constructor() { this.stack = []; this.idx = -1; }
  push(state) {
    this.stack = this.stack.slice(0, this.idx + 1);
    this.stack.push(cloneState(state));
    this.idx = this.stack.length - 1;
  }
  back() { if (this.idx <= 0) return null; this.idx--; return cloneState(this.stack[this.idx]); }
  forward() { if (this.idx >= this.stack.length - 1) return null; this.idx++; return cloneState(this.stack[this.idx]); }
}

function wireHistoryButtons(key, history, restoreFn, logEl) {
  document.getElementById(`${key}-stepback`).addEventListener('click', () => {
    const state = history.back();
    if (!state) { showInfo(logEl, 'Already at the earliest recorded state.'); return; }
    restoreFn(state);
    showInfo(logEl, '⏮ Stepped back to the previous state.');
  });
  document.getElementById(`${key}-stepfwd`).addEventListener('click', () => {
    const state = history.forward();
    if (!state) { showInfo(logEl, 'Already at the most recent state.'); return; }
    restoreFn(state);
    showInfo(logEl, '⏭ Stepped forward to the next state.');
  });
}

/**
 * Attach click handlers to every [data-op] button inside `scopeEl`.
 * Guarantees: buttons disable during the async op, thrown OpErrors become
 * clean messages (never a JS crash / silent animation), and progress is
 * only recorded once the operation actually completes without error.
 */
function wireOpButtons(scopeEl, ops, ctx, logEl, key, history = null, snapshotFn = null) {
  scopeEl.querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const op = ops[btn.dataset.op];
      if (!op) return;
      btn.disabled = true;
      try {
        await op(ctx);
        bumpProgress(key, 'operate');
        if (history && snapshotFn) history.push(snapshotFn());
      } catch (e) {
        if (e && e.isOpError) { if (e.message) showError(logEl, e.message); }
        else { showError(logEl, 'Unexpected error — operation cancelled.'); console.error(e); }
      } finally {
        btn.disabled = false;
      }
    });
  });
  // Keyboard shortcut: Enter in any toolbar input triggers the primary action,
  // so keyboard-only users never have to reach for the mouse to push/enqueue/insert.
  const primaryBtn = scopeEl.querySelector('.op-btn.primary');
  if (primaryBtn) {
    scopeEl.querySelectorAll('input[type="text"], input[type="number"]').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !primaryBtn.disabled) { e.preventDefault(); primaryBtn.click(); }
      });
    });
  }
}


/* ---------------------------------------------------------------
   1. CONTENT DATA — one entry per data structure
   --------------------------------------------------------------- */
const DS_META = {
  array: {
    title: 'Array', tag: 'Linear · Fixed layout',
    tagline: 'A row of same-sized slots sitting next to each other in memory, each reachable instantly by its index.',
    definition: 'An array is a collection of elements stored in contiguous memory locations, each identified by an index starting at 0. Because every element is the same size, the address of any element can be computed directly from its index.',
    example: 'A row of numbered lockers in a school hallway — locker #7 is always the 7th one along, and you can walk straight to it without checking the others first.',
    explanation: 'Because arrays are contiguous, the computer can jump straight to any element using a single calculation (base address + index × element size). This makes reading by index extremely fast, but it also means inserting or removing in the middle requires shifting every element after it to keep the row unbroken.',
    applications: ['Image pixel grids and matrices', 'Lookup / frequency tables', 'Implementing other structures (stacks, heaps, hash tables)', 'Buffers for audio/video streaming'],
    pros: ['O(1) random access by index', 'Cache-friendly — great memory locality', 'Simple and memory-efficient for fixed-size data'],
    cons: ['Costly insert/delete in the middle — O(n) shifting', 'Fixed size in many languages (resizing means copying)', 'Wastes space if over-allocated'],
    complexity: [
      ['Access by index', 'O(1)', 'O(1)', 'O(1)'],
      ['Search (unsorted)', 'O(1)', 'O(n)', 'O(n)'],
      ['Insert at end', 'O(1)', 'O(1)', 'O(n)*'],
      ['Insert at beginning/middle', 'O(n)', 'O(n)', 'O(n)'],
      ['Delete', 'O(1)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) — one slot per element, no extra pointer overhead.',
    notes: ['*Insert at end is O(n) worst-case only when the underlying array must be resized/copied.', 'A sorted array upgrades search to O(log n) via binary search, but insert/delete stay O(n).'],
    quiz: [
      { q: 'What is the time complexity of accessing an element by index in an array?', opts: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'], correct: 0 },
      { q: 'Why is inserting at the beginning of an array expensive?', opts: ['It requires resizing memory every time', 'Every existing element must shift one position', 'Arrays cannot store new values', 'It requires re-sorting the array'], correct: 1 },
      { q: 'Which scenario benefits most from an array over a linked list?', opts: ['Frequent insertions at the front', 'Need for fast random access by index', 'Unknown size that changes constantly', 'Implementing a queue of variable length'], correct: 1 },
    ],
    interview: [
      { q: 'Why is array access O(1) but linked list access O(n)?', a: 'An array element\'s address is computed directly (base + index × size), needing no traversal. A linked list has no such formula — reaching the k-th node means following k pointers one at a time from the head.' },
      { q: 'How would you reverse an array in-place?', a: 'Use two pointers, one at each end, swapping the elements they point to and moving both inward until they meet — O(n) time, O(1) extra space.' },
      { q: 'What happens when a dynamic array (like a JS array or Python list) runs out of capacity?', a: 'The runtime allocates a new, larger block (commonly double the size), copies every existing element across, and frees the old block — an O(n) operation that happens rarely enough that insertion stays O(1) amortized.' },
    ],
    coding: [
      { q: 'Find the maximum subarray sum (Kadane\'s Algorithm).', a: 'function maxSubArray(nums){\n  let best = nums[0], cur = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    best = Math.max(best, cur);\n  }\n  return best;\n}' },
      { q: 'Rotate an array to the right by k steps, in-place.', a: 'function rotate(nums, k) {\n  k %= nums.length;\n  reverse(nums, 0, nums.length - 1);\n  reverse(nums, 0, k - 1);\n  reverse(nums, k, nums.length - 1);\n}\nfunction reverse(a, l, r) {\n  while (l < r) { [a[l], a[r]] = [a[r], a[l]]; l++; r--; }\n}' },
    ],
  },

  linkedlist: {
    title: 'Linked List', tag: 'Linear · Chained nodes',
    tagline: 'Nodes scattered anywhere in memory, held together only by pointers to "whatever comes next."',
    definition: 'A linked list is a linear structure where each element ("node") stores a value and a pointer to the next node. Unlike arrays, nodes need not be contiguous — the chain of pointers is what defines the order.',
    example: 'A treasure hunt where each clue tells you the location of the next clue — you can\'t skip ahead, you must follow the chain one step at a time.',
    explanation: 'Because nodes only know about their neighbor(s), insertion and deletion just rewire a couple of pointers — no shifting required. The tradeoff is that reaching the k-th element means walking the chain from the head, one pointer at a time.',
    applications: ['Undo history / browser back-forward (doubly linked)', 'Implementing stacks and queues', 'Music playlists ("next track")', 'Memory allocators (free lists)'],
    pros: ['O(1) insert/delete once you have a reference to the node', 'Grows and shrinks without reallocation/copying', 'No wasted pre-allocated space'],
    cons: ['O(n) access/search — no random access', 'Extra memory per node for the pointer(s)', 'Poor cache locality (nodes scattered in memory)'],
    complexity: [
      ['Access by position', 'O(1)', 'O(n)', 'O(n)'],
      ['Search', 'O(1)', 'O(n)', 'O(n)'],
      ['Insert at beginning', 'O(1)', 'O(1)', 'O(1)'],
      ['Insert at end (no tail ptr)', 'O(n)', 'O(n)', 'O(n)'],
      ['Delete (given node)', 'O(1)', 'O(1)', 'O(1)'],
    ],
    space: 'O(n) for values plus O(n) for pointers — roughly double an array\'s overhead.',
    notes: ['Keeping a tail pointer drops "insert at end" to O(1).', 'Doubly linked lists trade extra memory for O(1) backward traversal and easier deletion.'],
    quiz: [
      { q: 'What must you update when deleting a node from a singly linked list?', opts: ['Nothing, deletion is automatic', 'The previous node\'s next pointer', 'Every node in the list', 'Only the head pointer'], correct: 1 },
      { q: 'Why is random access slower in a linked list than an array?', opts: ['Linked lists are always sorted', 'Nodes must be visited one by one from the head', 'Linked lists store data in reverse', 'Pointers cannot be dereferenced quickly'], correct: 1 },
      { q: 'What extra memory does a doubly linked list use compared to singly linked?', opts: ['A checksum per node', 'A previous-node pointer per node', 'A copy of the whole list', 'Nothing extra'], correct: 1 },
    ],
    interview: [
      { q: 'How do you detect a cycle in a linked list?', a: 'Floyd\'s Tortoise and Hare: move one pointer one step at a time and another two steps at a time. If they ever meet, a cycle exists; if the fast pointer reaches null, there is none — O(n) time, O(1) space.' },
      { q: 'How do you reverse a singly linked list iteratively?', a: 'Walk the list keeping three pointers: previous, current, and next. At each node, save next, point current.next back to previous, then advance previous and current forward — O(n) time, O(1) space.' },
      { q: 'Array vs linked list — when would you choose each?', a: 'Choose an array when you need fast random access and know the size roughly in advance. Choose a linked list when insertions/deletions at arbitrary points are frequent and random access is rare.' },
    ],
    coding: [
      { q: 'Reverse a singly linked list.', a: 'function reverse(head) {\n  let prev = null, cur = head;\n  while (cur) {\n    const next = cur.next;\n    cur.next = prev;\n    prev = cur;\n    cur = next;\n  }\n  return prev;\n}' },
      { q: 'Detect if a linked list has a cycle.', a: 'function hasCycle(head) {\n  let slow = head, fast = head;\n  while (fast && fast.next) {\n    slow = slow.next;\n    fast = fast.next.next;\n    if (slow === fast) return true;\n  }\n  return false;\n}' },
    ],
  },

  stack: {
    title: 'Stack', tag: 'Linear · LIFO',
    tagline: 'Last one in is always the first one out — like a stack of plates, you only ever touch the top.',
    definition: 'A stack is a linear structure that follows Last-In-First-Out (LIFO): elements are added (pushed) and removed (popped) only from one end, called the top.',
    example: 'A stack of dinner plates — you place a new plate on top, and you always take the top plate off first, never one from the middle.',
    explanation: 'Because all activity happens at a single end, both push and pop are extremely cheap — no shifting, no searching. The tradeoff is that you can only ever see or touch the top element; anything beneath it is temporarily inaccessible.',
    applications: ['Function call stack / recursion', 'Undo/redo functionality', 'Expression evaluation & syntax parsing (balanced parentheses)', 'Browser back button history'],
    pros: ['O(1) push and pop', 'Very simple to implement and reason about', 'Naturally models nested/recursive processes'],
    cons: ['No random access to non-top elements', 'Searching requires popping everything above the target', 'Risk of stack overflow if unbounded and array-backed'],
    complexity: [
      ['Push', 'O(1)', 'O(1)', 'O(1)*'],
      ['Pop', 'O(1)', 'O(1)', 'O(1)'],
      ['Peek', 'O(1)', 'O(1)', 'O(1)'],
      ['Search', 'O(1)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) — one slot per element.',
    notes: ['*Push is O(n) only in the rare resize case for an array-backed stack.'],
    quiz: [
      { q: 'A stack follows which principle?', opts: ['FIFO', 'LIFO', 'Random access', 'Priority-based'], correct: 1 },
      { q: 'Which operation retrieves the top element without removing it?', opts: ['Pop', 'Enqueue', 'Peek', 'Shift'], correct: 2 },
      { q: 'Which classic problem is most naturally solved with a stack?', opts: ['Finding the shortest path in a graph', 'Checking for balanced parentheses', 'Sorting a large dataset', 'Finding the median of a stream'], correct: 1 },
    ],
    interview: [
      { q: 'How is the call stack related to recursion?', a: 'Every function call pushes a new frame (its local variables and return address) onto the call stack. Returning pops that frame off. Deep or infinite recursion exhausts the stack, causing a stack overflow — the same LIFO behavior as the data structure.' },
      { q: 'How would you implement a queue using two stacks?', a: 'Keep an "in" stack for enqueues. For dequeue, if the "out" stack is empty, pop everything from "in" and push it onto "out" (reversing the order), then pop from "out". This amortizes to O(1) per operation.' },
    ],
    coding: [
      { q: 'Check if a string of parentheses is balanced.', a: 'function isBalanced(s) {\n  const stack = [];\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  for (const ch of s) {\n    if ("([{".includes(ch)) stack.push(ch);\n    else if (ch in pairs) {\n      if (stack.pop() !== pairs[ch]) return false;\n    }\n  }\n  return stack.length === 0;\n}' },
    ],
  },

  queue: {
    title: 'Queue', tag: 'Linear · FIFO',
    tagline: 'First one in line is first one served — new arrivals join the back, service happens at the front.',
    definition: 'A queue is a linear structure that follows First-In-First-Out (FIFO): elements are added at the rear (enqueue) and removed from the front (dequeue).',
    example: 'A checkout line at a store — the first person to join the line is the first person served, and everyone else waits their turn behind.',
    explanation: 'Because insertions and removals happen at opposite ends, a queue naturally preserves arrival order. An array-backed queue must either shift elements on dequeue or use a circular buffer to keep both ends O(1).',
    applications: ['Task/job scheduling (printers, CPUs)', 'Breadth-first search traversal', 'Handling requests in web servers', 'Buffering data streams'],
    pros: ['O(1) enqueue and dequeue (with proper implementation)', 'Preserves arrival order fairly', 'Simple model for real-world waiting lines'],
    cons: ['No random access to middle elements', 'Naive array implementation needs shifting on dequeue', 'Fixed-size arrays need circular indexing to avoid wasted space'],
    complexity: [
      ['Enqueue', 'O(1)', 'O(1)', 'O(1)'],
      ['Dequeue', 'O(1)', 'O(1)', 'O(1)'],
      ['Front / Rear peek', 'O(1)', 'O(1)', 'O(1)'],
      ['Search', 'O(1)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) — one slot per element.',
    notes: ['A linked-list queue with head and tail pointers achieves true O(1) enqueue/dequeue with no wasted space.'],
    quiz: [
      { q: 'A queue follows which principle?', opts: ['LIFO', 'FIFO', 'Random priority', 'Circular only'], correct: 1 },
      { q: 'Which end does a queue add new elements to?', opts: ['Front', 'Middle', 'Rear', 'Wherever there is space'], correct: 2 },
      { q: 'Which traversal algorithm uses a queue internally?', opts: ['Depth-First Search', 'Breadth-First Search', 'Binary Search', 'Quick Sort'], correct: 1 },
    ],
    interview: [
      { q: 'Why does BFS use a queue while DFS uses a stack?', a: 'BFS explores level by level — it needs to finish visiting all nodes at the current distance before moving further out, which a FIFO queue naturally enforces. DFS dives as deep as possible before backtracking, which matches a LIFO stack (or recursion, which is a stack itself).' },
    ],
    coding: [
      { q: 'Implement a queue using two stacks.', a: 'class QueueWithStacks {\n  constructor() { this.inS = []; this.outS = []; }\n  enqueue(x) { this.inS.push(x); }\n  dequeue() {\n    if (!this.outS.length) {\n      while (this.inS.length) this.outS.push(this.inS.pop());\n    }\n    return this.outS.pop();\n  }\n}' },
    ],
  },

  circularqueue: {
    title: 'Circular Queue', tag: 'Linear · Wrap-around FIFO',
    tagline: 'A fixed-size queue that loops back to the start, so no slot is ever wasted once elements are dequeued.',
    definition: 'A circular queue is a fixed-capacity queue where the rear wraps around to index 0 after reaching the end of the buffer, reusing freed slots left behind by dequeues.',
    example: 'A roundabout car park with numbered spots — once a car leaves spot 1, the next arriving car can take spot 1 again, even if spots 5–8 further ahead are already full.',
    explanation: 'A plain array queue "wastes" the front slots once elements are dequeued from them, since the rear only ever moves forward. A circular queue solves this by computing rear and front with modulo arithmetic, so the buffer reuses freed space instead of needing to shift or grow.',
    applications: ['CPU scheduling ring buffers', 'Streaming/audio buffers', 'Traffic light or round-robin scheduling systems', 'Keyboard input buffers'],
    pros: ['Reuses freed space — no shifting needed', 'O(1) enqueue/dequeue with fixed memory', 'Predictable, bounded memory footprint'],
    cons: ['Fixed capacity — must detect "full" vs "empty" carefully', 'Resizing still requires a full copy', 'Slightly trickier index math than a linear queue'],
    complexity: [
      ['Enqueue', 'O(1)', 'O(1)', 'O(1)'],
      ['Dequeue', 'O(1)', 'O(1)', 'O(1)'],
      ['Front / Rear peek', 'O(1)', 'O(1)', 'O(1)'],
      ['isFull / isEmpty check', 'O(1)', 'O(1)', 'O(1)'],
    ],
    space: 'O(n) fixed — capacity is decided up front.',
    notes: ['A common gotcha: front === rear can mean either "empty" or "full" — most implementations track a separate count or leave one slot always empty to disambiguate.'],
    quiz: [
      { q: 'What problem does a circular queue solve compared to a linear array queue?', opts: ['It sorts elements automatically', 'It reuses slots freed by dequeues instead of wasting them', 'It allows random access', 'It removes the need for a rear pointer'], correct: 1 },
      { q: 'How is the next rear position typically computed?', opts: ['rear + 1', '(rear + 1) % capacity', 'rear - 1', 'capacity - rear'], correct: 1 },
    ],
    interview: [
      { q: 'How do you distinguish a full circular queue from an empty one when front === rear?', a: 'Either keep a running count of elements, use a size variable, or deliberately leave one slot always empty so full is detected when (rear+1)%capacity === front.' },
    ],
    coding: [
      { q: 'Implement enqueue/dequeue for a fixed-size circular queue.', a: 'class CircularQueue {\n  constructor(cap) { this.a = new Array(cap); this.cap = cap; this.front = 0; this.size = 0; }\n  enqueue(x) {\n    if (this.size === this.cap) throw new Error("full");\n    const rear = (this.front + this.size) % this.cap;\n    this.a[rear] = x; this.size++;\n  }\n  dequeue() {\n    if (this.size === 0) throw new Error("empty");\n    const v = this.a[this.front];\n    this.front = (this.front + 1) % this.cap; this.size--;\n    return v;\n  }\n}' },
    ],
  },

  deque: {
    title: 'Deque', tag: 'Linear · Double-ended',
    tagline: 'A queue that lets you push and pop from either end — front or rear, your choice.',
    definition: 'A deque (double-ended queue) generalizes both stacks and queues by allowing insertion and deletion at both the front and the rear.',
    example: 'A deck of cards where you\'re allowed to draw from or add to either the top or the bottom, unlike a strict single-ended pile.',
    explanation: 'A deque is usually backed by a doubly linked list or a circular array, so that both ends support O(1) operations. It\'s strictly more flexible than a stack or queue — either can be implemented on top of a deque by simply restricting which ends you use.',
    applications: ['Sliding window algorithms (max/min in a window)', 'Undo/redo with both forward and backward navigation', 'Work-stealing schedulers in parallel computing', 'Palindrome checking'],
    pros: ['O(1) insertion/removal at both ends', 'Flexible — can emulate a stack or a queue', 'Great fit for sliding-window style algorithms'],
    cons: ['No random access to the middle', 'Slightly more bookkeeping than a single-ended structure', 'Array-backed versions need circular indexing for both ends'],
    complexity: [
      ['Insert Front / Rear', 'O(1)', 'O(1)', 'O(1)'],
      ['Delete Front / Rear', 'O(1)', 'O(1)', 'O(1)'],
      ['Peek Front / Rear', 'O(1)', 'O(1)', 'O(1)'],
      ['Search', 'O(1)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) — one slot per element.',
    notes: ['The classic "sliding window maximum" problem runs in O(n) total using a deque that stores indices, not values.'],
    quiz: [
      { q: 'What makes a deque different from a regular queue?', opts: ['It only allows removal, not insertion', 'It supports insertion and deletion at both ends', 'It automatically sorts its elements', 'It has no fixed order'], correct: 1 },
      { q: 'A deque can emulate which two structures?', opts: ['Array and hash table', 'Stack and queue', 'Tree and graph', 'Heap and trie'], correct: 1 },
    ],
    interview: [
      { q: 'How is a deque used to solve the sliding window maximum problem?', a: 'Maintain a deque of indices whose corresponding values are in decreasing order. For each new element, pop smaller values from the back before pushing it, and pop the front if it has slid out of the window. The front of the deque is always the current window\'s maximum — O(n) total.' },
    ],
    coding: [
      { q: 'Implement a deque with pushFront, pushBack, popFront, popBack.', a: 'class Deque {\n  constructor() { this.items = []; }\n  pushFront(x) { this.items.unshift(x); }\n  pushBack(x) { this.items.push(x); }\n  popFront() { return this.items.shift(); }\n  popBack() { return this.items.pop(); }\n}\n// Note: a production deque avoids array shift/unshift (O(n))\n// by using a doubly linked list or circular buffer instead.' },
    ],
  },

  priorityqueue: {
    title: 'Priority Queue', tag: 'Linear · Priority-ordered',
    tagline: 'Not first-come-first-served — the most important item always comes out first, regardless of arrival order.',
    definition: 'A priority queue is an abstract structure where each element has a priority, and the element with the highest (or lowest) priority is always served first, regardless of insertion order.',
    example: 'A hospital emergency room — a patient with a life-threatening injury is seen before someone who arrived earlier with a minor scrape.',
    explanation: 'Conceptually it\'s a queue, but the "next to serve" is determined by priority rather than arrival time. In practice, priority queues are almost always implemented with a binary heap, since a heap keeps the highest/lowest priority element accessible in O(1) and both insert and extract in O(log n).',
    applications: ["Dijkstra's shortest path algorithm", 'CPU task scheduling by priority', 'Huffman encoding for compression', 'Event simulation systems'],
    pros: ['Always serves the most important element next', 'O(log n) insert and extract when heap-backed', 'Flexible priority definitions (min or max)'],
    cons: ['No FIFO fairness among equal priorities unless explicitly handled', 'More complex to implement than a plain queue', 'Not naturally suited to random access or search'],
    complexity: [
      ['Insert', 'O(1)', 'O(log n)', 'O(log n)'],
      ['Extract highest priority', 'O(log n)', 'O(log n)', 'O(log n)'],
      ['Peek highest priority', 'O(1)', 'O(1)', 'O(1)'],
      ['Search arbitrary element', 'O(n)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) — same footprint as the underlying heap array.',
    notes: ['A naive unsorted-array priority queue makes insert O(1) but extract O(n); a sorted array flips that. A heap balances both at O(log n).'],
    quiz: [
      { q: 'What determines the order elements leave a priority queue?', opts: ['Arrival time only', 'Assigned priority value', 'Random selection', 'Alphabetical order of labels'], correct: 1 },
      { q: 'What structure most commonly implements a priority queue efficiently?', opts: ['Linked list', 'Binary heap', 'Hash table', 'Plain unsorted array only'], correct: 1 },
    ],
    interview: [
      { q: 'Why use a heap instead of a sorted array for a priority queue?', a: 'A sorted array gives O(1) peek/extract at one end but O(n) insertion to keep it sorted. A binary heap balances both insert and extract at O(log n), which scales far better under mixed workloads.' },
      { q: "Name an algorithm that depends on a priority queue.", a: "Dijkstra's shortest-path algorithm repeatedly extracts the unvisited vertex with the smallest known distance — exactly the operation a min-priority-queue is built for, giving it O((V+E) log V) time with a binary heap." },
    ],
    coding: [
      { q: 'Insert into a min-priority-queue backed by a binary heap (array).', a: 'function insert(heap, val) {\n  heap.push(val);\n  let i = heap.length - 1;\n  while (i > 0) {\n    const parent = (i - 1) >> 1;\n    if (heap[parent] <= heap[i]) break;\n    [heap[parent], heap[i]] = [heap[i], heap[parent]];\n    i = parent;\n  }\n}' },
    ],
  },

  tree: {
    title: 'Binary Tree & Binary Search Tree', tag: 'Hierarchical',
    tagline: 'Data that branches — every node has at most two children, and in a BST, position encodes order.',
    definition: 'A binary tree is a hierarchical structure where each node has at most two children, typically called left and right. A Binary Search Tree (BST) adds a rule: every left subtree contains only smaller values, and every right subtree only larger ones.',
    example: 'A binary tree is like a family tree limited to two children per parent. A BST is like a well-organized filing cabinet where, at every drawer, "smaller files go left, bigger files go right" — so you can find any file by repeatedly choosing a direction.',
    explanation: 'The BST ordering rule means search, insert, and delete can all discard half the remaining tree at every step, giving O(log n) performance — but only when the tree stays roughly balanced. A tree built from already-sorted input degrades into a straight chain, making every operation O(n), which is why self-balancing variants (AVL, Red-Black) exist.',
    applications: ['Efficient sorted-order storage (databases, filesystems)', 'Expression parsing/evaluation', 'Autocomplete and prefix matching (with tries, a related structure)', 'Priority queues and heaps (a specialized binary tree)'],
    pros: ['O(log n) search/insert/delete when balanced', 'In-order traversal yields sorted data for free', 'Naturally models hierarchical relationships'],
    cons: ['Degrades to O(n) if unbalanced (e.g. sorted input)', 'More complex to implement than linear structures', 'Deletion logic (especially two-child case) is fiddly'],
    complexity: [
      ['Search', 'O(log n)', 'O(log n)', 'O(n)'],
      ['Insert', 'O(log n)', 'O(log n)', 'O(n)'],
      ['Delete', 'O(log n)', 'O(log n)', 'O(n)'],
      ['Traversal (any order)', 'O(n)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) for the nodes, plus O(h) call-stack space for recursive operations, where h is the tree height.',
    notes: ['Worst case O(n) happens when the tree becomes a chain (e.g. inserting already-sorted values one by one).', 'Self-balancing trees (AVL, Red-Black) guarantee O(log n) worst case by rebalancing after every insert/delete.'],
    quiz: [
      { q: 'In a Binary Search Tree, where do values smaller than the current node go?', opts: ['Right subtree', 'Left subtree', 'Either side randomly', 'They replace the node'], correct: 1 },
      { q: 'What traversal order visits a BST\'s nodes in sorted order?', opts: ['Preorder', 'Postorder', 'Inorder', 'Level order'], correct: 2 },
      { q: 'When does a BST\'s performance degrade to O(n)?', opts: ['When it has an even number of nodes', 'When it becomes unbalanced, e.g. a straight chain', 'When values are all negative', 'BSTs never degrade'], correct: 1 },
    ],
    interview: [
      { q: 'Why does inserting sorted data one-by-one make a BST slow?', a: 'Each new value is always larger (or smaller) than everything already inserted, so it always becomes a rightmost (or leftmost) child — the tree grows into a straight line with height n instead of log n, making every future operation O(n).' },
      { q: 'Walk through deleting a node with two children from a BST.', a: 'Find either the in-order predecessor (largest value in the left subtree) or in-order successor (smallest value in the right subtree), copy that value into the node being deleted, then recursively delete that predecessor/successor node instead — which has at most one child, a simpler case.' },
      { q: 'What is the difference between BFS (level order) and DFS traversals on a tree?', a: 'Level order visits nodes breadth-first, layer by layer, using a queue. DFS-based traversals (preorder, inorder, postorder) go as deep as possible down one branch before backtracking, using a stack or recursion.' },
    ],
    coding: [
      { q: 'Search for a value in a BST.', a: 'function search(node, val) {\n  if (!node) return null;\n  if (val === node.val) return node;\n  return val < node.val ? search(node.left, val) : search(node.right, val);\n}' },
      { q: 'Return the inorder traversal of a binary tree.', a: 'function inorder(node, out = []) {\n  if (!node) return out;\n  inorder(node.left, out);\n  out.push(node.val);\n  inorder(node.right, out);\n  return out;\n}' },
    ],
  },

  heap: {
    title: 'Heap', tag: 'Hierarchical · Priority-ordered tree',
    tagline: 'A binary tree with one rule: every parent beats its children — always. That\'s what makes the top O(1) to read.',
    definition: 'A heap is a complete binary tree where every parent node satisfies the heap property: in a max-heap, the parent is always ≥ its children; in a min-heap, always ≤. It is usually stored compactly in an array.',
    example: 'A single-elimination sports tournament bracket run in reverse — the strongest competitor always "rises" to sit above weaker ones at every level, so the champion is always at the very top.',
    explanation: 'Because it\'s a *complete* tree (filled left to right, level by level), a heap can be stored in a plain array with no pointers at all — a node at index i has children at 2i+1 and 2i+2. Insertion adds at the end and "bubbles up" while it violates the heap property; deletion of the root swaps in the last element and "sifts down." Both take O(log n) since the tree height is always log n.',
    applications: ['Priority queues (task scheduling, Dijkstra\'s algorithm)', 'Heap sort', 'Finding the k-th largest/smallest element efficiently', 'Median-maintenance with two heaps'],
    pros: ['O(log n) insert and extract-max/min', 'O(1) peek at the max/min element', 'Compact array storage — no pointer overhead'],
    cons: ['Not sorted overall — only the root guarantee holds', 'O(n) search for an arbitrary value', 'Rebuilding/heapifying from scratch is O(n) if not done carefully'],
    complexity: [
      ['Find max/min', 'O(1)', 'O(1)', 'O(1)'],
      ['Insert', 'O(1)', 'O(log n)', 'O(log n)'],
      ['Delete max/min', 'O(log n)', 'O(log n)', 'O(log n)'],
      ['Build heap from array', 'O(n)', 'O(n)', 'O(n)'],
    ],
    space: 'O(n) — stored as a single flat array, no pointers needed.',
    notes: ['Building a heap from n elements all at once (heapify) is O(n), not O(n log n) — a classic, often-tested surprise.'],
    quiz: [
      { q: 'In a max-heap, how does a parent compare to its children?', opts: ['Parent is always smaller', 'Parent is always greater or equal', 'No relationship is guaranteed', 'Parent equals the sum of children'], correct: 1 },
      { q: 'How is a heap typically stored?', opts: ['As a doubly linked list', 'As a compact array using index math for children', 'As a hash table', 'As a graph adjacency matrix'], correct: 1 },
      { q: 'What is the time complexity to build a heap from n unsorted elements?', opts: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correct: 1 },
    ],
    interview: [
      { q: 'How do you find the k-th largest element efficiently?', a: 'Maintain a min-heap of size k as you scan the data: push each element, and if the heap exceeds size k, pop the smallest. After processing everything, the heap\'s root is the k-th largest — O(n log k) time.' },
      { q: 'Why is a heap not simply "a sorted array"?', a: 'A heap only guarantees the parent/child relationship, not a full ordering between siblings or across subtrees — this looser guarantee is exactly what makes insert/delete O(log n) instead of O(n).' },
    ],
    coding: [
      { q: 'Sift-up (bubble up) after inserting into a min-heap array.', a: 'function siftUp(heap, i) {\n  while (i > 0) {\n    const p = (i - 1) >> 1;\n    if (heap[p] <= heap[i]) break;\n    [heap[p], heap[i]] = [heap[i], heap[p]];\n    i = p;\n  }\n}' },
      { q: 'Sift-down (heapify) after removing the root of a min-heap.', a: 'function siftDown(heap, i, n) {\n  while (true) {\n    let smallest = i, l = 2*i+1, r = 2*i+2;\n    if (l < n && heap[l] < heap[smallest]) smallest = l;\n    if (r < n && heap[r] < heap[smallest]) smallest = r;\n    if (smallest === i) break;\n    [heap[i], heap[smallest]] = [heap[smallest], heap[i]];\n    i = smallest;\n  }\n}' },
    ],
  },

  graph: {
    title: 'Graph', tag: 'Networked',
    tagline: 'Not a straight line, not a strict hierarchy — just vertices, connected however the real world actually connects them.',
    definition: 'A graph is a set of vertices (nodes) connected by edges, which may be directed or undirected, weighted or unweighted. Unlike trees, graphs allow cycles and don\'t require a single root.',
    example: 'A map of flight routes between cities — a city can connect to many others directly, routes can form loops, and there\'s no single "root" city everything descends from.',
    explanation: 'Graphs are usually represented either as an adjacency list (each vertex stores the list of vertices it connects to — compact, good for sparse graphs) or an adjacency matrix (an n×n grid of connections — fast edge lookup, but O(n²) space). Traversal algorithms like BFS and DFS are the foundation nearly every graph algorithm builds on.',
    applications: ['Social networks (people as vertices, friendships as edges)', 'Maps and GPS routing', 'Web page linking (PageRank)', 'Dependency resolution (build systems, package managers)'],
    pros: ['Models real-world many-to-many relationships naturally', 'Rich algorithm toolkit (shortest path, spanning tree, flow)', 'Adjacency list representation is memory-efficient for sparse graphs'],
    cons: ['Adjacency matrix wastes O(n²) space for sparse graphs', 'Many graph algorithms are inherently more complex than tree/list ones', 'Cycle detection and traversal need explicit "visited" tracking'],
    complexity: [
      ['Add vertex', 'O(1)', 'O(1)', 'O(1)'],
      ['Add edge', 'O(1)', 'O(1)', 'O(1)'],
      ['BFS / DFS traversal', 'O(V+E)', 'O(V+E)', 'O(V+E)'],
      ['Check if edge exists (matrix)', 'O(1)', 'O(1)', 'O(1)'],
    ],
    space: 'O(V + E) for an adjacency list; O(V²) for an adjacency matrix.',
    notes: ['V = number of vertices, E = number of edges.', 'BFS finds shortest paths in unweighted graphs; DFS is often simpler to implement recursively and is used for cycle detection and topological sort.'],
    quiz: [
      { q: 'What is the key difference between a tree and a graph?', opts: ['Trees can have cycles, graphs cannot', 'Graphs can have cycles and no single root; trees cannot', 'Graphs must be directed', 'There is no difference'], correct: 1 },
      { q: 'Which traversal explores all neighbors at the current depth before going deeper?', opts: ['DFS', 'BFS', 'Inorder traversal', 'Binary search'], correct: 1 },
      { q: 'What is the space complexity of an adjacency matrix for V vertices?', opts: ['O(V)', 'O(V log V)', 'O(V²)', 'O(V + E)'], correct: 2 },
    ],
    interview: [
      { q: 'When would you prefer an adjacency list over a matrix?', a: 'For sparse graphs (E much smaller than V²), an adjacency list uses O(V+E) space versus O(V²) for a matrix, and iterating a vertex\'s neighbors is proportional to its actual degree rather than V.' },
      { q: 'How does BFS find the shortest path in an unweighted graph?', a: 'BFS visits vertices in increasing order of distance from the source because it explores everything at distance d before anything at distance d+1 — the FIFO queue enforces this, so the first time a vertex is reached is guaranteed to be via a shortest path.' },
      { q: 'How do you detect a cycle in a directed graph?', a: 'Run DFS while tracking a "currently in recursion stack" set in addition to the usual "visited" set. If DFS reaches a vertex that is already in the current recursion stack, a cycle exists.' },
    ],
    coding: [
      { q: 'Implement BFS traversal from a source vertex.', a: 'function bfs(graph, start) {\n  const visited = new Set([start]);\n  const queue = [start];\n  const order = [];\n  while (queue.length) {\n    const v = queue.shift();\n    order.push(v);\n    for (const n of graph[v] || []) {\n      if (!visited.has(n)) { visited.add(n); queue.push(n); }\n    }\n  }\n  return order;\n}' },
      { q: 'Implement DFS traversal from a source vertex (iterative).', a: 'function dfs(graph, start) {\n  const visited = new Set();\n  const stack = [start];\n  const order = [];\n  while (stack.length) {\n    const v = stack.pop();\n    if (visited.has(v)) continue;\n    visited.add(v);\n    order.push(v);\n    for (const n of graph[v] || []) if (!visited.has(n)) stack.push(n);\n  }\n  return order;\n}' },
    ],
  },

  hashtable: {
    title: 'Hash Table', tag: 'Associative',
    tagline: 'A key goes in, a hash function decides where it lives, and lookups become nearly instant.',
    definition: 'A hash table stores key-value pairs by running each key through a hash function that computes an array index (bucket), so lookup, insert, and delete can all happen in near-constant time.',
    example: 'A coat check counter that assigns your coat to a numbered hook based on a quick calculation from your ticket number — instead of searching every hook, the attendant walks straight to the right one.',
    explanation: 'A hash function converts a key into a bucket index. Two different keys can occasionally hash to the same bucket — a collision — which is resolved either by chaining (each bucket holds a small list of entries) or open addressing (probing for the next free slot). A good hash function distributes keys evenly, keeping the average bucket short and operations close to O(1).',
    applications: ['Database indexing', 'Caches (e.g. memoization, browser caches)', 'Sets and dictionaries in most programming languages', 'Symbol tables in compilers'],
    pros: ['O(1) average-case insert, delete, and lookup', 'Extremely flexible key types (strings, objects via hashing)', 'Underpins nearly every language\'s built-in map/dictionary'],
    cons: ['Worst-case O(n) if many keys collide (poor hash function or adversarial input)', 'No inherent ordering of keys', 'Resizing (rehashing) is an expensive O(n) operation when it happens'],
    complexity: [
      ['Insert', 'O(1)', 'O(1)', 'O(n)'],
      ['Delete', 'O(1)', 'O(1)', 'O(n)'],
      ['Search', 'O(1)', 'O(1)', 'O(n)'],
    ],
    space: 'O(n) for n key-value pairs, plus some unused capacity kept free to reduce collisions (load factor).',
    notes: ['Worst case O(n) happens when every key collides into the same bucket — vanishingly rare with a good hash function, but possible with a bad one or intentionally crafted attack input.', 'Keeping the load factor (entries ÷ buckets) below ~0.7 and resizing when it climbs higher keeps operations close to O(1) in practice.'],
    quiz: [
      { q: 'What is a "collision" in a hash table?', opts: ['When two hash tables merge', 'When two different keys hash to the same bucket', 'When a key is deleted incorrectly', 'When the table runs out of memory'], correct: 1 },
      { q: 'What is the average-case time complexity of a hash table lookup?', opts: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], correct: 2 },
      { q: 'Which technique resolves collisions by storing multiple entries per bucket?', opts: ['Open addressing', 'Chaining', 'Binary search', 'Heapifying'], correct: 1 },
    ],
    interview: [
      { q: 'Why is hash table lookup O(1) on average but O(n) worst case?', a: 'A good hash function spreads keys evenly, so each bucket holds only a handful of entries on average — a short list to scan. But if many keys collide into one bucket (bad hash function or crafted input), that bucket becomes a long list, degrading lookup to O(n) in the worst case.' },
      { q: 'What is the difference between chaining and open addressing?', a: 'Chaining stores colliding entries in a secondary structure (usually a linked list) at each bucket. Open addressing instead finds another empty slot in the main array itself, using a probing sequence (linear, quadratic, or double hashing) when the first slot is occupied.' },
      { q: 'What is a load factor and why does it matter?', a: 'Load factor is the ratio of stored entries to the number of buckets. As it rises, collisions become more likely and performance degrades toward O(n); most implementations trigger a resize (and full rehash) once load factor crosses a threshold like 0.7.' },
    ],
    coding: [
      { q: 'Implement a simple hash function for strings.', a: 'function hash(key, numBuckets) {\n  let h = 0;\n  for (let i = 0; i < key.length; i++) {\n    h = (h * 31 + key.charCodeAt(i)) % numBuckets;\n  }\n  return h;\n}' },
      { q: 'Group anagrams together using a hash map.', a: 'function groupAnagrams(words) {\n  const map = new Map();\n  for (const w of words) {\n    const key = w.split("").sort().join("");\n    if (!map.has(key)) map.set(key, []);\n    map.get(key).push(w);\n  }\n  return [...map.values()];\n}' },
    ],
  },
};

const DS_ORDER = ['array','linkedlist','stack','queue','circularqueue','deque','priorityqueue','tree','heap','graph','hashtable'];


/* ---------------------------------------------------------------
   2. PAGE TEMPLATE BUILDER (shared cards: definition, pros/cons,
      complexity, applications, quiz, interview, coding, notes)
   --------------------------------------------------------------- */
function complexityRows(rows) {
  return rows.map(r => `<tr><td class="op">${r[0]}</td><td class="val">${r[1]}</td><td class="val">${r[2]}</td><td class="val">${r[3]}</td></tr>`).join('');
}

function buildCommonSections(key, meta) {
  return `
    <div class="card">
      <h2><span class="tag-num">01</span> Definition &amp; Real-Life Example</h2>
      <p>${meta.definition}</p>
      <p style="margin-top:14px; color:var(--muted);"><b style="color:var(--text)">Think of it like:</b> ${meta.example}</p>
      <p style="margin-top:14px; color:var(--muted);">${meta.explanation}</p>
    </div>

    <div class="two-col">
      <div class="card">
        <h2><span class="tag-num">02</span> Advantages &amp; Disadvantages</h2>
        <div class="pros-cons">
          <div><div class="pc-title pro">Advantages</div><ul>${meta.pros.map(p => `<li>${p}</li>`).join('')}</ul></div>
          <div><div class="pc-title con">Disadvantages</div><ul>${meta.cons.map(p => `<li>${p}</li>`).join('')}</ul></div>
        </div>
      </div>
      <div class="card">
        <h2><span class="tag-num">03</span> Applications</h2>
        <div class="pill-list">${meta.applications.map(a => `<span class="pill">${a}</span>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <h2><span class="tag-num">04</span> Time &amp; Space Complexity</h2>
      <table class="complexity">
        <thead><tr><th>Operation</th><th>Best</th><th>Average</th><th>Worst</th></tr></thead>
        <tbody>${complexityRows(meta.complexity)}</tbody>
      </table>
      <p style="margin-top:14px; font-size:14px; color:var(--muted);"><b style="color:var(--text)">Space complexity:</b> ${meta.space}</p>
    </div>

    <div class="card">
      <h2><span class="tag-num">05</span> Beginner Notes &amp; Tips</h2>
      <div class="note-grid">
        ${meta.notes.map(n => `<div class="note-item"><div class="note-label">Good to know</div><p>${n}</p></div>`).join('')}
      </div>
    </div>

    <div class="card" id="quiz-${key}">
      <h2><span class="tag-num">06</span> Practice Quiz</h2>
      <div class="quiz-body"></div>
    </div>

    <div class="card">
      <h2><span class="tag-num">07</span> Interview Questions</h2>
      <div class="accordion" id="interview-${key}"></div>
    </div>

    <div class="card">
      <h2><span class="tag-num">08</span> Coding Questions</h2>
      <div class="accordion" id="coding-${key}"></div>
    </div>
  `;
}

function renderAccordion(container, items, withCode) {
  container.innerHTML = items.map((it, i) => `
    <div class="accordion-item" data-i="${i}">
      <button class="accordion-btn">${it.q}<span class="chev">⌄</span></button>
      <div class="accordion-panel">${withCode ? `<pre><code>${escapeHtml(it.a)}</code></pre>` : `<p style="padding-top:6px;">${it.a}</p>`}</div>
    </div>`).join('');
  container.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.accordion-item').classList.toggle('open'));
  });
}
function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderQuiz(container, questions) {
  container.innerHTML = questions.map((q, qi) => `
    <div class="quiz-q" data-qi="${qi}">
      <p class="qtext">${qi + 1}. ${q.q}</p>
      <div class="quiz-opts">
        ${q.opts.map((o, oi) => `<button class="quiz-opt" data-oi="${oi}">${o}</button>`).join('')}
      </div>
    </div>`).join('');
  container.querySelectorAll('.quiz-q').forEach(qEl => {
    const qi = +qEl.dataset.qi;
    const correct = questions[qi].correct;
    qEl.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const oi = +btn.dataset.oi;
        qEl.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);
        if (oi === correct) btn.classList.add('correct');
        else {
          btn.classList.add('wrong');
          qEl.querySelector(`[data-oi="${correct}"]`).classList.add('correct');
        }
        bumpProgress(qEl.closest('.page').id, 'quiz');
      });
    });
  });
}


/* ---------------------------------------------------------------
   3. VISUALIZER TOOLBARS (per structure) + FULL PAGE ASSEMBLY
   --------------------------------------------------------------- */
function vizToolbarBoxes(key, {ends=false, priority=false} = {}) {
  return `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      ${priority ? '<input type="number" id="'+key+'-pri" placeholder="priority" style="width:80px">' : ''}
      ${ends ? `
        <button class="op-btn primary" data-op="pushFront">+ Front</button>
        <button class="op-btn primary" data-op="pushBack">+ Rear</button>
        <button class="op-btn" data-op="popFront">− Front</button>
        <button class="op-btn" data-op="popBack">− Rear</button>
      ` : ''}
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random Data</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`;
}

const PAGE_BUILDERS = {
  array: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <input type="number" id="${key}-idx" placeholder="index" style="width:70px">
      <button class="op-btn primary" data-op="insert">Insert</button>
      <button class="op-btn" data-op="delete">Delete</button>
      <button class="op-btn" data-op="update">Update</button>
      <button class="op-btn" data-op="search">Search</button>
      <button class="op-btn" data-op="reverse">Reverse</button>
      <button class="op-btn" data-op="sort">Sort</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  linkedlist: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <input type="number" id="${key}-idx" placeholder="position" style="width:80px">
      <button class="op-btn primary" data-op="insertBeg">Insert Beg</button>
      <button class="op-btn primary" data-op="insertEnd">Insert End</button>
      <button class="op-btn" data-op="insertPos">Insert @Pos</button>
      <button class="op-btn" data-op="deleteBeg">Delete Beg</button>
      <button class="op-btn" data-op="deleteEnd">Delete End</button>
      <button class="op-btn" data-op="deletePos">Delete @Pos</button>
      <button class="op-btn" data-op="search">Search</button>
      <button class="op-btn" data-op="reverse">Reverse</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  stack: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <button class="op-btn primary" data-op="push">Push</button>
      <button class="op-btn" data-op="pop">Pop</button>
      <button class="op-btn" data-op="peek">Peek</button>
      <button class="op-btn" data-op="isEmpty">isEmpty()</button>
      <button class="op-btn" data-op="isFull">isFull()</button>
      <button class="op-btn" data-op="size">Size</button>
      <button class="op-btn" data-op="clear">Clear</button>
      <button class="op-btn" data-op="changeCapacity">⚙ Change Capacity</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  queue: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <button class="op-btn primary" data-op="enqueue">Enqueue</button>
      <button class="op-btn" data-op="dequeue">Dequeue</button>
      <button class="op-btn" data-op="front">Front</button>
      <button class="op-btn" data-op="rear">Rear</button>
      <button class="op-btn" data-op="isEmpty">isEmpty()</button>
      <button class="op-btn" data-op="isFull">isFull()</button>
      <button class="op-btn" data-op="size">Size</button>
      <button class="op-btn" data-op="clear">Clear</button>
      <button class="op-btn" data-op="changeCapacity">⚙ Change Capacity</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  circularqueue: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <button class="op-btn primary" data-op="enqueue">Enqueue</button>
      <button class="op-btn" data-op="dequeue">Dequeue</button>
      <button class="op-btn" data-op="front">Front</button>
      <button class="op-btn" data-op="rear">Rear</button>
      <button class="op-btn" data-op="isEmpty">isEmpty()</button>
      <button class="op-btn" data-op="isFull">isFull()</button>
      <button class="op-btn" data-op="size">Size</button>
      <button class="op-btn" data-op="clear">Clear</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  deque: (key, meta) => vizToolbarBoxes(key, {ends:true}),
  priorityqueue: (key, meta) => vizToolbarBoxes(key, {priority:true}),
  tree: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <button class="op-btn primary" data-op="insert">Insert</button>
      <button class="op-btn" data-op="delete">Delete</button>
      <button class="op-btn" data-op="search">Search</button>
      <select id="${key}-trav">
        <option value="inorder">Inorder</option>
        <option value="preorder">Preorder</option>
        <option value="postorder">Postorder</option>
        <option value="levelorder">Level Order</option>
      </select>
      <button class="op-btn" data-op="traverse">▶ Traverse</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  heap: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <select id="${key}-mode">
        <option value="max">Max Heap</option>
        <option value="min">Min Heap</option>
      </select>
      <button class="op-btn primary" data-op="insert">Insert</button>
      <button class="op-btn" data-op="extract">Extract Root</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  graph: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="vertex" maxlength="3" style="width:70px">
      <button class="op-btn primary" data-op="addVertex">+ Vertex</button>
      <button class="op-btn" data-op="removeVertex">− Vertex</button>
      <input type="text" id="${key}-e1" placeholder="from" style="width:60px">
      <input type="text" id="${key}-e2" placeholder="to" style="width:60px">
      <button class="op-btn primary" data-op="addEdge">+ Edge</button>
      <button class="op-btn" data-op="bfs">▶ BFS</button>
      <button class="op-btn" data-op="dfs">▶ DFS</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  hashtable: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-key" placeholder="key" style="width:80px">
      <input type="text" id="${key}-val" placeholder="value" style="width:80px">
      <button class="op-btn primary" data-op="insert">Insert</button>
      <button class="op-btn" data-op="search">Search</button>
      <button class="op-btn" data-op="delete">Delete</button>
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
};
// fix priorityqueue builder (simpler, explicit) - overrides broken replace() above
PAGE_BUILDERS.priorityqueue = (key, meta) => `
  <div class="viz-toolbar">
    <input type="text" id="${key}-val" placeholder="value" maxlength="4">
    <input type="number" id="${key}-pri" placeholder="priority" style="width:80px">
    <button class="op-btn primary" data-op="insert">Insert</button>
    <button class="op-btn" data-op="extract">Extract Top</button>
    <button class="op-btn" data-op="isEmpty">isEmpty()</button>
    <button class="op-btn" data-op="clear">Clear</button>
    <span class="viz-spacer"></span>
    <button class="op-btn" data-op="random">⚄ Random</button>
    <button class="op-btn" data-op="reset">↺ Reset</button>
  </div>`;
PAGE_BUILDERS.deque = (key, meta) => `
  <div class="viz-toolbar">
    <input type="text" id="${key}-val" placeholder="value" maxlength="4">
    <button class="op-btn primary" data-op="pushFront">+ Front</button>
    <button class="op-btn primary" data-op="pushBack">+ Rear</button>
    <button class="op-btn" data-op="popFront">− Front</button>
    <button class="op-btn" data-op="popBack">− Rear</button>
    <button class="op-btn" data-op="isEmpty">isEmpty()</button>
    <button class="op-btn" data-op="clear">Clear</button>
    <span class="viz-spacer"></span>
    <button class="op-btn" data-op="random">⚄ Random</button>
    <button class="op-btn" data-op="reset">↺ Reset</button>
  </div>`;

function buildDSPageHTML(key) {
  const meta = DS_META[key];
  const useSvg = (key === 'tree' || key === 'heap' || key === 'graph');
  return `
    <div class="ds-header">
      <span class="eyebrow">${meta.tag}</span>
      <h1>${meta.title}</h1>
      <p class="tagline">${meta.tagline}</p>
      <div style="margin-top:18px; display:flex; gap:10px; align-items:center;">
        <button class="op-btn bookmark-btn" id="bookmark-${key}" data-key="${key}">☆ Bookmark</button>
      </div>
    </div>
    <div class="ds-body">
      <div class="viz-card">
        ${PAGE_BUILDERS[key](key, meta)}
        <div class="viz-canvas-wrap">
          ${useSvg ? `<div class="svg-wrap" id="${key}-canvas" style="width:100%;"></div>` : `<div id="${key}-canvas"></div>`}
        </div>
        <div class="viz-controls-bottom">
          <button class="op-btn" id="${key}-pause">⏸ Pause</button>
          <button class="op-btn" id="${key}-stepback">⏮ Undo</button>
          <button class="op-btn" id="${key}-stepfwd">⏭ Redo</button>
          <span class="speed-label">Speed</span>
          <input type="range" id="${key}-speed" min="0.5" max="2.5" step="0.25" value="1" style="width:110px">
          <span class="size-badge" id="${key}-size" style="display:none;" aria-live="polite"></span>
          <div class="op-complexity" id="${key}-complexity"><span>Ready</span></div>
        </div>
        <div class="stats-grid" id="${key}-stats"></div>
        <div class="viz-log" id="${key}-log" role="status" aria-live="polite">Try an operation above to see it animate.</div>
        <div class="explain-panel" id="${key}-explain"></div>
        <div class="history-panel">
          <div class="history-panel-head">
            <h4>Operation History</h4>
            <span class="mono" style="font-size:11px; color:var(--muted-2);">Ops performed: <b id="${key}-opcount" style="color:var(--accent-2);">0</b></span>
          </div>
          <div class="history-list" id="${key}-history"><div class="history-empty">No operations yet — try one above to see it logged here.</div></div>
        </div>
      </div>
      ${buildCommonSections(key, meta)}
    </div>
  `;
}


/* ---------------------------------------------------------------
   4. GENERIC BOX-LIST ENGINE (Array, Stack, Queue, Circular Queue,
      Deque, Priority Queue all reuse this)
   --------------------------------------------------------------- */
class BoxList {
  constructor(canvasEl, opts = {}) {
    this.canvas = canvasEl;
    this.vertical = !!opts.vertical;   // stack renders bottom-up
    this.showIndex = !!opts.showIndex;
    this.showPriority = !!opts.showPriority;
    this.items = []; // {key, val, pri}
  }
  render(highlightKeys = [], foundKeys = []) {
    const wrapClass = this.vertical ? 'stack-col' : 'arr-row';
    const html = `<div class="${wrapClass}">` + this.items.map((it, i) => {
      const cls = ['arr-box'];
      if (highlightKeys.includes(it.key)) cls.push('highlight');
      if (foundKeys.includes(it.key)) cls.push('found');
      const label = this.showPriority ? `${it.val}<span class="idx" style="bottom:-20px">p:${it.pri}</span>` : it.val;
      return `<div class="${cls.join(' ')}" data-key="${it.key}">${label}${this.showIndex ? `<span class="idx">${i}</span>` : ''}</div>`;
    }).join('') + '</div>';
    flipRender(this.canvas, html);
  }
  values() { return this.items.map(i => i.val); }
}

function randVal() { return Math.floor(Math.random() * 90) + 10; }

/* ---- factory: builds the full controller for a box-based DS page ---- */
function initBoxListPage(key, config) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  const list = new BoxList(canvas, config.boxOpts);
  const capacity = config.capacity || null;
  const history = new HistoryManager();

  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });

  function setComplexity(op) {
    const row = DS_META[key].complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META[key].complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function updateSize() {
    if (!capacity) { sizeEl.style.display = 'none'; return; }
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Size: ${list.items.length}/${capacity}`;
    sizeEl.classList.toggle('badge-full', list.items.length >= capacity);
  }
  function renderAll(hl, found) { list.render(hl, found); updateSize(); }

  function seedRandom() {
    const n = capacity ? Math.min(4, capacity) : 5;
    list.items = Array.from({length: n}, () => ({ key: nextKey(), val: randVal(), pri: Math.floor(Math.random()*9)+1 }));
    if (config.autoSortByPriority) list.items.sort((a,b)=>b.pri-a.pri);
    renderAll();
    showInfo(logEl, 'Random data generated.');
  }
  function snapshot() { return { items: list.items }; }
  function restore(state) { list.items = state.items; renderAll(); }

  seedRandom();
  bumpProgress(key, 'view');
  history.push(snapshot());

  const getVal = () => (config.valueValidator || requireValue)(document.getElementById(`${key}-val`).value, 'Value');
  const clearValInput = () => { document.getElementById(`${key}-val`).value = ''; };
  const getIdxField = () => {
    const raw = document.getElementById(`${key}-idx`).value;
    document.getElementById(`${key}-idx`).value = '';
    return raw;
  };
  const getIdxOptional = (label = 'Index') => {
    const raw = getIdxField();
    if (raw === '') return null;
    return requireIndex(raw, label);
  };
  const getIdxRequired = (label = 'Index') => requireIndex(getIdxField(), label);
  const getPri = () => {
    const e = document.getElementById(`${key}-pri`);
    const raw = e.value; e.value = '';
    return requireNumber(raw, 'Priority');
  };
  // getVal clears the input only on success (called explicitly by ops after validation passes)
  const ctx = { list, getVal, clearValInput, getIdxOptional, getIdxRequired, getPri, logEl, setComplexity, seedRandom, capacity, renderAll };

  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, config.ops, ctx, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);

  document.getElementById(`${key}-pause`).addEventListener('click', (e) => {
    PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause';
  });
}

let PAUSED = false;
async function pausable() { while (PAUSED) await sleep(120); }

/* ---- Array ops ---- */
const ARRAY_CAP = 10;
const arrayOps = {
  async insert({list, getVal, clearValInput, getIdxOptional, logEl, setComplexity, renderAll}) {
    if (list.items.length >= ARRAY_CAP) throw new OpError(`Array is full (max ${ARRAY_CAP} for this demo) — delete an element first.`);
    const val = getVal();
    let idx = getIdxOptional('Index');
    if (idx === null) idx = list.items.length; // no index given -> insert at end
    requireInBounds(idx, list.items.length + 1, 'Index'); // 0..length inclusive
    clearValInput();
    list.items.splice(idx, 0, { key: nextKey(), val });
    renderAll([list.items[idx].key]);
    setComplexity(idx === list.items.length - 1 ? 'insert at end' : 'insert at beginning/middle');
    showSuccess(logEl, `Inserted <b>${val}</b> at index ${idx}. Elements after it shifted right.`);
    await sleep(500);
  },
  async delete({list, getIdxOptional, logEl, setComplexity, renderAll}) {
    if (!list.items.length) throw new OpError('Array is empty — nothing to delete.');
    let idx = getIdxOptional('Index');
    if (idx === null) idx = list.items.length - 1; // no index given -> delete last
    requireInBounds(idx, list.items.length, 'Index');
    const key = list.items[idx].key;
    const node = list.canvas.querySelector(`[data-key="${key}"]`);
    if (node) node.classList.add('removing');
    setComplexity('delete');
    showInfo(logEl, `Deleting index ${idx}. Elements after it will shift left.`);
    await sleep(350);
    list.items.splice(idx, 1);
    renderAll();
    showSuccess(logEl, `Element deleted successfully from index ${idx}.`);
  },
  async update({list, getVal, clearValInput, getIdxRequired, logEl, setComplexity, renderAll}) {
    if (!list.items.length) throw new OpError('Array is empty — nothing to update.');
    const idx = getIdxRequired('Index');
    requireInBounds(idx, list.items.length, 'Index');
    const val = getVal();
    clearValInput();
    list.items[idx].val = val;
    renderAll([list.items[idx].key]);
    setComplexity('access');
    showSuccess(logEl, `Updated index ${idx} to <b>${val}</b> — direct O(1) write, no shifting needed.`);
    await sleep(400);
  },
  async search({list, getVal, clearValInput, logEl, setComplexity, renderAll}) {
    if (!list.items.length) throw new OpError('Array is empty — nothing to search.');
    const val = getVal(); clearValInput();
    setComplexity('search');
    for (let i = 0; i < list.items.length; i++) {
      renderAll([list.items[i].key]);
      showInfo(logEl, `Checking index ${i}: is it <b>${val}</b>?`);
      await sleep(280); await pausable();
      if (String(list.items[i].val) === String(val)) {
        renderAll([], [list.items[i].key]);
        showSuccess(logEl, `Found <b>${val}</b> at index ${i}.`);
        return;
      }
    }
    showError(logEl, `Element not found: <b>${val}</b> is not in the array.`);
  },
  async reverse({list, logEl, setComplexity, renderAll}) {
    if (list.items.length < 2) throw new OpError('Need at least 2 elements to reverse.');
    list.items.reverse();
    renderAll();
    setComplexity('access');
    showSuccess(logEl, 'Array reversed using a two-pointer swap from both ends.');
    await sleep(400);
  },
  async sort({list, logEl, setComplexity, renderAll}) {
    if (list.items.length < 2) throw new OpError('Need at least 2 elements to sort.');
    setComplexity('access');
    const arr = list.items;
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        renderAll([arr[j].key, arr[j+1].key]);
        await sleep(160); await pausable();
        if (Number(arr[j].val) > Number(arr[j+1].val)) {
          [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
          renderAll([arr[j].key, arr[j+1].key]);
          await sleep(160);
        }
      }
    }
    showSuccess(logEl, 'Sorted using bubble sort (for clarity of animation) — O(n²).');
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};

/* NOTE: Stack no longer uses the generic BoxList engine — see initStackPage()
   below, which gates all operations behind an explicit "set stack size" step,
   and adds live stats, push/pop counters, and a real operation history panel. */

/* NOTE: Queue no longer uses the generic BoxList engine — see initQueuePage()
   below, which models real Front/Rear array indices (including the classic
   "wasted space" limitation that motivates Circular Queue). */

/* ---- Deque ops — double-ended, capacity-bound, full edge-case handling ---- */
const DEQUE_CAP = 8;
const dequeOps = {
  async pushFront({list, getVal, clearValInput, logEl, setComplexity, capacity, renderAll}) {
    if (capacity && list.items.length >= capacity) throw new OpError(`Deque Overflow — capacity is ${capacity}. Remove an element before inserting another.`);
    const val = getVal();
    clearValInput();
    list.items.unshift({ key: nextKey(), val });
    renderAll([list.items[0].key]);
    setComplexity('insert front');
    showSuccess(logEl, `Inserted <b>${val}</b> at the front.`);
    await sleep(400);
  },
  async pushBack({list, getVal, clearValInput, logEl, setComplexity, capacity, renderAll}) {
    if (capacity && list.items.length >= capacity) throw new OpError(`Deque Overflow — capacity is ${capacity}. Remove an element before inserting another.`);
    const val = getVal();
    clearValInput();
    list.items.push({ key: nextKey(), val });
    renderAll([list.items.at(-1).key]);
    setComplexity('insert front');
    showSuccess(logEl, `Inserted <b>${val}</b> at the rear.`);
    await sleep(400);
  },
  async popFront({list, logEl, setComplexity, renderAll}) {
    if (!list.items.length) throw new OpError('Deque Underflow — the deque is empty, there is nothing to remove from the front.');
    const f = list.items[0];
    const node = list.canvas.querySelector(`[data-key="${f.key}"]`); if (node) node.classList.add('removing');
    setComplexity('delete front');
    showInfo(logEl, `Removing <b>${f.val}</b> from the front.`);
    await sleep(350); list.items.shift(); renderAll();
    showSuccess(logEl, `Element removed successfully: <b>${f.val}</b>.`);
  },
  async popBack({list, logEl, setComplexity, renderAll}) {
    if (!list.items.length) throw new OpError('Deque Underflow — the deque is empty, there is nothing to remove from the rear.');
    const l = list.items.at(-1);
    const node = list.canvas.querySelector(`[data-key="${l.key}"]`); if (node) node.classList.add('removing');
    setComplexity('delete front');
    showInfo(logEl, `Removing <b>${l.val}</b> from the rear.`);
    await sleep(350); list.items.pop(); renderAll();
    showSuccess(logEl, `Element removed successfully: <b>${l.val}</b>.`);
  },
  async isEmpty({list, logEl, setComplexity}) {
    setComplexity('peek front');
    showInfo(logEl, list.items.length === 0 ? 'isEmpty() → true — Deque is Empty.' : `isEmpty() → false — deque has ${list.items.length} element(s).`);
  },
  async clear({list, logEl, renderAll, setComplexity}) {
    if (!list.items.length) throw new OpError('Deque is already empty.');
    setComplexity('delete front');
    list.items = [];
    renderAll();
    showSuccess(logEl, 'Deque cleared.');
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};

/* ---- Priority Queue ops — always kept ordered by priority (highest first) ---- */
const pqOps = {
  async insert({list, getVal, clearValInput, getPri, logEl, setComplexity, renderAll}) {
    const val = getVal();
    const pri = getPri();
    clearValInput();
    const item = { key: nextKey(), val, pri };
    let idx = list.items.findIndex(i => i.pri < pri);
    if (idx === -1) idx = list.items.length;
    list.items.splice(idx, 0, item);
    renderAll([item.key]);
    setComplexity('insert');
    showSuccess(logEl, `Inserted <b>${val}</b> (priority ${pri}) — kept ordered by priority, highest first.`);
    await sleep(450);
  },
  async extract({list, logEl, setComplexity, renderAll}) {
    if (!list.items.length) throw new OpError('Priority Queue is Empty — nothing to extract.');
    const top = list.items[0];
    const node = list.canvas.querySelector(`[data-key="${top.key}"]`); if (node) node.classList.add('removing');
    setComplexity('extract highest priority');
    showInfo(logEl, `Extracting <b>${top.val}</b> — highest priority (${top.pri}) in the queue.`);
    await sleep(350); list.items.shift(); renderAll();
    showSuccess(logEl, `Element extracted successfully: <b>${top.val}</b> (priority ${top.pri}).`);
  },
  async isEmpty({list, logEl, setComplexity}) {
    setComplexity('peek highest priority');
    showInfo(logEl, list.items.length === 0 ? 'isEmpty() → true — Priority Queue is Empty.' : `isEmpty() → false — ${list.items.length} element(s) waiting.`);
  },
  async clear({list, logEl, renderAll, setComplexity}) {
    if (!list.items.length) throw new OpError('Priority queue is already empty.');
    setComplexity('extract highest priority');
    list.items = [];
    renderAll();
    showSuccess(logEl, 'Priority queue cleared.');
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};


/* ---------------------------------------------------------------
   4a. STACK ENGINE — gated behind an explicit "set stack size"
   step (no operation is possible before a capacity is chosen),
   strict LIFO, Stack Overflow/Underflow, live stats, push/pop
   counters — matches the classroom-textbook stack ADT exactly.
   --------------------------------------------------------------- */
function initStackPage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const statsEl = document.getElementById(`${key}-stats`);
  const speedEl = document.getElementById(`${key}-speed`);
  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });

  let capacity = null;
  let items = []; // {key, val}
  let pushCount = 0, popCount = 0;
  const history = new HistoryManager();

  function setComplexity(op) {
    const row = DS_META.stack.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.stack.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function setToolbarEnabled(enabled) {
    toolbar.querySelectorAll('[data-op]').forEach(b => { if (b.dataset.op !== 'setSize') b.disabled = !enabled; });
  }
  function statusLabel() {
    if (!capacity) return { text: '—', cls: '' };
    if (items.length === 0) return { text: 'Empty', cls: 'status-empty' };
    if (items.length >= capacity) return { text: 'Full', cls: 'status-full' };
    return { text: 'Partial', cls: 'status-partial' };
  }
  function updateStats() {
    if (!capacity) { statsEl.innerHTML = ''; sizeEl.style.display = 'none'; return; }
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Size: ${items.length}/${capacity}`;
    sizeEl.classList.toggle('badge-full', items.length >= capacity);
    const st = statusLabel();
    const topVal = items.length ? items.at(-1).val : '—';
    statsEl.innerHTML = `
      <div class="stat-box"><div class="stat-label">Current Size</div><div class="stat-value">${items.length}</div></div>
      <div class="stat-box"><div class="stat-label">Maximum Size</div><div class="stat-value">${capacity}</div></div>
      <div class="stat-box"><div class="stat-label">Remaining Capacity</div><div class="stat-value">${capacity - items.length}</div></div>
      <div class="stat-box"><div class="stat-label">Empty Slots</div><div class="stat-value">${capacity - items.length}</div></div>
      <div class="stat-box"><div class="stat-label">Top Index</div><div class="stat-value">${items.length ? items.length - 1 : '−1'}</div></div>
      <div class="stat-box"><div class="stat-label">Top Value</div><div class="stat-value">${topVal}</div></div>
      <div class="stat-box stat-status"><div class="stat-label">Live Status</div><div class="stat-value ${st.cls}">${st.text}</div></div>
      <div class="stat-box"><div class="stat-label">Operations</div><div class="stat-value">${pushCount + popCount}</div></div>
      <div class="stat-box"><div class="stat-label">Push Count</div><div class="stat-value">${pushCount}</div></div>
      <div class="stat-box"><div class="stat-label">Pop Count</div><div class="stat-value">${popCount}</div></div>`;
  }
  const list = new BoxList(canvas, { vertical: true });
  function renderAll(hl, found) { list.items = items; list.render(hl, found); updateStats(); }
  function snapshot() { return { items, capacity, pushCount, popCount }; }
  function restore(state) { items = state.items; capacity = state.capacity; pushCount = state.pushCount; popCount = state.popCount; renderAll(); setToolbarEnabled(true); }

  async function showGate() {
    setToolbarEnabled(false);
    canvas.innerHTML = `<p class="capacity-placeholder">📏 Waiting for stack capacity…</p>`;
    const n = await openCapacityModal({
      title: 'Set Stack Capacity',
      subtitle: 'A real stack has a fixed capacity. Choose how many elements this stack can hold before you Push, Pop, or Peek.',
      defaultValue: 5,
      max: 100,
      icon: '📚',
    });
    capacity = n; items = []; pushCount = 0; popCount = 0;
    setToolbarEnabled(true);
    renderAll();
    showSuccess(logEl, `Stack Capacity = ${n}. You can now Push, Pop, and Peek.`);
    document.dispatchEvent(new CustomEvent('ai:structureReady', { detail: { label: 'Stack', hint: 'Try Push and Pop above!' } }));
    history.push(snapshot());
  }

  showGate();
  bumpProgress(key, 'view');

  const getVal = () => requireValue(document.getElementById(`${key}-val`).value, 'Value');
  const clearValInput = () => { document.getElementById(`${key}-val`).value = ''; };

  const ops = {
    async push() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      if (items.length >= capacity) {
        showError(logEl, `Stack Overflow — the stack is already full. No more elements can be inserted. (Current Size = ${items.length}/${capacity}, Remaining Space = 0)`);
        const wrap = canvas.closest('.viz-card'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
        throw new OpError('');
      }
      const val = getVal(); clearValInput();
      items.push({ key: nextKey(), val });
      pushCount++;
      renderAll([items.at(-1).key]);
      setComplexity('push');
      showSuccess(logEl, `Push(${val}) — element ${val} is inserted at the top of the stack. Stack Size: Current = ${items.length}/${capacity}, Top = ${val}.`);
      await sleep(400);
    },
    async pop() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      if (!items.length) {
        showError(logEl, 'Stack Underflow — the stack is empty. Nothing can be removed.');
        const wrap = canvas.closest('.viz-card'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
        throw new OpError('');
      }
      const top = items.at(-1);
      const node = canvas.querySelector(`[data-key="${top.key}"]`);
      if (node) node.classList.add('removing');
      setComplexity('pop');
      showInfo(logEl, `Popping <b>${top.val}</b> from the top…`);
      await sleep(350);
      items.pop(); popCount++;
      renderAll();
      showSuccess(logEl, `Pop() — removed value ${top.val} from the top. Stack Size: Current = ${items.length}/${capacity}.`);
    },
    async peek() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      if (!items.length) throw new OpError('Stack is Empty — nothing to peek at.');
      const top = items.at(-1);
      renderAll([], [top.key]);
      setComplexity('peek');
      showSuccess(logEl, `Peek() → ${top.val} is the current top element (not removed).`);
      await sleep(500);
    },
    async isEmpty() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      setComplexity('peek');
      showSuccess(logEl, items.length === 0 ? 'isEmpty() → true — Stack is Empty.' : `isEmpty() → false — stack has ${items.length} element(s).`);
    },
    async isFull() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      setComplexity('peek');
      showSuccess(logEl, items.length >= capacity ? 'isFull() → true — Stack is Full.' : `isFull() → false — ${capacity - items.length} slot(s) free.`);
    },
    async size() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      setComplexity('peek');
      showSuccess(logEl, `size() → ${items.length} element(s) currently on the stack.`);
    },
    async clear() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      if (!items.length) throw new OpError('Stack is already empty.');
      setComplexity('pop');
      items = []; renderAll();
      showSuccess(logEl, 'Stack cleared. Size reset to 0.');
    },
    async random() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      items = []; pushCount = 0; popCount = 0;
      const n = Math.min(3, capacity);
      for (let i = 0; i < n; i++) { items.push({ key: nextKey(), val: randVal() }); pushCount++; }
      renderAll();
      showSuccess(logEl, 'Random stack generated.');
    },
    async reset() {
      if (!capacity) throw new OpError('Set the stack capacity first.');
      items = []; pushCount = 0; popCount = 0;
      renderAll();
      showSuccess(logEl, 'Stack reset — emptied and counters cleared, capacity unchanged.');
    },
    async changeCapacity() {
      if (items.length && !confirm(`Changing the stack's capacity will clear its current ${items.length} element(s). Continue?`)) {
        showInfo(logEl, 'Change Capacity cancelled — current stack left untouched.');
        return;
      }
      const n = await openCapacityModal({
        title: 'Change Stack Capacity',
        subtitle: 'Pick a new capacity. The current stack will be cleared to start fresh at the new size.',
        defaultValue: capacity || 5,
        max: 100,
        icon: '⚙',
      });
      capacity = n; items = []; pushCount = 0; popCount = 0;
      renderAll();
      showSuccess(logEl, `Stack Capacity changed to ${n}. Stack cleared to start fresh.`);
    },
  };
  wireOpButtons(toolbar, ops, {}, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}


/* ---------------------------------------------------------------
   4b. QUEUE ENGINE — real array-based queue with explicit
   Front and Rear indices. Deliberately does NOT wrap around, so it
   faithfully reproduces the classic textbook limitation: once REAR
   reaches the last slot, no more enqueues are possible even if
   slots before FRONT are free. That limitation is exactly what
   Circular Queue (next engine) fixes with modulo arithmetic.
   --------------------------------------------------------------- */
function initQueuePage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const statsEl = document.getElementById(`${key}-stats`);
  const speedEl = document.getElementById(`${key}-speed`);
  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  const history = new HistoryManager();

  let capacity = null;
  let slots = [];
  let front = 0, rearNext = 0, size = 0;
  let enqueueCount = 0, dequeueCount = 0;

  function rearIdx() { return rearNext - 1; }
  function setComplexity(op) {
    const row = DS_META.queue.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.queue.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function setToolbarEnabled(enabled) { toolbar.querySelectorAll('[data-op]').forEach(b => b.disabled = !enabled); }
  function updateStats() {
    if (!capacity) { statsEl.innerHTML = ''; sizeEl.style.display = 'none'; return; }
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Size: ${size}/${capacity}`;
    sizeEl.classList.toggle('badge-full', rearNext >= capacity);
    const status = size === 0 ? { t: 'Empty', c: 'status-empty' } : (size >= capacity ? { t: 'Full', c: 'status-full' } : { t: 'Partial', c: 'status-partial' });
    statsEl.innerHTML = `
      <div class="stat-box"><div class="stat-label">Front Pointer</div><div class="stat-value">${size ? front : '−1'}</div></div>
      <div class="stat-box"><div class="stat-label">Rear Pointer</div><div class="stat-value">${size ? rearIdx() : '−1'}</div></div>
      <div class="stat-box"><div class="stat-label">Current Size</div><div class="stat-value">${size}</div></div>
      <div class="stat-box"><div class="stat-label">Remaining Capacity</div><div class="stat-value">${capacity - size}</div></div>
      <div class="stat-box"><div class="stat-label">Maximum Capacity</div><div class="stat-value">${capacity}</div></div>
      <div class="stat-box stat-status"><div class="stat-label">Live Status</div><div class="stat-value ${status.c}">${status.t}</div></div>
      <div class="stat-box"><div class="stat-label">Operations</div><div class="stat-value">${enqueueCount + dequeueCount}</div></div>
      <div class="stat-box"><div class="stat-label">Enqueue Count</div><div class="stat-value">${enqueueCount}</div></div>
      <div class="stat-box"><div class="stat-label">Dequeue Count</div><div class="stat-value">${dequeueCount}</div></div>`;
  }
  function render(highlightIdx = null) {
    if (!capacity) return;
    const boxes = slots.map((s, i) => {
      const isFront = size > 0 && i === front;
      const isRear = size > 0 && i === rearIdx();
      const cls = ['arr-box'];
      if (!s) cls.push('empty-slot');
      if (highlightIdx === i) cls.push('highlight');
      let tag = '';
      if (isFront && isRear) tag = `<span class="ptr-tag" style="color:var(--accent)">FRONT/REAR</span>`;
      else if (isFront) tag = `<span class="ptr-tag" style="color:var(--accent)">FRONT</span>`;
      else if (isRear) tag = `<span class="ptr-tag" style="color:var(--accent-2)">REAR</span>`;
      return `<div class="${cls.join(' ')}">${tag}${s ? s.val : ''}<span class="idx">${i}</span></div>`;
    }).join('');
    canvas.innerHTML = `<div class="arr-row">${boxes}</div>`;
    updateStats();
  }
  function snapshot() { return { slots, front, rearNext, size, capacity, enqueueCount, dequeueCount }; }
  function restore(state) { slots = state.slots; front = state.front; rearNext = state.rearNext; size = state.size; capacity = state.capacity; enqueueCount = state.enqueueCount; dequeueCount = state.dequeueCount; render(); setToolbarEnabled(true); }

  async function showGate() {
    setToolbarEnabled(false);
    canvas.innerHTML = `<p class="capacity-placeholder">📏 Waiting for queue capacity…</p>`;
    const n = await openCapacityModal({
      title: 'Set Queue Capacity',
      subtitle: 'A real queue has a fixed capacity. Choose how many elements this queue can hold before you Enqueue or Dequeue.',
      defaultValue: 6,
      max: 100,
      icon: '📥',
    });
    capacity = n; slots = new Array(n).fill(null); front = 0; rearNext = 0; size = 0; enqueueCount = 0; dequeueCount = 0;
    setToolbarEnabled(true);
    render();
    showSuccess(logEl, `Queue Capacity = ${n}. You can now Enqueue and Dequeue.`);
    document.dispatchEvent(new CustomEvent('ai:structureReady', { detail: { label: 'Queue', hint: 'Try Enqueue and Dequeue above!' } }));
    history.push(snapshot());
  }

  showGate();
  bumpProgress(key, 'view');

  const ops = {
    async enqueue({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      if (rearNext >= capacity) {
        showError(logEl, `Queue Overflow — the queue is already full. ${front > 0 ? `Note: indices 0–${front - 1} are actually free, but a plain array queue's REAR pointer only ever moves forward and can't reuse them — that's exactly what Circular Queue fixes.` : ''}`);
        const wrap = canvas.closest('.viz-card'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
        throw new OpError('');
      }
      const val = requireValue(document.getElementById(`${key}-val`).value, 'Value');
      document.getElementById(`${key}-val`).value = '';
      slots[rearNext] = { key: nextKey(), val };
      rearNext++; size++; enqueueCount++;
      render(rearIdx());
      setComplexity('enqueue');
      showSuccess(logEl, `Enqueue(${val}) — inserted from the rear at index ${rearIdx()}. Queue Size: Current = ${size}/${capacity}.`);
      await sleep(400);
    },
    async dequeue({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      if (size === 0) {
        showError(logEl, 'Queue Underflow — the queue is empty. Nothing can be removed.');
        const wrap = canvas.closest('.viz-card'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
        throw new OpError('');
      }
      const removed = slots[front];
      const node = canvas.querySelector(`[data-key="${removed.key}"]`);
      if (node) node.classList.add('removing');
      setComplexity('dequeue');
      showInfo(logEl, `Dequeuing <b>${removed.val}</b> from the front (index ${front})…`);
      await sleep(350);
      slots[front] = null;
      front++; size--; dequeueCount++;
      render();
      showSuccess(logEl, `Dequeue() — removed ${removed.val} from the front. Queue Size: Current = ${size}/${capacity}.`);
    },
    async front({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      if (size === 0) throw new OpError('Queue is Empty — there is no front element.');
      render(front);
      setComplexity('front / rear peek');
      showSuccess(logEl, `Front → ${slots[front].val} (index ${front}).`);
      await sleep(500);
    },
    async rear({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      if (size === 0) throw new OpError('Queue is Empty — there is no rear element.');
      render(rearIdx());
      setComplexity('front / rear peek');
      showSuccess(logEl, `Rear → ${slots[rearIdx()].val} (index ${rearIdx()}).`);
      await sleep(500);
    },
    async isEmpty({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      setComplexity('front / rear peek');
      showSuccess(logEl, size === 0 ? 'isEmpty() → true — Queue is Empty.' : `isEmpty() → false — queue has ${size} element(s).`);
    },
    async isFull({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      setComplexity('front / rear peek');
      showSuccess(logEl, rearNext >= capacity
        ? `isFull() → true — REAR is at the last index; no more enqueues possible without wraparound.`
        : `isFull() → false — REAR can still advance (${capacity - rearNext} slot(s) ahead of it).`);
    },
    async size({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      setComplexity('front / rear peek');
      showSuccess(logEl, `size() → ${size} element(s) currently in the queue.`);
    },
    async clear({logEl, setComplexity}) {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      if (size === 0) throw new OpError('Queue is already empty.');
      setComplexity('dequeue');
      slots = new Array(capacity).fill(null); front = 0; rearNext = 0; size = 0;
      render();
      showSuccess(logEl, 'Queue cleared. FRONT and REAR reset to 0.');
    },
    async random() {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      slots = new Array(capacity).fill(null); front = 0; rearNext = 0; size = 0; enqueueCount = 0; dequeueCount = 0;
      const n = Math.min(3, capacity);
      for (let i = 0; i < n; i++) { slots[rearNext] = { key: nextKey(), val: randVal() }; rearNext++; size++; enqueueCount++; }
      render();
      showSuccess(logEl, 'Random queue generated (front = 0).');
    },
    async reset() {
      if (!capacity) throw new OpError('Set the queue capacity first.');
      slots = new Array(capacity).fill(null); front = 0; rearNext = 0; size = 0; enqueueCount = 0; dequeueCount = 0;
      render();
      showSuccess(logEl, 'Queue reset — emptied and counters cleared, capacity unchanged.');
    },
    async changeCapacity() {
      if (size && !confirm(`Changing the queue's capacity will clear its current ${size} element(s). Continue?`)) {
        showInfo(logEl, 'Change Capacity cancelled — current queue left untouched.');
        return;
      }
      const n = await openCapacityModal({
        title: 'Change Queue Capacity',
        subtitle: 'Pick a new capacity. The current queue will be cleared to start fresh at the new size.',
        defaultValue: capacity || 6,
        max: 100,
        icon: '⚙',
      });
      capacity = n; slots = new Array(n).fill(null); front = 0; rearNext = 0; size = 0; enqueueCount = 0; dequeueCount = 0;
      render();
      showSuccess(logEl, `Queue Capacity changed to ${n}. Queue cleared to start fresh.`);
    },
  };

  wireOpButtons(toolbar, ops, { logEl, setComplexity }, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => {
    PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause';
  });
}

/* ---------------------------------------------------------------
   4c. CIRCULAR QUEUE ENGINE — true circular buffer using modulo
   arithmetic for both FRONT and REAR, arranged in a ring so
   wraparound is visually obvious. Correctly distinguishes "full"
   from "empty" using an explicit size counter (front === rear is
   ambiguous otherwise — a classic circular-queue gotcha).
   --------------------------------------------------------------- */
const CIRCULAR_CAP = 6;
function initCircularQueuePage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  const capacity = CIRCULAR_CAP;
  const history = new HistoryManager();

  let slots = new Array(capacity).fill(null);
  let front = 0;
  let size = 0;
  const rearOf = () => (front + size - 1 + capacity) % capacity;
  const nextInsertIdx = () => (front + size) % capacity;

  function setComplexity(op) {
    const row = DS_META.circularqueue.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.circularqueue.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function updateSize() {
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Size: ${size}/${capacity}`;
    sizeEl.classList.toggle('badge-full', size >= capacity);
  }
  function render(highlightIdx = null) {
    const cx = 150, cy = 150, r = 105;
    const html = slots.map((s, i) => {
      const angle = -Math.PI / 2 + i * (2 * Math.PI / capacity);
      const x = cx + r * Math.cos(angle) - 28;
      const y = cy + r * Math.sin(angle) - 28;
      const isFront = size > 0 && i === front;
      const isRear = size > 0 && i === rearOf();
      const cls = ['arr-box'];
      if (!s) cls.push('empty-slot');
      if (highlightIdx === i) cls.push('highlight');
      let tag = '';
      if (isFront && isRear) tag = `<span class="ptr-tag" style="color:var(--accent)">F/R</span>`;
      else if (isFront) tag = `<span class="ptr-tag" style="color:var(--accent)">FRONT</span>`;
      else if (isRear) tag = `<span class="ptr-tag" style="color:var(--accent-2)">REAR</span>`;
      return `<div class="${cls.join(' ')}" style="position:absolute; left:${x}px; top:${y}px;">${tag}${s ? s.val : ''}<span class="idx">${i}</span></div>`;
    }).join('');
    canvas.innerHTML = `<div style="position:relative; width:300px; height:300px; margin:0 auto;">
      <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); font-family:var(--font-mono); font-size:11px; color:var(--muted-2); text-align:center;">circular<br>buffer</div>
      ${html}
    </div>`;
    updateSize();
  }
  function snapshot() { return { slots, front, size }; }
  function restore(state) { slots = state.slots; front = state.front; size = state.size; render(); }

  function seedRandom() {
    slots = new Array(capacity).fill(null); front = 0; size = 0;
    const n = 3;
    for (let i = 0; i < n; i++) { slots[nextInsertIdx()] = { key: nextKey(), val: randVal() }; size++; }
    render();
    showInfo(logEl, 'Random circular queue generated.');
  }
  seedRandom();
  bumpProgress(key, 'view');
  history.push(snapshot());

  const ops = {
    async enqueue({logEl, setComplexity}) {
      if (size >= capacity) throw new OpError(`Circular Queue Overflow — all ${capacity} slots are filled. (front === (rear+1) % capacity)`);
      const val = requireValue(document.getElementById(`${key}-val`).value, 'Value');
      document.getElementById(`${key}-val`).value = '';
      const idx = nextInsertIdx();
      slots[idx] = { key: nextKey(), val };
      size++;
      render(idx);
      setComplexity('enqueue');
      showSuccess(logEl, `Enqueued <b>${val}</b> at index ${idx} — computed as (front + size) % capacity = (${front} + ${size - 1}) % ${capacity} = ${idx}.`);
      await sleep(450);
    },
    async dequeue({logEl, setComplexity}) {
      if (size === 0) throw new OpError('Circular Queue Underflow — the queue is empty, there is nothing to dequeue.');
      const removed = slots[front];
      const oldFront = front;
      const node = canvas.querySelector(`[data-key="${removed.key}"]`);
      if (node) node.classList.add('removing');
      setComplexity('dequeue');
      showInfo(logEl, `Dequeuing <b>${removed.val}</b> from index ${front}.`);
      await sleep(350);
      slots[oldFront] = null;
      front = (front + 1) % capacity;
      size--;
      render();
      showSuccess(logEl, `Element dequeued successfully: <b>${removed.val}</b>. FRONT wraps to (${oldFront} + 1) % ${capacity} = ${front}.`);
    },
    async front({logEl, setComplexity}) {
      if (size === 0) throw new OpError('Circular Queue is Empty — there is no front element.');
      render(front);
      setComplexity('front / rear peek');
      showInfo(logEl, `Front of circular queue is <b>${slots[front].val}</b> (index ${front}).`);
      await sleep(500);
    },
    async rear({logEl, setComplexity}) {
      if (size === 0) throw new OpError('Circular Queue is Empty — there is no rear element.');
      render(rearOf());
      setComplexity('front / rear peek');
      showInfo(logEl, `Rear of circular queue is <b>${slots[rearOf()].val}</b> (index ${rearOf()}).`);
      await sleep(500);
    },
    async isEmpty({logEl, setComplexity}) {
      setComplexity('isFull / isEmpty check');
      showInfo(logEl, size === 0 ? 'isEmpty() → true — Circular Queue is Empty.' : `isEmpty() → false — queue has ${size} element(s).`);
    },
    async isFull({logEl, setComplexity}) {
      setComplexity('isFull / isEmpty check');
      showInfo(logEl, size >= capacity ? 'isFull() → true — Circular Queue is Full.' : `isFull() → false — ${capacity - size} slot(s) free.`);
    },
    async size({logEl, setComplexity}) { setComplexity('isFull / isEmpty check'); showInfo(logEl, `size() → ${size} element(s) currently in the circular queue.`); },
    async clear({logEl, setComplexity}) {
      if (size === 0) throw new OpError('Circular queue is already empty.');
      setComplexity('dequeue');
      slots = new Array(capacity).fill(null); front = 0; size = 0;
      render();
      showSuccess(logEl, 'Circular queue cleared. FRONT reset to 0.');
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };

  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, ops, { logEl, setComplexity }, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => {
    PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause';
  });
}


/* ---------------------------------------------------------------
   5. LINKED LIST ENGINE
   --------------------------------------------------------------- */
function initLinkedListPage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  const LL_CAP = 10;
  let nodes = []; // {key, val} — order in this array IS the pointer chain (head..tail)
  const history = new HistoryManager();

  function setComplexity(op) {
    const row = DS_META.linkedlist.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.linkedlist.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function updateSize() {
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Length: ${nodes.length}/${LL_CAP}`;
    sizeEl.classList.toggle('badge-full', nodes.length >= LL_CAP);
  }
  function render(highlightKeys = []) {
    const html = '<div class="ll-row">' + nodes.map((n) => `
      <div class="ll-node${highlightKeys.includes(n.key)?' highlight':''}" data-key="${n.key}">
        <div class="val">${n.val}</div><div class="ptr">→</div>
      </div>
    `).join('<span class="ll-arrow">⟶</span>') + `</div><span class="ll-null">NULL</span>`;
    flipRender(canvas, html);
    updateSize();
  }
  function snapshot() { return { nodes }; }
  function restore(state) { nodes = state.nodes; render(); }

  function seedRandom() {
    nodes = Array.from({length:4}, () => ({ key: nextKey(), val: randVal() }));
    render();
    showInfo(logEl, 'Random list generated. HEAD points to the first node.');
  }
  seedRandom();
  bumpProgress(key, 'view');
  history.push(snapshot());

  const getVal = () => requireValue(document.getElementById(`${key}-val`).value, 'Value');
  const clearValInput = () => { document.getElementById(`${key}-val`).value = ''; };
  const getIdxField = () => {
    const raw = document.getElementById(`${key}-idx`).value;
    document.getElementById(`${key}-idx`).value = '';
    return raw;
  };
  const getIdxOptional = (label = 'Position') => {
    const raw = getIdxField();
    if (raw === '') return null;
    return requireIndex(raw, label);
  };
  const getIdxRequired = (label = 'Position') => requireIndex(getIdxField(), label);

  const ops = {
    async insertBeg() {
      if (nodes.length >= LL_CAP) throw new OpError(`List is full (max ${LL_CAP} for this demo).`);
      const val = getVal(); clearValInput();
      nodes.unshift({key: nextKey(), val});
      render([nodes[0].key]);
      setComplexity('insert at beginning');
      showSuccess(logEl, `Inserted <b>${val}</b> at the head — HEAD now points here, new node points to the old head. O(1).`);
      await sleep(450);
    },
    async insertEnd() {
      if (nodes.length >= LL_CAP) throw new OpError(`List is full (max ${LL_CAP} for this demo).`);
      const val = getVal(); clearValInput();
      nodes.push({key: nextKey(), val});
      render([nodes.at(-1).key]);
      setComplexity('insert at end');
      showSuccess(logEl, `Inserted <b>${val}</b> at the tail — the old last node's pointer now points here, and this node points to NULL. O(n) without a tail pointer.`);
      await sleep(450);
    },
    async insertPos() {
      if (nodes.length >= LL_CAP) throw new OpError(`List is full (max ${LL_CAP} for this demo).`);
      const val = getVal();
      let idx = getIdxOptional('Position');
      if (idx === null) idx = nodes.length;
      requireInBounds(idx, nodes.length + 1, 'Position'); // 0..length inclusive
      clearValInput();
      nodes.splice(idx, 0, {key: nextKey(), val});
      render([nodes[idx].key]);
      setComplexity('insert at beginning');
      showSuccess(logEl, `Inserted <b>${val}</b> at position ${idx} by rewiring the neighboring pointers — no other links broken.`);
      await sleep(450);
    },
    async deleteBeg() {
      if (!nodes.length) throw new OpError('List is empty — nothing to delete.');
      const n = nodes[0];
      const dom = canvas.querySelector(`[data-key="${n.key}"]`);
      if (dom) dom.style.opacity = '0.15';
      setComplexity('delete (given node)');
      showInfo(logEl, `Deleting head node <b>${n.val}</b> — HEAD will move to the next node.`);
      await sleep(400);
      nodes.shift();
      render();
      showSuccess(logEl, `Element deleted successfully: <b>${n.val}</b> removed from the beginning.`);
    },
    async deleteEnd() {
      if (!nodes.length) throw new OpError('List is empty — nothing to delete.');
      const n = nodes.at(-1);
      const dom = canvas.querySelector(`[data-key="${n.key}"]`);
      if (dom) dom.style.opacity = '0.15';
      setComplexity('insert at end');
      showInfo(logEl, `Deleting tail node <b>${n.val}</b> — the new last node's pointer becomes NULL.`);
      await sleep(400);
      nodes.pop();
      render();
      showSuccess(logEl, `Element deleted successfully: <b>${n.val}</b> removed from the end.`);
    },
    async deletePos() {
      if (!nodes.length) throw new OpError('List is empty — nothing to delete.');
      const idx = getIdxRequired('Position');
      requireInBounds(idx, nodes.length, 'Position');
      const n = nodes[idx];
      const dom = canvas.querySelector(`[data-key="${n.key}"]`);
      if (dom) dom.style.opacity = '0.15';
      setComplexity('delete (given node)');
      showInfo(logEl, `Deleting node at position ${idx} — the previous node's pointer skips over it directly to the next one.`);
      await sleep(400);
      nodes.splice(idx, 1);
      render();
      showSuccess(logEl, `Element deleted successfully from position ${idx}: <b>${n.val}</b>.`);
    },
    async search() {
      if (!nodes.length) throw new OpError('List is empty — nothing to search.');
      const val = getVal(); clearValInput();
      setComplexity('search');
      for (let i = 0; i < nodes.length; i++) {
        render([nodes[i].key]);
        showInfo(logEl, `Following the chain… node ${i} holds <b>${nodes[i].val}</b>.`);
        await sleep(320); await pausable();
        if (String(nodes[i].val) === String(val)) { showSuccess(logEl, `Found <b>${val}</b> at position ${i}.`); return; }
      }
      showError(logEl, `Element not found: <b>${val}</b> is not in the list (reached NULL).`);
    },
    async reverse() {
      if (nodes.length < 2) throw new OpError('Need at least 2 nodes to reverse.');
      nodes.reverse();
      render();
      setComplexity('insert at beginning');
      showSuccess(logEl, 'Reversed by walking once and flipping each pointer to face backward — O(n), O(1) extra space. HEAD and TAIL swap roles.');
      await sleep(450);
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, ops, {}, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}


/* ---------------------------------------------------------------
   6. BINARY TREE / BST ENGINE (SVG)
   --------------------------------------------------------------- */
function makeTreeNode(val) { return { id: nextKey(), val, left: null, right: null }; }

function bstInsert(root, val) {
  if (!root) return makeTreeNode(val);
  if (Number(val) < Number(root.val)) root.left = bstInsert(root.left, val);
  else root.right = bstInsert(root.right, val);
  return root;
}
function bstFindMin(node) { while (node.left) node = node.left; return node; }
function bstContains(root, val) {
  let node = root;
  while (node) {
    if (String(node.val) === String(val)) return true;
    node = Number(val) < Number(node.val) ? node.left : node.right;
  }
  return false;
}
function bstDelete(root, val) {
  if (!root) return null;
  if (Number(val) < Number(root.val)) { root.left = bstDelete(root.left, val); return root; }
  if (Number(val) > Number(root.val)) { root.right = bstDelete(root.right, val); return root; }
  if (!root.left) return root.right;
  if (!root.right) return root.left;
  const succ = bstFindMin(root.right);
  root.val = succ.val;
  root.right = bstDelete(root.right, succ.val);
  return root;
}
function bstSearchPath(root, val) {
  const path = []; let node = root;
  while (node) { path.push(node.id); if (String(node.val) === String(val)) break; node = Number(val) < Number(node.val) ? node.left : node.right; }
  return path;
}
function traverseOrder(root, mode) {
  const out = [];
  if (mode === 'levelorder') {
    const q = root ? [root] : [];
    while (q.length) { const n = q.shift(); out.push(n.id); if (n.left) q.push(n.left); if (n.right) q.push(n.right); }
    return out;
  }
  function rec(n) {
    if (!n) return;
    if (mode === 'preorder') out.push(n.id);
    rec(n.left);
    if (mode === 'inorder') out.push(n.id);
    rec(n.right);
    if (mode === 'postorder') out.push(n.id);
  }
  rec(root);
  return out;
}
function treeLayout(root) {
  const positions = new Map(); let counter = 0;
  function rec(n, depth) {
    if (!n) return;
    rec(n.left, depth + 1);
    positions.set(n.id, { x: counter * 64 + 40, y: depth * 84 + 40, node: n });
    counter++;
    rec(n.right, depth + 1);
  }
  rec(root, 0);
  return positions;
}
function renderTree(container, root, {current = [], visited = []} = {}) {
  if (!root) { container.innerHTML = `<p style="color:var(--muted); padding:20px; font-family:var(--font-mono); font-size:13px;">Tree is empty — insert a value to begin.</p>`; return; }
  const pos = treeLayout(root);
  let maxX = 0, maxY = 0;
  pos.forEach(p => { maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
  const w = maxX + 40, h = maxY + 60;
  let edges = '';
  pos.forEach(p => {
    if (p.node.left) { const c = pos.get(p.node.left.id); edges += `<line class="tlink${current.includes(p.node.left.id)?' active':''}" x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}"/>`; }
    if (p.node.right) { const c = pos.get(p.node.right.id); edges += `<line class="tlink${current.includes(p.node.right.id)?' active':''}" x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}"/>`; }
  });
  let circles = '';
  pos.forEach(p => {
    const cls = ['tnode-circle'];
    if (visited.includes(p.node.id)) cls.push('visited');
    if (current.includes(p.node.id)) cls.push('current');
    circles += `<circle class="${cls.join(' ')}" cx="${p.x}" cy="${p.y}" r="20"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle">${p.node.val}</text>`;
  });
  container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" style="width:100%; max-width:${Math.max(w,320)}px; height:${h}px; display:block; margin:0 auto;">${edges}${circles}</svg>`;
}

function initTreePage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  const TREE_CAP = 15;
  let root = null;
  let nodeCount = 0;
  const history = new HistoryManager();

  function setComplexity(op) {
    const row = DS_META.tree.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.tree.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function countNodes(n) { return n ? 1 + countNodes(n.left) + countNodes(n.right) : 0; }
  function updateSize() {
    nodeCount = countNodes(root);
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Nodes: ${nodeCount}/${TREE_CAP}`;
    sizeEl.classList.toggle('badge-full', nodeCount >= TREE_CAP);
  }
  function draw(opts) { renderTree(canvas, root, opts); updateSize(); }
  function snapshot() { return { root }; }
  function restore(state) { root = state.root; draw(); }

  function seedRandom() {
    root = null;
    const vals = new Set(); while (vals.size < 7) vals.add(randVal());
    [...vals].forEach(v => root = bstInsert(root, v));
    draw();
    showInfo(logEl, 'Random BST generated (duplicates skipped automatically).');
  }
  seedRandom(); bumpProgress(key, 'view');
  history.push(snapshot());

  const getVal = () => requireNumericValue(document.getElementById(`${key}-val`).value, 'Value');
  const clearValInput = () => { document.getElementById(`${key}-val`).value = ''; };

  const ops = {
    async insert() {
      if (nodeCount >= TREE_CAP) throw new OpError(`Tree is full (max ${TREE_CAP} nodes for this demo).`);
      const val = getVal();
      if (bstContains(root, val)) throw new OpError(`Duplicate Value — ${val} already exists in the tree. A Binary Search Tree does not store duplicate keys.`);
      clearValInput();
      root = bstInsert(root, val);
      draw({ current: bstSearchPath(root, val) });
      setComplexity('insert');
      showSuccess(logEl, `Inserted <b>${val}</b> by walking left/right until an empty spot was found.`);
      await sleep(500);
      draw();
    },
    async delete() {
      if (!root) throw new OpError('Tree is empty — nothing to delete.');
      const val = getVal();
      if (!bstContains(root, val)) throw new OpError(`Element Not Found — ${val} does not exist in the tree.`);
      clearValInput();
      setComplexity('delete');
      draw({ current: bstSearchPath(root, val) });
      showInfo(logEl, `Locating <b>${val}</b> to delete…`);
      await sleep(450);
      root = bstDelete(root, val);
      draw();
      showSuccess(logEl, `Element deleted successfully: <b>${val}</b> (two-child case uses the in-order successor).`);
    },
    async search() {
      if (!root) throw new OpError('Tree is empty — nothing to search.');
      const val = getVal(); clearValInput();
      setComplexity('search');
      const path = bstSearchPath(root, val);
      for (let i = 1; i <= path.length; i++) {
        draw({ current: path.slice(0, i) });
        await sleep(380); await pausable();
      }
      const found = bstContains(root, val);
      if (found) showSuccess(logEl, `Found <b>${val}</b> after ${path.length} comparison(s).`);
      else showError(logEl, `Element not found: <b>${val}</b> is not in the tree.`);
    },
    async traverse() {
      const mode = document.getElementById(`${key}-trav`).value;
      if (!root) throw new OpError('Tree is empty — nothing to traverse.');
      setComplexity('traversal');
      const order = traverseOrder(root, mode);
      const vals = [];
      for (let i = 0; i < order.length; i++) {
        vals.push(findNodeVal(root, order[i]));
        draw({ current: [order[i]], visited: order.slice(0, i) });
        showInfo(logEl, `${mode}: ${vals.join(' → ')}`);
        await sleep(500); await pausable();
      }
      draw({ visited: order });
      showSuccess(logEl, `${mode} traversal complete: ${vals.join(' → ')}.`);
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  function findNodeVal(n, id) { if (!n) return null; if (n.id === id) return n.val; return findNodeVal(n.left, id) ?? findNodeVal(n.right, id); }

  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, ops, {}, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}


/* ---------------------------------------------------------------
   7. HEAP ENGINE (array-based, rendered via tree layout)
   --------------------------------------------------------------- */
function heapArrayToTree(arr, ids) {
  if (!arr.length) return null;
  function build(i) {
    if (i >= arr.length) return null;
    return { id: ids[i], val: arr[i], left: build(2*i+1), right: build(2*i+2) };
  }
  return build(0);
}
function initHeapPage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  const HEAP_CAP = 15;
  let heap = []; let ids = [];
  const history = new HistoryManager();

  function mode() { return document.getElementById(`${key}-mode`).value; }
  function cmp(a, b) { return mode() === 'max' ? Number(a) > Number(b) : Number(a) < Number(b); }
  function setComplexity(op) {
    const row = DS_META.heap.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.heap.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function updateSize() {
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `Nodes: ${heap.length}/${HEAP_CAP}`;
    sizeEl.classList.toggle('badge-full', heap.length >= HEAP_CAP);
  }
  function draw(current = []) { renderTree(canvas, heapArrayToTree(heap, ids), { current }); updateSize(); }
  function snapshot() { return { heap, ids }; }
  function restore(state) { heap = state.heap; ids = state.ids; draw(); }

  function siftDownAt(i) {
    const n = heap.length;
    while (true) {
      let best = i, l = 2*i+1, r = 2*i+2;
      if (l < n && cmp(heap[l], heap[best])) best = l;
      if (r < n && cmp(heap[r], heap[best])) best = r;
      if (best === i) break;
      [heap[i], heap[best]] = [heap[best], heap[i]]; [ids[i], ids[best]] = [ids[best], ids[i]];
      i = best;
    }
  }
  function buildHeapFrom(values, keepIds) {
    heap = values.slice();
    ids = keepIds ? keepIds.slice() : values.map(() => nextKey());
    for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) siftDownAt(i);
  }
  function seedRandom() {
    const vals = Array.from({length: 7}, () => String(randVal()));
    buildHeapFrom(vals);
    draw();
    showInfo(logEl, `Random ${mode() === 'max' ? 'max' : 'min'}-heap generated (built in O(n) via heapify, not one-by-one insertion).`);
  }
  seedRandom(); bumpProgress(key, 'view');
  history.push(snapshot());

  document.getElementById(`${key}-mode`).addEventListener('change', () => {
    buildHeapFrom(heap, ids); // re-heapify the SAME elements under the new comparator — don't discard user data
    draw();
    showSuccess(logEl, `Switched to ${mode() === 'max' ? 'Max' : 'Min'} Heap — existing elements re-heapified in place (O(n)).`);
    history.push(snapshot());
  });

  const getVal = () => requireNumericValue(document.getElementById(`${key}-val`).value, 'Value');
  const clearValInput = () => { document.getElementById(`${key}-val`).value = ''; };

  const ops = {
    async insert() {
      if (heap.length >= HEAP_CAP) throw new OpError(`Heap is full (max ${HEAP_CAP} nodes for this demo).`);
      const val = getVal(); clearValInput();
      setComplexity('insert');
      heap.push(val); ids.push(nextKey());
      let i = heap.length - 1;
      draw([ids[i]]);
      showInfo(logEl, `Added <b>${val}</b> at the end, now bubbling up while it beats its parent…`);
      await sleep(400);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!cmp(heap[i], heap[p])) break;
        [heap[i], heap[p]] = [heap[p], heap[i]]; [ids[i], ids[p]] = [ids[p], ids[i]];
        i = p;
        draw([ids[i]]);
        await sleep(400); await pausable();
      }
      showSuccess(logEl, `Inserted <b>${val}</b> — bubbled up to its correct position. Heap property restored.`);
    },
    async extract() {
      if (!heap.length) throw new OpError(`Heap Underflow — the heap is empty, there is no ${mode() === 'max' ? 'maximum' : 'minimum'} to extract.`);
      setComplexity('delete max/min');
      const root = heap[0];
      draw([ids[0]]);
      showInfo(logEl, `Removing root <b>${root}</b>, moving the last element to the top, then sifting down…`);
      await sleep(450);
      const last = heap.pop(); const lastId = ids.pop();
      if (heap.length) { heap[0] = last; ids[0] = lastId; }
      let i = 0;
      while (true) {
        let best = i, l = 2*i+1, r = 2*i+2;
        if (l < heap.length && cmp(heap[l], heap[best])) best = l;
        if (r < heap.length && cmp(heap[r], heap[best])) best = r;
        if (best === i) break;
        [heap[i], heap[best]] = [heap[best], heap[i]]; [ids[i], ids[best]] = [ids[best], ids[i]];
        i = best;
        draw([ids[i]]);
        await sleep(400); await pausable();
      }
      draw();
      showSuccess(logEl, `Extracted <b>${root}</b> (${mode() === 'max' ? 'maximum' : 'minimum'}). Heap property restored.`);
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, ops, {}, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}

/* ---------------------------------------------------------------
   8. GRAPH ENGINE (circular layout, BFS/DFS)
   --------------------------------------------------------------- */
function initGraphPage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  const GRAPH_CAP = 10;
  let vertices = []; // {id,label}
  let edges = []; // {a,b}
  const history = new HistoryManager();

  function setComplexity(op) {
    const row = DS_META.graph.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.graph.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function updateSize() {
    sizeEl.style.display = 'inline-block';
    sizeEl.textContent = `V:${vertices.length}/${GRAPH_CAP} E:${edges.length}`;
  }
  function adjacency() {
    const adj = {}; vertices.forEach(v => adj[v.label] = []);
    edges.forEach(e => { adj[e.a].push(e.b); adj[e.b].push(e.a); });
    return adj;
  }
  function edgeExists(a, b) { return edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)); }
  function draw(current = [], visited = [], activeEdges = []) {
    const n = vertices.length;
    if (!n) { canvas.innerHTML = `<p style="color:var(--muted); padding:20px; font-family:var(--font-mono); font-size:13px;">No vertices yet — add one to begin.</p>`; updateSize(); return; }
    const size = 320, cx = size/2, cy = size/2, r = size/2 - 40;
    const pts = vertices.map((v,i) => ({ v, x: cx + r*Math.cos(2*Math.PI*i/n - Math.PI/2), y: cy + r*Math.sin(2*Math.PI*i/n - Math.PI/2) }));
    const byLabel = Object.fromEntries(pts.map(p => [p.v.label, p]));
    let edgeSvg = edges.map(e => {
      const a = byLabel[e.a], b = byLabel[e.b];
      if (!a || !b) return '';
      const isActive = activeEdges.some(([x,y]) => (x===e.a&&y===e.b)||(x===e.b&&y===e.a));
      return `<line class="tlink${isActive?' active':''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    }).join('');
    let nodeSvg = pts.map(p => {
      const cls = ['tnode-circle'];
      if (visited.includes(p.v.label)) cls.push('visited');
      if (current.includes(p.v.label)) cls.push('current');
      return `<circle class="${cls.join(' ')}" cx="${p.x}" cy="${p.y}" r="20"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle">${p.v.label}</text>`;
    }).join('');
    canvas.innerHTML = `<svg viewBox="0 0 ${size} ${size}" style="width:100%; max-width:${size}px; height:${size}px; display:block; margin:0 auto;">${edgeSvg}${nodeSvg}</svg>`;
    updateSize();
  }
  function snapshot() { return { vertices, edges }; }
  function restore(state) { vertices = state.vertices; edges = state.edges; draw(); }

  function seedRandom() {
    vertices = []; edges = [];
    const labels = ['A','B','C','D','E','F'];
    labels.forEach(l => vertices.push({ id: nextKey(), label: l }));
    const pairs = [['A','B'],['A','C'],['B','D'],['C','D'],['D','E'],['E','F'],['C','F']];
    pairs.forEach(([a,b]) => edges.push({a,b}));
    draw();
    showInfo(logEl, 'Random graph generated.');
  }
  seedRandom(); bumpProgress(key, 'view');
  history.push(snapshot());

  const ops = {
    async addVertex() {
      if (vertices.length >= GRAPH_CAP) throw new OpError(`Graph is full (max ${GRAPH_CAP} vertices for this demo).`);
      const e = document.getElementById(`${key}-val`);
      const label = requireValue(e.value, 'Vertex label').toUpperCase().slice(0,3);
      e.value = '';
      if (vertices.some(v => v.label === label)) throw new OpError(`Duplicate Value — vertex "${label}" already exists.`);
      vertices.push({ id: nextKey(), label });
      setComplexity('add vertex');
      draw([label]);
      showSuccess(logEl, `Added vertex <b>${label}</b>.`);
      await sleep(350);
    },
    async removeVertex() {
      const e = document.getElementById(`${key}-val`);
      const label = requireValue(e.value, 'Vertex label').toUpperCase().slice(0,3);
      e.value = '';
      if (!vertices.some(v => v.label === label)) throw new OpError(`Element Not Found — vertex "${label}" does not exist.`);
      setComplexity('add vertex');
      draw([label]);
      showInfo(logEl, `Removing vertex <b>${label}</b> and every edge attached to it…`);
      await sleep(400);
      vertices = vertices.filter(v => v.label !== label);
      const removedEdgeCount = edges.filter(ed => ed.a === label || ed.b === label).length;
      edges = edges.filter(ed => ed.a !== label && ed.b !== label);
      draw();
      showSuccess(logEl, `Vertex <b>${label}</b> removed, along with ${removedEdgeCount} incident edge(s).`);
    },
    async addEdge() {
      const e1 = document.getElementById(`${key}-e1`), e2 = document.getElementById(`${key}-e2`);
      const a = requireValue(e1.value, 'From vertex').toUpperCase();
      const b = requireValue(e2.value, 'To vertex').toUpperCase();
      e1.value=''; e2.value='';
      if (!vertices.some(v=>v.label===a) || !vertices.some(v=>v.label===b)) {
        throw new OpError(`Both "${a}" and "${b}" must already exist as vertices before they can be connected.`);
      }
      if (a === b) throw new OpError('Self-loops are not allowed in this simple graph — pick two different vertices.');
      if (edgeExists(a, b)) throw new OpError(`Duplicate Value — an edge between "${a}" and "${b}" already exists.`);
      edges.push({a,b});
      setComplexity('add edge');
      draw([a,b], [], [[a,b]]);
      showSuccess(logEl, `Connected <b>${a}</b> ↔ <b>${b}</b>.`);
      await sleep(400);
      draw();
    },
    async bfs() {
      if (!vertices.length) throw new OpError('Add vertices first — the graph is empty.');
      setComplexity('bfs / dfs traversal');
      const adj = adjacency();
      const visited = new Set(); const order = [];
      for (const startV of vertices) {
        const start = startV.label;
        if (visited.has(start)) continue;
        if (order.length) showInfo(logEl, `"${start}" is not reachable from the previous component — starting a new BFS from it.`);
        visited.add(start); const queue = [start];
        while (queue.length) {
          const v = queue.shift(); order.push(v);
          draw([v], order.slice(0,-1));
          showInfo(logEl, `BFS visiting <b>${v}</b> — order so far: ${order.join(' → ')}`);
          await sleep(550); await pausable();
          for (const nb of adj[v] || []) if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
        }
      }
      draw([], order);
      showSuccess(logEl, `BFS complete (all components covered): ${order.join(' → ')}`);
    },
    async dfs() {
      if (!vertices.length) throw new OpError('Add vertices first — the graph is empty.');
      setComplexity('bfs / dfs traversal');
      const adj = adjacency();
      const visited = new Set(); const order = [];
      async function rec(v) {
        visited.add(v); order.push(v);
        draw([v], order.slice(0,-1));
        showInfo(logEl, `DFS visiting <b>${v}</b> — order so far: ${order.join(' → ')}`);
        await sleep(550); await pausable();
        for (const nb of adj[v] || []) if (!visited.has(nb)) await rec(nb);
      }
      for (const startV of vertices) {
        if (visited.has(startV.label)) continue;
        if (order.length) showInfo(logEl, `"${startV.label}" is not reachable from the previous component — starting a new DFS from it.`);
        await rec(startV.label);
      }
      draw([], order);
      showSuccess(logEl, `DFS complete (all components covered): ${order.join(' → ')}`);
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, ops, {}, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}

/* ---------------------------------------------------------------
   9. HASH TABLE ENGINE
   --------------------------------------------------------------- */
const HASH_BUCKETS = 8;
function hashFn(k) { let h = 0; for (let i=0;i<k.length;i++) h = (h*31 + k.charCodeAt(i)) % HASH_BUCKETS; return h; }
function initHashTablePage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const sizeEl = document.getElementById(`${key}-size`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  let buckets = Array.from({length: HASH_BUCKETS}, () => []);
  const history = new HistoryManager();

  function setComplexity(op) {
    const row = DS_META.hashtable.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.hashtable.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function totalEntries() { return buckets.reduce((sum, b) => sum + b.length, 0); }
  function updateSize() {
    sizeEl.style.display = 'inline-block';
    const n = totalEntries();
    sizeEl.textContent = `Entries: ${n} · Load factor: ${(n / HASH_BUCKETS).toFixed(2)}`;
  }
  function draw(highlightBucket = -1) {
    canvas.innerHTML = `<div class="hash-grid">${buckets.map((b,i) => `
      <div class="hash-bucket">
        <span class="hash-idx">${i}</span>
        <div class="hash-slot" style="${i===highlightBucket?'border-color:var(--accent)':''}">
          ${b.map(entry => `<span class="hash-chip">${entry.k}: ${entry.v}</span>`).join('') || '<span style="color:var(--muted-2); font-size:12px;">empty</span>'}
        </div>
      </div>`).join('')}</div>`;
    updateSize();
  }
  function snapshot() { return { buckets }; }
  function restore(state) { buckets = state.buckets; draw(); }

  function seedRandom() {
    buckets = Array.from({length: HASH_BUCKETS}, () => []);
    const sample = [['name','Ana'],['age','21'],['city','Pune'],['id','44']];
    sample.forEach(([k,v]) => buckets[hashFn(k)].push({k,v}));
    draw();
    showInfo(logEl, 'Sample keys inserted.');
  }
  seedRandom(); bumpProgress(key, 'view');
  history.push(snapshot());

  const getKey = () => requireValue(document.getElementById(`${key}-key`).value, 'Key');
  const getV = () => requireValue(document.getElementById(`${key}-val`).value, 'Value');
  const clearInputs = () => { document.getElementById(`${key}-key`).value = ''; document.getElementById(`${key}-val`).value = ''; };

  const ops = {
    async insert() {
      const k = getKey(), v = getV();
      clearInputs();
      setComplexity('insert');
      const idx = hashFn(k);
      const willCollide = buckets[idx].length > 0 && !buckets[idx].some(e => e.k === k);
      draw(idx);
      showInfo(logEl, `Hashing <b>"${k}"</b> → bucket ${idx}${willCollide ? ' (collision — chaining onto this bucket)' : ''}.`);
      await sleep(500);
      const existing = buckets[idx].find(e => e.k === k);
      if (existing) { existing.v = v; draw(idx); showSuccess(logEl, `Key <b>"${k}"</b> already existed — value updated to ${v}.`); }
      else { buckets[idx].push({k,v}); draw(idx); showSuccess(logEl, `Element inserted successfully: <b>"${k}"</b> → ${v} in bucket ${idx}.`); }
    },
    async search() {
      const k = getKey();
      document.getElementById(`${key}-key`).value = '';
      setComplexity('search');
      const idx = hashFn(k);
      draw(idx);
      showInfo(logEl, `Hashing <b>"${k}"</b> → bucket ${idx}, then scanning that bucket's chain…`);
      await sleep(500);
      const found = buckets[idx].find(e => e.k === k);
      if (found) showSuccess(logEl, `Found <b>"${k}"</b> → ${found.v} in bucket ${idx}.`);
      else showError(logEl, `Element not found: <b>"${k}"</b> is not in the table (bucket ${idx} has no matching key).`);
    },
    async delete() {
      const k = getKey();
      document.getElementById(`${key}-key`).value = '';
      const idx = hashFn(k);
      if (!buckets[idx].some(e => e.k === k)) throw new OpError(`Element Not Found — key "${k}" does not exist (hashes to bucket ${idx}).`);
      setComplexity('delete');
      draw(idx);
      showInfo(logEl, `Removing <b>"${k}"</b> from bucket ${idx}…`);
      await sleep(450);
      buckets[idx] = buckets[idx].filter(e => e.k !== k);
      draw();
      showSuccess(logEl, `Element deleted successfully: <b>"${k}"</b> removed from bucket ${idx}.`);
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  wireOpButtons(toolbar, ops, {}, logEl, key, history, snapshot);
  wireHistoryButtons(key, history, restore, logEl);
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}


/* ---------------------------------------------------------------
   10. DS PAGE DISPATCH
   --------------------------------------------------------------- */
const builtPages = new Set();

function ensureDSPage(key) {
  const container = document.getElementById('dsPages');
  let page = document.getElementById(key);
  if (!page) {
    page = el(`<section class="page" id="${key}"></section>`);
    container.appendChild(page);
  }
  if (builtPages.has(key)) return page;
  builtPages.add(key);

  page.innerHTML = buildDSPageHTML(key);
  const meta = DS_META[key];
  renderQuiz(page.querySelector(`#quiz-${key} .quiz-body`), meta.quiz);
  renderAccordion(page.querySelector(`#interview-${key}`), meta.interview, false);
  renderAccordion(page.querySelector(`#coding-${key}`), meta.coding, true);

  const bookmarkBtn = page.querySelector(`#bookmark-${key}`);
  const bookmarks = getBookmarks();
  if (bookmarks.includes(key)) { bookmarkBtn.classList.add('active'); bookmarkBtn.textContent = '★ Bookmarked'; }
  bookmarkBtn.addEventListener('click', () => {
    const list = getBookmarks();
    const i = list.indexOf(key);
    if (i === -1) { list.push(key); bookmarkBtn.classList.add('active'); bookmarkBtn.textContent = '★ Bookmarked'; }
    else { list.splice(i,1); bookmarkBtn.classList.remove('active'); bookmarkBtn.textContent = '☆ Bookmark'; }
    localStorage.setItem('ds_bookmarks', JSON.stringify(list));
  });

  switch (key) {
    case 'array': initBoxListPage(key, { boxOpts: { showIndex: true }, ops: arrayOps, capacity: ARRAY_CAP, valueValidator: requireNumericValue }); break;
    case 'stack': initStackPage(key); break;
    case 'queue': initQueuePage(key); break;
    case 'circularqueue': initCircularQueuePage(key); break;
    case 'deque': initBoxListPage(key, { boxOpts: {}, ops: dequeOps, capacity: DEQUE_CAP }); break;
    case 'priorityqueue': initBoxListPage(key, { boxOpts: { showPriority: true }, ops: pqOps, autoSortByPriority: true }); break;
    case 'linkedlist': initLinkedListPage(key); break;
    case 'tree': initTreePage(key); break;
    case 'heap': initHeapPage(key); break;
    case 'graph': initGraphPage(key); break;
    case 'hashtable': initHashTablePage(key); break;
  }
  return page;
}

function getBookmarks() { try { return JSON.parse(localStorage.getItem('ds_bookmarks') || '[]'); } catch { return []; } }

/* ---------------------------------------------------------------
   11. PROGRESS TRACKING (localStorage)
   --------------------------------------------------------------- */
function getProgress() { try { return JSON.parse(localStorage.getItem('ds_progress') || '{}'); } catch { return {}; } }
function bumpProgress(key, kind) {
  if (!DS_ORDER.includes(key)) return;
  const p = getProgress();
  p[key] = p[key] || {};
  p[key][kind] = true;
  localStorage.setItem('ds_progress', JSON.stringify(p));
  updateProgressUI();
}
function updateProgressUI() {
  const p = getProgress();
  const visited = DS_ORDER.filter(k => p[k] && (p[k].view || p[k].operate));
  document.getElementById('progressCount').textContent = visited.length;
  const sr = document.getElementById('progressSr');
  if (sr) sr.textContent = `${visited.length} of ${DS_ORDER.length} topics explored`;
  document.querySelectorAll('.nav-link[data-ds]').forEach(a => {
    a.classList.toggle('done', !!(p[a.dataset.ds] && p[a.dataset.ds].operate));
  });
  document.querySelectorAll('.roadmap-item[data-ds]').forEach(a => {
    const done = !!(p[a.dataset.ds] && p[a.dataset.ds].operate);
    a.classList.toggle('done-item', done);
    const check = a.querySelector('.roadmap-check');
    if (check) check.style.display = done ? 'inline' : 'none';
  });
  if (visited.length === DS_ORDER.length && !localStorage.getItem('ds_all_complete_celebrated')) {
    localStorage.setItem('ds_all_complete_celebrated', '1');
    document.dispatchEvent(new CustomEvent('ai:allComplete'));
  }
}

/* ---------------------------------------------------------------
   12. NAVIGATION
   --------------------------------------------------------------- */
function showPage(key) {
  if (DS_ORDER.includes(key)) ensureDSPage(key);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(key) || document.getElementById('home');
  target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === key));
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  closeSidebarMobile();
  if (DS_ORDER.includes(key)) bumpProgress(key, 'view');
}

function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarScrim').classList.remove('show');
  document.getElementById('hamburger').setAttribute('aria-expanded', 'false');
}

function handleNavClick(e) {
  const a = e.target.closest('[data-nav]');
  if (!a) return;
  e.preventDefault();
  showPage(a.dataset.nav);
}

/* ---------------------------------------------------------------
   13. ROADMAP + DAILY CHALLENGE
   --------------------------------------------------------------- */
const ROADMAP_TIERS = [
  {
    tier: 'beginner', label: 'Beginner', totalTime: '~1.5–2 weeks',
    prereq: 'Basic programming: variables, loops, conditionals, and functions in any language.',
    items: [
      { key: 'array', time: '2–3 days', practice: 'Implement insert/delete/search by hand before checking the visualizer.' },
      { key: 'linkedlist', time: '2–3 days', practice: 'Draw pointer diagrams on paper for every operation before coding them.' },
      { key: 'stack', time: '1–2 days', practice: 'Solve balanced-parentheses and "reverse a string with a stack" by hand.' },
      { key: 'queue', time: '1–2 days', practice: 'Trace front/rear pointers manually for 5 enqueue/dequeue operations.' },
    ],
  },
  {
    tier: 'intermediate', label: 'Intermediate', totalTime: '~1.5 weeks',
    prereq: 'Comfortable with Array and Queue operations, and basic Big-O reasoning.',
    items: [
      { key: 'circularqueue', time: '1 day', practice: 'Manually compute (rear+1) % capacity for a capacity-5 queue on paper.' },
      { key: 'deque', time: '1 day', practice: 'Solve the "sliding window maximum" problem using a deque of indices.' },
      { key: 'priorityqueue', time: '2 days', practice: 'Implement a min-priority-queue backed by a plain array, then by a heap — compare speeds.' },
      { key: 'hashtable', time: '2–3 days', practice: 'Write your own string hash function and test it for collisions on a word list.' },
    ],
  },
  {
    tier: 'advanced', label: 'Advanced', totalTime: '~2 weeks',
    prereq: 'Recursion, and confidence tracing pointer-based structures without running code.',
    items: [
      { key: 'tree', time: '3–4 days', practice: 'Implement all four traversals recursively, then convert one to iterative using a stack.' },
      { key: 'heap', time: '2 days', practice: 'Implement heapify from an unsorted array and prove to yourself it\'s O(n), not O(n log n).' },
      { key: 'graph', time: '3–4 days', practice: 'Implement BFS and DFS on both an adjacency list and matrix; time them on a large graph.' },
    ],
  },
];

function renderRoadmap() {
  const container = document.getElementById('roadmapList');
  const tierHTML = ROADMAP_TIERS.map(tier => {
    const items = tier.items.map((it, i) => {
      const meta = DS_META[it.key];
      return `<div class="roadmap-item expandable" data-ds="${it.key}" tabindex="0" role="button" aria-expanded="false">
        <span class="roadmap-num">${String(i+1).padStart(2,'0')}</span>
        <div>
          <h4>${meta.title} <span class="roadmap-check" style="display:none;">✓</span></h4>
          <p>${meta.tag} · <span style="color:var(--muted-2)">${it.practice}</span></p>
        </div>
        <div class="roadmap-meta">
          <span class="difficulty-badge ${tier.tier}">${tier.label}</span>
          <span class="roadmap-time">${it.time}</span>
          <span class="roadmap-chevron">⌄</span>
        </div>
        <div class="roadmap-detail">
          <div class="roadmap-detail-inner">
            <p><b style="color:var(--text)">Explanation:</b> ${meta.definition}</p>
            <p><b style="color:var(--text)">Why it's used:</b> ${meta.explanation}</p>
            <div class="roadmap-detail-grid">
              <div class="explain-item"><div class="e-label">Time Complexity (avg)</div><div class="e-value mono">${meta.complexity[0][2]}</div></div>
              <div class="explain-item"><div class="e-label">Space Complexity</div><div class="e-value mono">${meta.space.split('—')[0].trim()}</div></div>
              <div class="explain-item"><div class="e-label">Real-World Example</div><div class="e-value">${meta.example}</div></div>
            </div>
            <div class="mini-label">Advantages</div>
            <div class="pill-list">${meta.pros.map(p => `<span class="pill">${p}</span>`).join('')}</div>
            <div class="mini-label">Disadvantages</div>
            <div class="pill-list">${meta.cons.map(p => `<span class="pill">${p}</span>`).join('')}</div>
            <div style="margin-top:16px;">
              <button class="op-btn primary roadmap-viz-btn" data-nav="${it.key}" data-ds="${it.key}">▶ Open Visualizer</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
    return `<div class="tier-block">
      <div class="tier-head">
        <span class="tier-badge ${tier.tier}">${tier.label}</span>
        <h3>${tier.label} structures</h3>
        <span class="tier-total">${tier.totalTime}</span>
      </div>
      <p class="roadmap-prereq"><b>Before you start:</b> ${tier.prereq}</p>
      <div style="margin-top:14px;">${items}</div>
    </div>`;
  }).join('');

  const checkpoints = `
    <div class="card" style="margin-top:8px;">
      <h2><span class="tag-num">✓</span> Revision Checkpoints</h2>
      <div class="checkpoint-card"><b>After Beginner tier:</b> Without looking anything up, explain why array access is O(1) but linked list access is O(n), and implement push/pop for a stack from memory.</div>
      <div class="checkpoint-card"><b>After Intermediate tier:</b> Explain why a circular queue avoids wasted space, and implement a hash function plus collision handling from memory.</div>
      <div class="checkpoint-card"><b>After Advanced tier:</b> Implement BST insert/delete, heap sift-up/down, and BFS/DFS on a graph — all without notes. This is interview-ready.</div>
    </div>
    <div class="card">
      <h2><span class="tag-num">✕</span> Common Mistakes to Avoid</h2>
      <div class="mistake-list">
        <div class="mistake-item">Confusing array "insert at end" (O(1) amortized) with "insert at beginning" (O(n)) — they are not the same cost.</div>
        <div class="mistake-item">Forgetting to update <b style="color:var(--text)">both</b> neighbor pointers when deleting from a doubly linked list.</div>
        <div class="mistake-item">Assuming BST operations are always O(log n) — they degrade to O(n) on unbalanced trees.</div>
        <div class="mistake-item">Mixing up BFS (queue, level-by-level) with DFS (stack/recursion, depth-first) when tracing by hand.</div>
        <div class="mistake-item">Treating heap order as fully sorted — only the parent/child relationship is guaranteed, not sibling order.</div>
        <div class="mistake-item">Ignoring load factor in a hash table — performance quietly degrades toward O(n) as it climbs.</div>
      </div>
    </div>
    <div class="card">
      <h2><span class="tag-num">🎯</span> Interview Preparation Milestones</h2>
      <div class="pill-list">
        <span class="pill">Milestone 1 — Explain Big-O of every operation for every structure, unprompted</span>
        <span class="pill">Milestone 2 — Implement each structure from scratch with no reference</span>
        <span class="pill">Milestone 3 — Solve 3 problems per structure on a coding platform</span>
        <span class="pill">Milestone 4 — Answer "why this structure over that one" for any pair</span>
        <span class="pill">Milestone 5 — Mock interview: whiteboard one structure end-to-end in 20 minutes</span>
      </div>
    </div>
    <div class="card">
      <h2><span class="tag-num">🚀</span> Final Challenge / Project Ideas</h2>
      <div class="project-list">
        <div class="project-item"><span class="proj-icon">📝</span><div><h5>Text editor undo/redo</h5><p>Use two stacks (or a deque) to implement multi-level undo/redo on a plain-text buffer.</p></div></div>
        <div class="project-item"><span class="proj-icon">🗺️</span><div><h5>Mini route planner</h5><p>Model a small city map as a graph and implement BFS for fewest-stops and Dijkstra for shortest distance.</p></div></div>
        <div class="project-item"><span class="proj-icon">📇</span><div><h5>In-memory key-value store</h5><p>Build your own hash table with chaining, a resize/rehash step, and benchmark it against a real Map.</p></div></div>
        <div class="project-item"><span class="proj-icon">🎟️</span><div><h5>Priority-based task scheduler</h5><p>Use a binary heap to build a scheduler that always runs the highest-priority pending task next.</p></div></div>
      </div>
    </div>`;

  container.innerHTML = tierHTML + checkpoints;

  container.querySelectorAll('.roadmap-item.expandable').forEach(item => {
    function toggle() {
      const nowOpen = item.classList.toggle('expanded');
      item.setAttribute('aria-expanded', String(nowOpen));
    }
    item.addEventListener('click', (e) => {
      if (e.target.closest('.roadmap-viz-btn')) return; // let the visualize button navigate instead
      toggle();
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  updateProgressUI();
}

function renderBenefits() {
  const benefits = [
    { icon: '👁️', title: 'Learn visually', text: 'See exactly how memory, pointers, and indices move instead of imagining it from static diagrams.' },
    { icon: '🕹️', title: 'Interactive simulations', text: 'You drive every operation — insert, delete, traverse — instead of watching a pre-recorded video.' },
    { icon: '🎬', title: 'Real-time animations', text: 'Every push, rotation, and rebalance plays out step by step, synced to the real algorithm.' },
    { icon: '🎯', title: 'Interview-focused', text: 'Every page pairs theory with the interview questions and coding prompts that actually get asked.' },
    { icon: '🌱', title: 'Beginner friendly', text: 'Plain-language definitions and real-life analogies before any code or math shows up.' },
    { icon: '🧠', title: 'Practice quizzes', text: 'Instant feedback quizzes on every page turn passive reading into active recall.' },
    { icon: '⌁', title: 'Complexity analysis', text: 'Best, average, and worst-case Big-O appears right after the operation that caused it.' },
    { icon: '⚠️', title: 'Error demonstrations', text: 'Overflow, underflow, and invalid operations are simulated on purpose, so you learn the edge cases too.' },
    { icon: '⚡', title: 'Faster understanding', text: 'Seeing cause and effect immediately shortens the gap between "I read it" and "I get it."' },
    { icon: '📌', title: 'Better retention', text: 'Interacting with a concept builds stronger memory than reading about it once and moving on.' },
  ];
  document.getElementById('benefitGrid').innerHTML = benefits.map(b => `
    <div class="benefit-card">
      <span class="benefit-icon" aria-hidden="true">${b.icon}</span>
      <div><h4>${b.title}</h4><p>${b.text}</p></div>
    </div>`).join('');
}

const DAILY_QUESTIONS = [
  { tag: 'Array', q: 'Why is inserting an element at the beginning of an array an O(n) operation?', a: 'Because every existing element must shift one position to the right to make room — the number of shifts grows with the array\'s length.' },
  { tag: 'Stack', q: 'How can two stacks be used to implement a queue?', a: 'Use an "in" stack for enqueues; when dequeuing, if the "out" stack is empty, pour everything from "in" into "out" (reversing order), then pop from "out". Each element moves at most twice, giving amortized O(1).' },
  { tag: 'BST', q: 'What happens to a BST\'s performance if you insert already-sorted data?', a: 'It degenerates into a straight chain with height n instead of log n, making every operation O(n) — the worst case for a BST.' },
  { tag: 'Hash Table', q: 'What is a collision, and how is it commonly resolved?', a: 'A collision is when two different keys hash to the same bucket. Chaining resolves it by storing a small list per bucket; open addressing resolves it by probing for the next free slot.' },
  { tag: 'Graph', q: 'Why does BFS guarantee the shortest path in an unweighted graph?', a: 'BFS explores everything at distance d before anything at distance d+1, so the first time a vertex is reached, it is guaranteed to be via the fewest possible edges.' },
  { tag: 'Heap', q: 'Why is building a heap from n elements O(n) rather than O(n log n)?', a: 'Most nodes sit near the bottom of the tree and need very few sift-down swaps; only a small fraction near the root need close to log n swaps — the sum works out to O(n) overall.' },
  { tag: 'Linked List', q: 'How do you detect a cycle in a linked list without extra memory?', a: 'Floyd\'s Tortoise and Hare: a slow pointer moves one step, a fast pointer moves two. If they meet, there is a cycle; if the fast pointer hits null, there isn\'t — O(1) space.' },
];
function renderDaily() {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_QUESTIONS.length;
  const d = DAILY_QUESTIONS[dayIndex];
  document.getElementById('dailyTag').textContent = d.tag;
  document.getElementById('dailyDate').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  document.getElementById('dailyQ').textContent = d.q;
  document.getElementById('dailyA').textContent = d.a;
  const revealBtn = document.getElementById('dailyReveal');
  const answerEl = document.getElementById('dailyA');
  revealBtn.addEventListener('click', () => { answerEl.hidden = !answerEl.hidden; revealBtn.textContent = answerEl.hidden ? 'Reveal answer' : 'Hide answer'; });
}

/* ---------------------------------------------------------------
   14. SEARCH
   --------------------------------------------------------------- */
function buildSearchIndex() {
  const idx = [];
  idx.push({ key: 'home', title: 'Home', sub: 'Overview & hero' });
  idx.push({ key: 'roadmap', title: 'Roadmap', sub: 'Suggested learning order' });
  DS_ORDER.forEach(key => {
    const m = DS_META[key];
    idx.push({ key, title: m.title, sub: m.tag });
  });
  return idx;
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function initSearch() {
  const idx = buildSearchIndex();
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  function setExpanded(v) { results.classList.toggle('show', v); input.setAttribute('aria-expanded', String(v)); }
  const runSearch = debounce(() => {
    const q = input.value.trim().toLowerCase();
    if (!q) { setExpanded(false); return; }
    const matches = idx.filter(item => item.title.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q));
    results.innerHTML = matches.length
      ? matches.map(m => `<a href="#${m.key}" data-nav="${m.key}" role="option">${m.title} <span style="color:var(--muted-2); font-size:12px;">— ${m.sub}</span></a>`).join('')
      : `<div class="sr-empty">No matches for "${input.value}"</div>`;
    setExpanded(true);
  }, 150);
  input.addEventListener('input', runSearch);
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) setExpanded(false); });
  results.addEventListener('click', (e) => {
    const a = e.target.closest('[data-nav]');
    if (a) { input.value = ''; setExpanded(false); }
  });
}


/* ---------------------------------------------------------------
   15. THEME, HERO VISUAL, MISC UI
   --------------------------------------------------------------- */
function setThemeButtonA11y(btn, isLight) {
  btn.textContent = isLight ? '☀️' : '🌙';
  btn.setAttribute('aria-pressed', String(isLight));
  btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
}
function initTheme() {
  const saved = localStorage.getItem('ds_theme');
  const isLight = saved === 'light';
  const btn = document.getElementById('themeToggle');
  document.body.classList.toggle('theme-light', isLight);
  document.body.classList.toggle('theme-dark', !isLight);
  setThemeButtonA11y(btn, isLight);
  btn.addEventListener('click', () => {
    const nowLight = !document.body.classList.contains('theme-light');
    document.body.classList.toggle('theme-light', nowLight);
    document.body.classList.toggle('theme-dark', !nowLight);
    setThemeButtonA11y(btn, nowLight);
    localStorage.setItem('ds_theme', nowLight ? 'light' : 'dark');
  });
}

function initHeroVisual() {
  const wrap = document.getElementById('heroVisual');
  // Signature element: array boxes morphing into a linked chain, live in the hero.
  const values = ['08','15','23','42','61'];
  wrap.innerHTML = `
    <svg viewBox="0 0 380 300" style="width:100%; max-width:420px; height:auto;">
      <g id="heroNodes"></g>
    </svg>`;
  const g = document.getElementById('heroNodes');
  const positions = values.map((v,i) => ({ x: 40 + i*70, y: 90 }));
  function drawArray() {
    g.innerHTML = positions.map((p,i) => `
      <rect x="${p.x-24}" y="${p.y-24}" width="48" height="48" rx="10" class="tnode-circle" style="fill:var(--surface-2);"/>
      <text x="${p.x}" y="${p.y+5}" text-anchor="middle" style="font-family:var(--font-mono); font-weight:700;">${values[i]}</text>
      <text x="${p.x}" y="${p.y+42}" text-anchor="middle" style="font-size:10px; fill:var(--muted-2);">${i}</text>
    `).join('');
  }
  function drawChain() {
    const chainY = 210;
    let s = '';
    positions.forEach((p,i) => {
      const cy = chainY;
      s += `<circle cx="${p.x}" cy="${cy}" r="24" class="tnode-circle" style="stroke:var(--accent-2);"/>
            <text x="${p.x}" y="${cy+5}" text-anchor="middle" style="font-family:var(--font-mono); font-weight:700;">${values[i]}</text>`;
      if (i < positions.length - 1) {
        s += `<line x1="${p.x+24}" y1="${cy}" x2="${positions[i+1].x-24}" y2="${cy}" class="tlink active"/>`;
      }
    });
    g.innerHTML = s;
  }
  drawArray();
  let showingArray = true;
  setInterval(() => { showingArray = !showingArray; showingArray ? drawArray() : drawChain(); }, 2600);
}

function initScrollTop() {
  const btn = document.getElementById('scrollTop');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { btn.classList.toggle('show', window.scrollY > 500); ticking = false; });
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebarScrim');
  const hamburger = document.getElementById('hamburger');
  hamburger.addEventListener('click', () => {
    const nowOpen = sidebar.classList.toggle('open');
    scrim.classList.toggle('show', nowOpen);
    hamburger.setAttribute('aria-expanded', String(nowOpen));
  });
  scrim.addEventListener('click', closeSidebarMobile);
}

/* ---------------------------------------------------------------
   15b. AI LEARNING ASSISTANT (rule-based, on-topic only)
   --------------------------------------------------------------- */
const AI_OFF_TOPIC_REPLY = "I'm your Data Structure learning assistant. I can help you understand this website and Data Structures.";

const AI_QUICK_CHIPS = [
  { label: '📚 Explain Array', q: 'explain array' },
  { label: '🌳 Explain Tree', q: 'explain tree' },
  { label: '📈 Time Complexity', q: 'time complexity' },
  { label: '🎯 Interview Tips', q: 'interview tips' },
  { label: '🧠 Quiz Help', q: 'quiz help' },
  { label: '🛣️ Learning Roadmap', q: 'roadmap' },
  { label: '🔍 Search Topics', q: 'search' },
];

function aiFindStructure(text) {
  const aliases = {
    array: ['array', 'arrays'],
    linkedlist: ['linked list', 'linkedlist', 'linked-list', 'll'],
    stack: ['stack', 'stacks', 'lifo'],
    queue: ['queue', 'queues', 'fifo'],
    circularqueue: ['circular queue', 'circular-queue', 'ring buffer'],
    deque: ['deque', 'double ended queue', 'double-ended queue'],
    priorityqueue: ['priority queue', 'priorityqueue'],
    tree: ['tree', 'bst', 'binary tree', 'binary search tree'],
    heap: ['heap', 'max heap', 'min heap'],
    graph: ['graph', 'bfs', 'dfs', 'graphs'],
    hashtable: ['hash table', 'hashtable', 'hash map', 'hashing'],
  };
  for (const [key, words] of Object.entries(aliases)) {
    if (words.some(w => text.includes(w))) return key;
  }
  return null;
}

function aiRespond(rawText) {
  const text = rawText.toLowerCase().trim();
  if (!text) return "Ask me anything about the data structures on this site — try one of the quick suggestions below.";

  if (/\b(hi|hello|hey)\b/.test(text)) return "Hey! 👋 I'm Structo. Ask me to explain a structure, its time complexity, or how to navigate the site.";
  if (text.includes('roadmap') || text.includes('learning path') || text.includes('what should i learn')) {
    return "Head to the Roadmap section on the Home page — it lays out Beginner → Intermediate → Advanced structures, with time estimates and what to learn before each one. Beginners should start with Array, Linked List, Stack, then Queue.";
  }
  if (text.includes('interview')) {
    return "For interview prep: 1) know Big-O for every operation of every structure, 2) implement each one from memory, 3) practice the coding questions on each structure's page, 4) be ready to justify why you'd pick one structure over another. Check the Interview Questions accordion on any structure's page.";
  }
  if (text.includes('quiz')) {
    return "Each structure's page has a Practice Quiz card — pick an answer and I'll show you instantly whether it's right, plus the correct one if not. Scroll to the bottom of any structure page to find it.";
  }
  if (text.includes('search')) {
    return "Use the search bar at the top of the page — type a structure name or keyword and jump straight to it.";
  }
  if (text.includes('time complexity') || text.includes('big o') || text.includes('big-o') || text.includes('space complexity')) {
    const key = aiFindStructure(text);
    if (key) {
      const rows = DS_META[key].complexity.map(r => `${r[0]}: ${r[2]} avg`).join(', ');
      return `${DS_META[key].title} complexity — ${rows}. Space: ${DS_META[key].space}`;
    }
    return "Every structure's page has a full Time & Space Complexity table (best/average/worst) — ask me about a specific one, e.g. \"time complexity of a stack\".";
  }
  if (text.includes('navigat') || text.includes('how do i use') || text.includes('how does this site work')) {
    return "Use the sidebar (or the ☰ menu on mobile) to jump between structures. Each page has a visualizer with buttons for every operation, a complexity readout, a quiz, and interview/coding questions below it.";
  }

  const key = aiFindStructure(text);
  if (key) {
    const m = DS_META[key];
    if (text.includes('example') || text.includes('real life') || text.includes('real-life')) {
      return `${m.title}: ${m.example}`;
    }
    if (text.includes('advantage') || text.includes('pro') || text.includes('disadvantage') || text.includes('con')) {
      return `${m.title} — Advantages: ${m.pros[0]} Disadvantages: ${m.cons[0]}`;
    }
    if (text.includes('application') || text.includes('use case') || text.includes('used for')) {
      return `${m.title} is commonly used for: ${m.applications.slice(0,3).join(', ')}.`;
    }
    return `${m.title}: ${m.definition} Visit the ${m.title} page from the sidebar to try it interactively.`;
  }

  return AI_OFF_TOPIC_REPLY;
}

function initAIAssistant() {
  const fab = document.getElementById('aiFab');
  const panel = document.getElementById('aiPanel');
  const closeBtn = document.getElementById('aiClose');
  const body = document.getElementById('aiBody');
  const chipsEl = document.getElementById('aiChips');
  const form = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  const ping = document.getElementById('aiPing');
  const greeter = document.getElementById('aiGreeter');
  let opened = false;

  chipsEl.innerHTML = AI_QUICK_CHIPS.map(c => `<button class="ai-chip" data-q="${c.q}">${c.label}</button>`).join('');

  function addMsg(text, who) {
    const msg = el(`<div class="ai-msg ${who}"></div>`);
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    return msg;
  }
  async function botReply(text) {
    const typing = el(`<div class="ai-typing"><span></span><span></span><span></span></div>`);
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    await sleep(500 + Math.random() * 400);
    typing.remove();
    addMsg(aiRespond(text), 'bot');
  }
  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    ping.classList.remove('show');
    greeter.classList.remove('show');
    localStorage.setItem('ai_seen', '1');
    if (!opened) {
      opened = true;
      addMsg("Hi! I'm Structo 🤖 — your Data Structure learning assistant for this site. Ask me to explain a structure, its complexity, or how to use the roadmap.", 'bot');
    }
    setTimeout(() => input.focus(), 150);
  }
  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
  }
  fab.addEventListener('click', () => panel.classList.contains('open') ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    await botReply(text);
  });
  chipsEl.addEventListener('click', async (e) => {
    const chip = e.target.closest('.ai-chip');
    if (!chip) return;
    addMsg(chip.textContent, 'user');
    await botReply(chip.dataset.q);
  });

  // First-visit greeting: the full character waves hello, then docks into the fab.
  if (!localStorage.getItem('ai_seen')) {
    setTimeout(() => {
      greeter.classList.add('show');
      ping.classList.add('show');
    }, 1400);
    setTimeout(() => { if (!opened) greeter.classList.remove('show'); }, 7500);
  }
  greeter.addEventListener('click', openPanel);

  // Eyes gently track the cursor — cheap, subtle, never touches layout.
  const allEyePairs = () => document.querySelectorAll('.ai-eye .pupil');
  let eyeRaf = null;
  document.addEventListener('mousemove', (e) => {
    if (eyeRaf) return;
    eyeRaf = requestAnimationFrame(() => {
      eyeRaf = null;
      const cx = window.innerWidth - 50, cy = window.innerHeight - 50; // roughly where the fab sits
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 300));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 300));
      allEyePairs().forEach(p => { p.style.transform = `translate(${dx * 1.6}px, ${dy * 1.6}px)`; });
    });
  }, { passive: true });

  // React to operation outcomes site-wide (dispatched from showSuccess/showError).
  let reactCooldown = false;
  document.addEventListener('ai:success', () => {
    if (reactCooldown) return;
    reactCooldown = true;
    fab.classList.remove('reacting-success'); void fab.offsetWidth; fab.classList.add('reacting-success');
    setTimeout(() => { fab.classList.remove('reacting-success'); reactCooldown = false; }, 600);
    if (!localStorage.getItem('ai_first_success')) {
      localStorage.setItem('ai_first_success', '1');
      burstConfetti(40);
      showAiTip("🎉 Nice, your first successful operation!");
      if (opened) addMsg("🎉 Great first move! Every operation you try teaches you something the textbook can't — keep going.", 'bot');
    }
  });
  document.addEventListener('ai:error', () => {
    if (reactCooldown) return;
    reactCooldown = true;
    fab.classList.remove('reacting-error'); void fab.offsetWidth; fab.classList.add('reacting-error');
    const charEl = document.querySelector('.ai-char');
    if (charEl) { charEl.classList.add('surprised'); setTimeout(() => charEl.classList.remove('surprised'), 500); }
    setTimeout(() => { fab.classList.remove('reacting-error'); reactCooldown = false; }, 500);
  });
  document.addEventListener('ai:overflow', () => {
    if (reactCooldown) return;
    reactCooldown = true;
    fab.classList.remove('reacting-overflow'); void fab.offsetWidth; fab.classList.add('reacting-overflow');
    showAiTip("📦 That's full! Try Pop/Dequeue first, or Change Capacity.");
    setTimeout(() => { fab.classList.remove('reacting-overflow'); reactCooldown = false; }, 550);
  });
  document.addEventListener('ai:underflow', () => {
    if (reactCooldown) return;
    reactCooldown = true;
    fab.classList.remove('reacting-underflow'); void fab.offsetWidth; fab.classList.add('reacting-underflow');
    showAiTip("📭 Nothing in there yet — add something first!");
    setTimeout(() => { fab.classList.remove('reacting-underflow'); reactCooldown = false; }, 600);
  });
  // Celebrate finishing every roadmap topic: confetti + dance + a proud message.
  document.addEventListener('ai:allComplete', () => {
    burstConfetti(90);
    fab.classList.add('reacting-dance');
    setTimeout(() => fab.classList.remove('reacting-dance'), 2300);
    if (!panel.classList.contains('open')) { ping.classList.add('show'); }
    if (opened) addMsg("🎉 You've explored every topic on the roadmap! You're genuinely interview-ready now — amazing work.", 'bot');
  });

  // Lightweight "point toward controls" tip — no walking/repositioning, just a
  // speech bubble + a quick arm-point gesture anchored to the docked fab.
  let tipTimer = null;
  function showAiTip(message, duration = 3200) {
    const bubble = document.getElementById('aiTipBubble');
    if (!bubble) return;
    bubble.textContent = message;
    bubble.classList.add('show');
    fab.classList.remove('pointing'); void fab.offsetWidth; fab.classList.add('pointing');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => bubble.classList.remove('show'), duration);
  }
  window.structoTip = showAiTip; // exposed so DS engines can call it contextually

  // First time a Stack/Queue becomes usable: point out the operation buttons.
  document.addEventListener('ai:structureReady', (e) => {
    const label = e.detail && e.detail.label ? e.detail.label : 'this structure';
    const hint = e.detail && e.detail.hint ? e.detail.hint : 'Try the buttons above!';
    if (localStorage.getItem(`ai_tip_ready_${label}`)) return;
    localStorage.setItem(`ai_tip_ready_${label}`, '1');
    setTimeout(() => showAiTip(`👆 ${hint}`, 4000), 600);
  });
}

/* ---------------------------------------------------------------
   16. BOOT
   --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeroVisual();
  renderRoadmap();
  renderBenefits();
  renderDaily();
  initSearch();
  initScrollTop();
  initSidebarToggle();
  initAIAssistant();
  updateProgressUI();

  document.body.addEventListener('click', handleNavClick);

  // Deep-link on load via hash
  const initial = (location.hash || '#home').slice(1);
  showPage(DS_ORDER.includes(initial) || initial === 'roadmap' ? (DS_ORDER.includes(initial) ? initial : 'home') : 'home');

  setTimeout(() => document.getElementById('loader').classList.add('hide'), 900);
});
