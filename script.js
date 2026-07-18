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
      <button class="op-btn" data-op="delete">Delete</button>
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
      <span class="viz-spacer"></span>
      <button class="op-btn" data-op="random">⚄ Random</button>
      <button class="op-btn" data-op="reset">↺ Reset</button>
    </div>`,
  circularqueue: (key, meta) => `
    <div class="viz-toolbar">
      <input type="text" id="${key}-val" placeholder="value" maxlength="4">
      <button class="op-btn primary" data-op="enqueue">Enqueue</button>
      <button class="op-btn" data-op="dequeue">Dequeue</button>
      <span class="viz-spacer"></span>
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
          <button class="op-btn" id="${key}-stepback">⏮ Step Back</button>
          <button class="op-btn" id="${key}-stepfwd">⏭ Step Fwd</button>
          <span class="speed-label">Speed</span>
          <input type="range" id="${key}-speed" min="0.5" max="2.5" step="0.25" value="1" style="width:110px">
          <div class="op-complexity" id="${key}-complexity"><span>Ready</span></div>
        </div>
        <div class="viz-log" id="${key}-log">Try an operation above to see it animate.</div>
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
  const speedEl = document.getElementById(`${key}-speed`);
  const list = new BoxList(canvas, config.boxOpts);

  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });

  function setComplexity(op) {
    const row = DS_META[key].complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META[key].complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }

  function seedRandom() {
    list.items = Array.from({length: 5}, () => ({ key: nextKey(), val: randVal(), pri: Math.floor(Math.random()*9)+1 }));
    if (config.autoSortByPriority) list.items.sort((a,b)=>b.pri-a.pri);
    list.render();
    logEl.innerHTML = 'Random data generated.';
  }
  seedRandom();
  bumpProgress(key, 'view');

  const getVal = () => { const e = document.getElementById(`${key}-val`); const v = e.value.trim(); e.value=''; return v || String(randVal()); };
  const getIdx = () => { const e = document.getElementById(`${key}-idx`); const v = e.value; e.value=''; return v === '' ? null : +v; };
  const getPri = () => { const e = document.getElementById(`${key}-pri`); const v = e.value; e.value=''; return v === '' ? Math.floor(Math.random()*9)+1 : +v; };

  document.querySelectorAll(`#dsPages [data-op]`).forEach(()=>{}); // no-op placeholder

  const toolbar = canvas.closest('.viz-card').querySelector('.viz-toolbar');
  toolbar.querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await config.ops[btn.dataset.op]({ list, getVal, getIdx, getPri, logEl, setComplexity, seedRandom });
      btn.disabled = false;
      bumpProgress(key, 'operate');
    });
  });

  document.getElementById(`${key}-pause`).addEventListener('click', (e) => {
    PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause';
  });
  document.getElementById(`${key}-stepfwd`).textContent = '⏭ Step Fwd';
}

let PAUSED = false;
async function pausable() { while (PAUSED) await sleep(120); }

/* ---- Array ops ---- */
const arrayOps = {
  async insert({list, getVal, getIdx, logEl, setComplexity}) {
    const val = getVal(); let idx = getIdx();
    if (idx === null || idx < 0 || idx > list.items.length) idx = list.items.length;
    list.items.splice(idx, 0, { key: nextKey(), val });
    list.render([list.items[idx].key]);
    setComplexity('insert at beginning/middle');
    logEl.innerHTML = `Inserted <b>${val}</b> at index ${idx}. Elements after it shifted right.`;
    await sleep(500);
  },
  async delete({list, getIdx, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Array is empty.'; return; }
    let idx = getIdx(); if (idx === null || idx < 0 || idx >= list.items.length) idx = list.items.length - 1;
    const key = list.items[idx].key;
    const node = list.canvas.querySelector(`[data-key="${key}"]`);
    if (node) node.classList.add('removing');
    setComplexity('delete');
    logEl.innerHTML = `Deleting index ${idx}. Elements after it will shift left.`;
    await sleep(350);
    list.items.splice(idx, 1);
    list.render();
  },
  async update({list, getVal, getIdx, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Array is empty.'; return; }
    let idx = getIdx(); if (idx === null || idx < 0 || idx >= list.items.length) idx = 0;
    const val = getVal();
    list.items[idx].val = val;
    list.render([list.items[idx].key]);
    setComplexity('access');
    logEl.innerHTML = `Updated index ${idx} to <b>${val}</b> — direct O(1) write, no shifting needed.`;
    await sleep(400);
  },
  async search({list, getVal, logEl, setComplexity}) {
    const val = getVal(); setComplexity('search');
    for (let i = 0; i < list.items.length; i++) {
      list.render([list.items[i].key]);
      logEl.innerHTML = `Checking index ${i}: is it <b>${val}</b>?`;
      await sleep(280); await pausable();
      if (String(list.items[i].val) === String(val)) {
        list.render([], [list.items[i].key]);
        logEl.innerHTML = `Found <b>${val}</b> at index ${i}.`;
        return;
      }
    }
    logEl.innerHTML = `<b>${val}</b> not found in the array.`;
  },
  async reverse({list, logEl, setComplexity}) {
    list.items.reverse();
    list.render();
    setComplexity('access');
    logEl.innerHTML = 'Array reversed using a two-pointer swap from both ends.';
    await sleep(400);
  },
  async sort({list, logEl, setComplexity}) {
    setComplexity('access');
    const arr = list.items;
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        list.render([arr[j].key, arr[j+1].key]);
        await sleep(160); await pausable();
        if (Number(arr[j].val) > Number(arr[j+1].val)) {
          [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
          list.render([arr[j].key, arr[j+1].key]);
          await sleep(160);
        }
      }
    }
    logEl.innerHTML = 'Sorted using bubble sort (for clarity of animation) — O(n²).';
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};

/* ---- Stack ops ---- */
const stackOps = {
  async push({list, getVal, logEl, setComplexity}) {
    const val = getVal();
    list.items.push({ key: nextKey(), val });
    list.render([list.items.at(-1).key]);
    setComplexity('push');
    logEl.innerHTML = `Pushed <b>${val}</b> onto the top of the stack.`;
    await sleep(400);
  },
  async pop({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Stack is empty — nothing to pop.'; return; }
    const top = list.items.at(-1);
    const node = list.canvas.querySelector(`[data-key="${top.key}"]`);
    if (node) node.classList.add('removing');
    setComplexity('pop');
    logEl.innerHTML = `Popping <b>${top.val}</b> from the top.`;
    await sleep(350);
    list.items.pop();
    list.render();
  },
  async peek({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Stack is empty.'; return; }
    const top = list.items.at(-1);
    list.render([], [top.key]);
    setComplexity('peek');
    logEl.innerHTML = `Top of stack is <b>${top.val}</b> — not removed.`;
    await sleep(500);
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};

/* ---- Queue ops ---- */
const queueOps = {
  async enqueue({list, getVal, logEl, setComplexity}) {
    const val = getVal();
    list.items.push({ key: nextKey(), val });
    list.render([list.items.at(-1).key]);
    setComplexity('enqueue');
    logEl.innerHTML = `Enqueued <b>${val}</b> at the rear.`;
    await sleep(400);
  },
  async dequeue({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Queue is empty.'; return; }
    const front = list.items[0];
    const node = list.canvas.querySelector(`[data-key="${front.key}"]`);
    if (node) node.classList.add('removing');
    setComplexity('dequeue');
    logEl.innerHTML = `Dequeuing <b>${front.val}</b> from the front.`;
    await sleep(350);
    list.items.shift();
    list.render();
  },
  async front({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Queue is empty.'; return; }
    list.render([], [list.items[0].key]);
    setComplexity('front / rear peek');
    logEl.innerHTML = `Front of queue is <b>${list.items[0].val}</b>.`;
    await sleep(500);
  },
  async rear({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Queue is empty.'; return; }
    list.render([], [list.items.at(-1).key]);
    setComplexity('front / rear peek');
    logEl.innerHTML = `Rear of queue is <b>${list.items.at(-1).val}</b>.`;
    await sleep(500);
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};

/* ---- Circular Queue ops (fixed capacity 6) ---- */
const CIRCULAR_CAP = 6;
const circularOps = {
  async enqueue({list, getVal, logEl, setComplexity}) {
    if (list.items.length >= CIRCULAR_CAP) { logEl.innerHTML = `Queue full (capacity ${CIRCULAR_CAP}) — cannot enqueue.`; return; }
    const val = getVal();
    list.items.push({ key: nextKey(), val });
    list.render([list.items.at(-1).key]);
    setComplexity('enqueue');
    const rearIdx = list.items.length - 1;
    logEl.innerHTML = `Enqueued <b>${val}</b> at slot ${rearIdx} — rear computed as (rear+1) % ${CIRCULAR_CAP}.`;
    await sleep(400);
  },
  async dequeue({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Queue is empty.'; return; }
    const front = list.items[0];
    const node = list.canvas.querySelector(`[data-key="${front.key}"]`);
    if (node) node.classList.add('removing');
    setComplexity('dequeue');
    logEl.innerHTML = `Dequeuing <b>${front.val}</b> — this slot becomes reusable by future enqueues.`;
    await sleep(350);
    list.items.shift();
    list.render();
  },
  async reset({seedRandom}) { seedRandom(); },
};

/* ---- Deque ops ---- */
const dequeOps = {
  async pushFront({list, getVal, logEl, setComplexity}) {
    const val = getVal();
    list.items.unshift({ key: nextKey(), val });
    list.render([list.items[0].key]);
    setComplexity('insert front');
    logEl.innerHTML = `Inserted <b>${val}</b> at the front.`;
    await sleep(400);
  },
  async pushBack({list, getVal, logEl, setComplexity}) {
    const val = getVal();
    list.items.push({ key: nextKey(), val });
    list.render([list.items.at(-1).key]);
    setComplexity('insert front');
    logEl.innerHTML = `Inserted <b>${val}</b> at the rear.`;
    await sleep(400);
  },
  async popFront({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Deque is empty.'; return; }
    const f = list.items[0];
    const node = list.canvas.querySelector(`[data-key="${f.key}"]`); if (node) node.classList.add('removing');
    setComplexity('delete front');
    logEl.innerHTML = `Removing <b>${f.val}</b> from the front.`;
    await sleep(350); list.items.shift(); list.render();
  },
  async popBack({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Deque is empty.'; return; }
    const l = list.items.at(-1);
    const node = list.canvas.querySelector(`[data-key="${l.key}"]`); if (node) node.classList.add('removing');
    setComplexity('delete front');
    logEl.innerHTML = `Removing <b>${l.val}</b> from the rear.`;
    await sleep(350); list.items.pop(); list.render();
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};

/* ---- Priority Queue ops ---- */
const pqOps = {
  async insert({list, getVal, getPri, logEl, setComplexity}) {
    const val = getVal(); const pri = getPri();
    const item = { key: nextKey(), val, pri };
    let idx = list.items.findIndex(i => i.pri < pri);
    if (idx === -1) idx = list.items.length;
    list.items.splice(idx, 0, item);
    list.render([item.key]);
    setComplexity('insert');
    logEl.innerHTML = `Inserted <b>${val}</b> (priority ${pri}) — kept ordered by priority, highest first.`;
    await sleep(450);
  },
  async extract({list, logEl, setComplexity}) {
    if (!list.items.length) { logEl.innerHTML = 'Priority queue is empty.'; return; }
    const top = list.items[0];
    const node = list.canvas.querySelector(`[data-key="${top.key}"]`); if (node) node.classList.add('removing');
    setComplexity('extract highest priority');
    logEl.innerHTML = `Extracting <b>${top.val}</b> — highest priority (${top.pri}) in the queue.`;
    await sleep(350); list.items.shift(); list.render();
  },
  async random({seedRandom}) { seedRandom(); },
  async reset({seedRandom}) { seedRandom(); },
};


/* ---------------------------------------------------------------
   5. LINKED LIST ENGINE
   --------------------------------------------------------------- */
function initLinkedListPage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  let nodes = []; // {key, val}

  function setComplexity(op) {
    const row = DS_META.linkedlist.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.linkedlist.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function render(highlightKeys = []) {
    const html = '<div class="ll-row">' + nodes.map((n, i) => `
      <div class="ll-node${highlightKeys.includes(n.key)?' highlight':''}" data-key="${n.key}">
        <div class="val">${n.val}</div><div class="ptr">→</div>
      </div>${i < nodes.length-1 ? '' : ''}
    `).join('<span class="ll-arrow">⟶</span>') + `</div><span class="ll-null">NULL</span>`;
    flipRender(canvas, html);
  }
  function seedRandom() {
    nodes = Array.from({length:4}, () => ({ key: nextKey(), val: randVal() }));
    render(); logEl.innerHTML = 'Random list generated.';
  }
  seedRandom();
  bumpProgress(key, 'view');

  const getVal = () => { const e = document.getElementById(`${key}-val`); const v = e.value.trim(); e.value=''; return v || String(randVal()); };
  const getIdx = () => { const e = document.getElementById(`${key}-idx`); const v = e.value; e.value=''; return v === '' ? null : +v; };

  const ops = {
    async insertBeg() {
      const val = getVal();
      nodes.unshift({key: nextKey(), val});
      render([nodes[0].key]);
      setComplexity('insert at beginning');
      logEl.innerHTML = `Inserted <b>${val}</b> at the head — just rewire one pointer, O(1).`;
      await sleep(450);
    },
    async insertEnd() {
      const val = getVal();
      nodes.push({key: nextKey(), val});
      render([nodes.at(-1).key]);
      setComplexity('insert at end');
      logEl.innerHTML = `Inserted <b>${val}</b> at the tail — O(n) without a tail pointer, since we walk the whole list first.`;
      await sleep(450);
    },
    async insertPos() {
      const val = getVal(); let idx = getIdx();
      if (idx === null || idx < 0 || idx > nodes.length) idx = nodes.length;
      nodes.splice(idx, 0, {key: nextKey(), val});
      render([nodes[idx].key]);
      setComplexity('insert at beginning');
      logEl.innerHTML = `Inserted <b>${val}</b> at position ${idx} by rewiring the neighboring pointers.`;
      await sleep(450);
    },
    async delete() {
      if (!nodes.length) { logEl.innerHTML = 'List is empty.'; return; }
      let idx = getIdx(); if (idx === null || idx < 0 || idx >= nodes.length) idx = 0;
      const n = nodes[idx];
      const dom = canvas.querySelector(`[data-key="${n.key}"]`);
      if (dom) dom.style.opacity = '0.15';
      setComplexity('delete (given node)');
      logEl.innerHTML = `Deleting node at position ${idx} — previous node's pointer skips over it.`;
      await sleep(400);
      nodes.splice(idx, 1);
      render();
    },
    async search() {
      const val = getVal(); setComplexity('search');
      for (let i = 0; i < nodes.length; i++) {
        render([nodes[i].key]);
        logEl.innerHTML = `Following the chain… node ${i} holds <b>${nodes[i].val}</b>.`;
        await sleep(320); await pausable();
        if (String(nodes[i].val) === String(val)) { logEl.innerHTML = `Found <b>${val}</b> at position ${i}.`; return; }
      }
      logEl.innerHTML = `<b>${val}</b> not found — reached NULL.`;
    },
    async reverse() {
      nodes.reverse();
      render();
      setComplexity('insert at beginning');
      logEl.innerHTML = 'Reversed by walking once and flipping each pointer to face backward — O(n), O(1) extra space.';
      await sleep(450);
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  document.querySelector(`#${key}-canvas`).closest('.viz-card').querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => { btn.disabled = true; await ops[btn.dataset.op](); btn.disabled = false; bumpProgress(key,'operate'); });
  });
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
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  let root = null;
  function setComplexity(op) {
    const row = DS_META.tree.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.tree.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function seedRandom() {
    root = null;
    const vals = new Set(); while (vals.size < 7) vals.add(randVal());
    [...vals].forEach(v => root = bstInsert(root, v));
    renderTree(canvas, root); logEl.innerHTML = 'Random BST generated.';
  }
  seedRandom(); bumpProgress(key, 'view');
  const getVal = () => { const e = document.getElementById(`${key}-val`); const v = e.value.trim(); e.value=''; return v || String(randVal()); };

  const ops = {
    async insert() {
      const val = getVal();
      root = bstInsert(root, val);
      renderTree(canvas, root, { current: bstSearchPath(root, val) });
      setComplexity('insert');
      logEl.innerHTML = `Inserted <b>${val}</b> by walking left/right until an empty spot was found.`;
      await sleep(500);
      renderTree(canvas, root);
    },
    async delete() {
      const val = getVal();
      if (!root) { logEl.innerHTML = 'Tree is empty.'; return; }
      setComplexity('delete');
      renderTree(canvas, root, { current: bstSearchPath(root, val) });
      logEl.innerHTML = `Locating <b>${val}</b> to delete…`;
      await sleep(450);
      root = bstDelete(root, val);
      renderTree(canvas, root);
      logEl.innerHTML = `Deleted <b>${val}</b> (two-child case uses the in-order successor).`;
    },
    async search() {
      const val = getVal(); setComplexity('search');
      if (!root) { logEl.innerHTML = 'Tree is empty.'; return; }
      const path = bstSearchPath(root, val);
      for (let i = 1; i <= path.length; i++) {
        renderTree(canvas, root, { current: path.slice(0, i) });
        await sleep(380); await pausable();
      }
      const found = String(pathNodeVal(root, path.at(-1))) === String(val);
      logEl.innerHTML = found ? `Found <b>${val}</b> after ${path.length} comparison(s).` : `<b>${val}</b> not found in the tree.`;
    },
    async traverse() {
      const mode = document.getElementById(`${key}-trav`).value;
      if (!root) { logEl.innerHTML = 'Tree is empty.'; return; }
      setComplexity('traversal');
      const order = traverseOrder(root, mode);
      const vals = [];
      for (let i = 0; i < order.length; i++) {
        vals.push(findNodeVal(root, order[i]));
        renderTree(canvas, root, { current: [order[i]], visited: order.slice(0, i) });
        logEl.innerHTML = `${mode}: ${vals.join(' → ')}`;
        await sleep(500); await pausable();
      }
      renderTree(canvas, root, { visited: order });
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  function findNodeVal(n, id) { if (!n) return null; if (n.id === id) return n.val; return findNodeVal(n.left, id) ?? findNodeVal(n.right, id); }
  function pathNodeVal(n, id) { return findNodeVal(n, id); }

  canvas.closest('.viz-card').querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => { btn.disabled = true; await ops[btn.dataset.op](); btn.disabled = false; bumpProgress(key,'operate'); });
  });
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
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  let heap = []; let ids = [];
  function mode() { return document.getElementById(`${key}-mode`).value; }
  function cmp(a, b) { return mode() === 'max' ? Number(a) > Number(b) : Number(a) < Number(b); }
  function setComplexity(op) {
    const row = DS_META.heap.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.heap.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function draw(current = []) { renderTree(canvas, heapArrayToTree(heap, ids), { current }); }
  function seedRandom() {
    heap = []; ids = [];
    for (let i = 0; i < 7; i++) insertVal(String(randVal()), false);
    draw(); logEl.innerHTML = 'Random heap generated.';
  }
  function insertVal(val) {
    heap.push(val); ids.push(nextKey());
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!cmp(heap[i], heap[p])) break;
      [heap[i], heap[p]] = [heap[p], heap[i]]; [ids[i], ids[p]] = [ids[p], ids[i]];
      i = p;
    }
  }
  seedRandom(); bumpProgress(key, 'view');
  const getVal = () => { const e = document.getElementById(`${key}-val`); const v = e.value.trim(); e.value=''; return v || String(randVal()); };

  const ops = {
    async insert() {
      const val = getVal();
      setComplexity('insert');
      heap.push(val); ids.push(nextKey());
      let i = heap.length - 1;
      draw([ids[i]]);
      logEl.innerHTML = `Added <b>${val}</b> at the end, now bubbling up while it beats its parent…`;
      await sleep(400);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!cmp(heap[i], heap[p])) break;
        [heap[i], heap[p]] = [heap[p], heap[i]]; [ids[i], ids[p]] = [ids[p], ids[i]];
        i = p;
        draw([ids[i]]);
        await sleep(400); await pausable();
      }
      logEl.innerHTML = `Inserted <b>${val}</b> — bubbled up to its correct position.`;
    },
    async extract() {
      if (!heap.length) { logEl.innerHTML = 'Heap is empty.'; return; }
      setComplexity('delete max/min');
      const root = heap[0];
      draw([ids[0]]);
      logEl.innerHTML = `Removing root <b>${root}</b>, moving the last element to the top, then sifting down…`;
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
      logEl.innerHTML = `Extracted <b>${root}</b> (${mode() === 'max' ? 'maximum' : 'minimum'}).`;
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  document.getElementById(`${key}-mode`).addEventListener('change', () => { seedRandom(); });
  canvas.closest('.viz-card').querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => { btn.disabled = true; await ops[btn.dataset.op](); btn.disabled = false; bumpProgress(key,'operate'); });
  });
  document.getElementById(`${key}-pause`).addEventListener('click', (e) => { PAUSED = !PAUSED; e.target.textContent = PAUSED ? '▶ Resume' : '⏸ Pause'; });
}

/* ---------------------------------------------------------------
   8. GRAPH ENGINE (circular layout, BFS/DFS)
   --------------------------------------------------------------- */
function initGraphPage(key) {
  const canvas = document.getElementById(`${key}-canvas`);
  const logEl = document.getElementById(`${key}-log`);
  const compEl = document.getElementById(`${key}-complexity`);
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  let vertices = []; // {id,label}
  let edges = []; // {a,b}
  function setComplexity(op) {
    const row = DS_META.graph.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.graph.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function adjacency() {
    const adj = {}; vertices.forEach(v => adj[v.label] = []);
    edges.forEach(e => { adj[e.a].push(e.b); adj[e.b].push(e.a); });
    return adj;
  }
  function draw(current = [], visited = [], activeEdges = []) {
    const n = vertices.length;
    if (!n) { canvas.innerHTML = `<p style="color:var(--muted); padding:20px; font-family:var(--font-mono); font-size:13px;">No vertices yet — add one to begin.</p>`; return; }
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
  }
  function seedRandom() {
    vertices = []; edges = [];
    const labels = ['A','B','C','D','E','F'];
    labels.forEach(l => vertices.push({ id: nextKey(), label: l }));
    const pairs = [['A','B'],['A','C'],['B','D'],['C','D'],['D','E'],['E','F'],['C','F']];
    pairs.forEach(([a,b]) => edges.push({a,b}));
    draw(); logEl.innerHTML = 'Random graph generated.';
  }
  seedRandom(); bumpProgress(key, 'view');

  const ops = {
    async addVertex() {
      const e = document.getElementById(`${key}-val`);
      const label = (e.value.trim() || String.fromCharCode(65 + vertices.length)).toUpperCase().slice(0,3);
      e.value = '';
      if (vertices.some(v => v.label === label)) { logEl.innerHTML = `Vertex <b>${label}</b> already exists.`; return; }
      vertices.push({ id: nextKey(), label });
      setComplexity('add vertex');
      draw([label]);
      logEl.innerHTML = `Added vertex <b>${label}</b>.`;
      await sleep(350);
    },
    async addEdge() {
      const e1 = document.getElementById(`${key}-e1`), e2 = document.getElementById(`${key}-e2`);
      const a = e1.value.trim().toUpperCase(), b = e2.value.trim().toUpperCase();
      e1.value=''; e2.value='';
      if (!a || !b || !vertices.some(v=>v.label===a) || !vertices.some(v=>v.label===b)) { logEl.innerHTML = 'Enter two existing vertex labels to connect.'; return; }
      edges.push({a,b});
      setComplexity('add edge');
      draw([a,b], [], [[a,b]]);
      logEl.innerHTML = `Connected <b>${a}</b> ↔ <b>${b}</b>.`;
      await sleep(400);
      draw();
    },
    async bfs() {
      if (!vertices.length) { logEl.innerHTML = 'Add vertices first.'; return; }
      setComplexity('bfs / dfs traversal');
      const adj = adjacency(); const start = vertices[0].label;
      const visited = new Set([start]); const queue = [start]; const order = [];
      while (queue.length) {
        const v = queue.shift(); order.push(v);
        draw([v], order.slice(0,-1));
        logEl.innerHTML = `BFS visiting <b>${v}</b> — order so far: ${order.join(' → ')}`;
        await sleep(550); await pausable();
        for (const nb of adj[v] || []) if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
      draw([], order);
      logEl.innerHTML = `BFS complete: ${order.join(' → ')}`;
    },
    async dfs() {
      if (!vertices.length) { logEl.innerHTML = 'Add vertices first.'; return; }
      setComplexity('bfs / dfs traversal');
      const adj = adjacency(); const start = vertices[0].label;
      const visited = new Set(); const order = [];
      async function rec(v) {
        visited.add(v); order.push(v);
        draw([v], order.slice(0,-1));
        logEl.innerHTML = `DFS visiting <b>${v}</b> — order so far: ${order.join(' → ')}`;
        await sleep(550); await pausable();
        for (const nb of adj[v] || []) if (!visited.has(nb)) await rec(nb);
      }
      await rec(start);
      draw([], order);
      logEl.innerHTML = `DFS complete: ${order.join(' → ')}`;
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  canvas.closest('.viz-card').querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => { btn.disabled = true; await ops[btn.dataset.op](); btn.disabled = false; bumpProgress(key,'operate'); });
  });
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
  const speedEl = document.getElementById(`${key}-speed`);
  speedEl.addEventListener('input', () => { SPEED = +speedEl.value; });
  let buckets = Array.from({length: HASH_BUCKETS}, () => []);
  function setComplexity(op) {
    const row = DS_META.hashtable.complexity.find(r => r[0].toLowerCase().includes(op.toLowerCase())) || DS_META.hashtable.complexity[0];
    compEl.innerHTML = `<span>Best <b>${row[1]}</b></span><span>Avg <b>${row[2]}</b></span><span>Worst <b>${row[3]}</b></span>`;
  }
  function draw(highlightBucket = -1) {
    canvas.innerHTML = `<div class="hash-grid">${buckets.map((b,i) => `
      <div class="hash-bucket">
        <span class="hash-idx">${i}</span>
        <div class="hash-slot" style="${i===highlightBucket?'border-color:var(--accent)':''}">
          ${b.map(entry => `<span class="hash-chip">${entry.k}: ${entry.v}</span>`).join('') || '<span style="color:var(--muted-2); font-size:12px;">empty</span>'}
        </div>
      </div>`).join('')}</div>`;
  }
  function seedRandom() {
    buckets = Array.from({length: HASH_BUCKETS}, () => []);
    const sample = [['name','Ana'],['age','21'],['city','Pune'],['id','44']];
    sample.forEach(([k,v]) => buckets[hashFn(k)].push({k,v}));
    draw(); logEl.innerHTML = 'Sample keys inserted.';
  }
  seedRandom(); bumpProgress(key, 'view');
  const getKey = () => { const e = document.getElementById(`${key}-key`); const v = e.value.trim(); e.value=''; return v || 'key'+Math.floor(Math.random()*90); };
  const getV = () => { const e = document.getElementById(`${key}-val`); const v = e.value.trim(); e.value=''; return v || String(randVal()); };

  const ops = {
    async insert() {
      const k = getKey(), v = getV();
      setComplexity('insert');
      const idx = hashFn(k);
      draw(idx);
      logEl.innerHTML = `Hashing <b>"${k}"</b> → bucket ${idx}${buckets[idx].length ? ' (collision — chaining onto this bucket)' : ''}.`;
      await sleep(500);
      const existing = buckets[idx].find(e => e.k === k);
      if (existing) existing.v = v; else buckets[idx].push({k,v});
      draw(idx);
    },
    async search() {
      const k = getKey(); setComplexity('search');
      const idx = hashFn(k);
      draw(idx);
      logEl.innerHTML = `Hashing <b>"${k}"</b> → bucket ${idx}, then scanning that bucket's chain…`;
      await sleep(500);
      const found = buckets[idx].find(e => e.k === k);
      logEl.innerHTML = found ? `Found <b>"${k}"</b> → ${found.v} in bucket ${idx}.` : `<b>"${k}"</b> not found (bucket ${idx} has no matching key).`;
    },
    async delete() {
      const k = getKey(); setComplexity('delete');
      const idx = hashFn(k);
      draw(idx);
      logEl.innerHTML = `Removing <b>"${k}"</b> from bucket ${idx}…`;
      await sleep(450);
      buckets[idx] = buckets[idx].filter(e => e.k !== k);
      draw();
    },
    async random() { seedRandom(); },
    async reset() { seedRandom(); },
  };
  canvas.closest('.viz-card').querySelectorAll('[data-op]').forEach(btn => {
    btn.addEventListener('click', async () => { btn.disabled = true; await ops[btn.dataset.op](); btn.disabled = false; bumpProgress(key,'operate'); });
  });
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
    case 'array': initBoxListPage(key, { boxOpts: { showIndex: true }, ops: arrayOps }); break;
    case 'stack': initBoxListPage(key, { boxOpts: { vertical: true }, ops: stackOps }); break;
    case 'queue': initBoxListPage(key, { boxOpts: {}, ops: queueOps }); break;
    case 'circularqueue': initBoxListPage(key, { boxOpts: { showIndex: true }, ops: circularOps }); break;
    case 'deque': initBoxListPage(key, { boxOpts: {}, ops: dequeOps }); break;
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
  document.querySelectorAll('.nav-link[data-ds]').forEach(a => {
    a.classList.toggle('done', !!(p[a.dataset.ds] && p[a.dataset.ds].operate));
  });
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
function renderRoadmap() {
  const container = document.getElementById('roadmapList');
  container.innerHTML = DS_ORDER.map((key, i) => {
    const meta = DS_META[key];
    return `<a href="#${key}" class="roadmap-item" data-nav="${key}" data-ds="${key}">
      <span class="roadmap-num">${String(i+1).padStart(2,'0')}</span>
      <div><h4>${meta.title}</h4><p>${meta.tag}</p></div>
      <span class="roadmap-arrow">→</span>
    </a>`;
  }).join('');
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
function initSearch() {
  const idx = buildSearchIndex();
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.classList.remove('show'); return; }
    const matches = idx.filter(item => item.title.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q));
    results.innerHTML = matches.length
      ? matches.map(m => `<a href="#${m.key}" data-nav="${m.key}">${m.title} <span style="color:var(--muted-2); font-size:12px;">— ${m.sub}</span></a>`).join('')
      : `<div class="sr-empty">No matches for "${input.value}"</div>`;
    results.classList.add('show');
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrap')) results.classList.remove('show'); });
  results.addEventListener('click', (e) => {
    const a = e.target.closest('[data-nav]');
    if (a) { input.value = ''; results.classList.remove('show'); }
  });
}


/* ---------------------------------------------------------------
   15. THEME, HERO VISUAL, MISC UI
   --------------------------------------------------------------- */
function initTheme() {
  const saved = localStorage.getItem('ds_theme');
  const isLight = saved === 'light';
  document.body.classList.toggle('theme-light', isLight);
  document.body.classList.toggle('theme-dark', !isLight);
  document.getElementById('themeToggle').textContent = isLight ? '☀️' : '🌙';
  document.getElementById('themeToggle').addEventListener('click', () => {
    const nowLight = !document.body.classList.contains('theme-light');
    document.body.classList.toggle('theme-light', nowLight);
    document.body.classList.toggle('theme-dark', !nowLight);
    document.getElementById('themeToggle').textContent = nowLight ? '☀️' : '🌙';
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
  window.addEventListener('scroll', () => { btn.classList.toggle('show', window.scrollY > 500); });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebarScrim');
  document.getElementById('hamburger').addEventListener('click', () => {
    sidebar.classList.toggle('open'); scrim.classList.toggle('show');
  });
  scrim.addEventListener('click', closeSidebarMobile);
}

/* ---------------------------------------------------------------
   16. BOOT
   --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeroVisual();
  renderRoadmap();
  renderDaily();
  initSearch();
  initScrollTop();
  initSidebarToggle();
  updateProgressUI();

  document.body.addEventListener('click', handleNavClick);

  // Deep-link on load via hash
  const initial = (location.hash || '#home').slice(1);
  showPage(DS_ORDER.includes(initial) || initial === 'roadmap' ? (DS_ORDER.includes(initial) ? initial : 'home') : 'home');

  setTimeout(() => document.getElementById('loader').classList.add('hide'), 900);
});
