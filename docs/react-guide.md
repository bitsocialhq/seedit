# React guide

A lot of AI-generated React code is heavily biased toward using useState and useEffect, often in verbose or naive ways. That’s because these hooks are:

1. Explicit, making them easy for LLMs to pattern-match.
2. Safe defaults, requiring less architectural decision-making.
3. Well-documented, so the model’s training data is oversaturated with examples.

But modern, well-architected React apps rarely rely on raw useState/useEffect beyond simple UI state or lifecycle quirks. Here’s a breakdown of what serious devs use instead—and why this is the real moat for human engineers.

Alternatives to useState and useEffect

1. State Machines / Statecharts (e.g. Zustand)
- Why: Replaces ad-hoc local state management with deterministic, declarative logic.
- Advantage: Less bugs, easier to test, clearer state transitions.
- AI gap: LLMs struggle to model state transitions declaratively. LLM Agent must overcome this.

2. React Query / SWR for Data Fetching
- Why: Avoids useEffect-based data fetching and loading/error state juggling.
- Advantage: Caching, stale-while-revalidate, retries, pagination—all handled out of the box.
- AI gap: AI often uses useEffect + fetch and forgets cleanup, race conditions, or caching.

3. Global State with Zustand, Jotai, Recoil, or Redux Toolkit
- Why: Local useState doesn’t scale for shared or persistent state.
- Advantage: Better performance, devtools support, persistence.
- AI gap: Defaults to prop-drilling or bloated context APIs.

4. Custom Hooks and Composition
- Why: Reuse logic cleanly without bloating components or copy-pasting useEffect.
- Advantage: Separation of concerns, encapsulation.
- AI gap: Often fails to factor logic out, keeping everything in one component.

## Why This Matters

AI can mimic patterns, but it can’t:
- Architect a system for long-term maintainability.
- Predict runtime performance tradeoffs.
- Refactor spaghetti effects into custom hooks or state machines.
- Decide when state should be colocated vs globalized.
- Avoid footguns like stale closures, unnecessary re-renders, or race conditions.

In short: AI is great at writing code, but bad at engineering software.

Takeaway
- Use fewer useEffect and useState hooks.
- Learn to design systems, not just code components.
- Reach for declarative, composable patterns.
- Understand caching, reactivity, and scalability beyond local state.

Here’s a side-by-side breakdown of common AI-generated React patterns (bad) vs what experienced engineers write (good) across 4 key areas: state management, data fetching, side effects, and logic reuse.

## 1. State Management

❌ Bad (AI-style useState)

```typescript
function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    setTodos([...todos, { text: input }]);
    setInput('');
  };

  return (
    <>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map((todo, i) => <li key={i}>{todo.text}</li>)}
      </ul>
    </>
  );
}
```

✅ Good (Zustand store, state extracted)

```typescript
import { create } from 'zustand';

const useTodoStore = create((set) => ({
  todos: [],
  input: '',
  addTodo: () => set((state) => ({
    todos: [...state.todos, { text: state.input }],
    input: '',
  })),
  setInput: (val) => set({ input: val }),
}));

function TodoApp() {
  const { todos, input, setInput, addTodo } = useTodoStore();

  return (
    <>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={addTodo}>Add</button>
      <ul>
        {todos.map((todo, i) => <li key={i}>{todo.text}</li>)}
      </ul>
    </>
  );
}

```

## 2. Data Fetching

❌ Bad (AI-style useEffect)

```typescript
function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers);
  }, []);

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

✅ Good (React Query)

```typescript
import { useQuery } from '@tanstack/react-query';

function UserList() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

## 3. Side Effects

❌ Bad (naive effect with race condition)

```typescript
function Search({ term }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch(`/api/search?q=${term}`)
      .then(res => res.json())
      .then(setResults);
  }, [term]);

  return <div>{results.length} results</div>;
}
```

✅ Good (abort previous fetch with AbortController)

```typescript
function Search({ term }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/search?q=${term}`, { signal: controller.signal })
      .then(res => res.json())
      .then(setResults)
      .catch((e) => {
        if (e.name !== 'AbortError') console.error(e);
      });

    return () => controller.abort();
  }, [term]);

  return <div>{results.length} results</div>;
}
```

Better yet? Don’t use useEffect at all. Use React Query with term as a key.

## 4. Logic Reuse

❌ Bad (repeated logic inline)

```typescript
function ComponentA() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <div>{count}</div>;
}

function ComponentB() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <div>{count}</div>;
}
```

✅ Good (custom hook)

```typescript
function useCounter(intervalMs = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return count;
}

function ComponentA() {
  const count = useCounter();
  return <div>{count}</div>;
}

function ComponentB() {
  const count = useCounter();
  return <div>{count}</div>;
}

```

## 5. State Machines with Zustand

❌ Bad (AI-style complex useState with boolean flags)

```typescript
function OrderProcess() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cart, setCart] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const addToCart = (item) => {
    setCart([...cart, item]);
  };

  const submitPayment = async (details) => {
    setIsLoading(true);
    setIsError(false);

    try {
      await processPayment(details);
      setPaymentDetails(details);
      setIsSuccess(true);
      setIsLoading(false);
    } catch (error) {
      setIsError(true);
      setIsLoading(false);
    }
  };

  const placeOrder = async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      await submitOrder(cart, paymentDetails);
      setOrderPlaced(true);
      setIsSuccess(true);
      setIsLoading(false);
    } catch (error) {
      setIsError(true);
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Complex conditional rendering based on multiple state variables */}
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && !orderPlaced && (
        <>
          <CartItems items={cart} onAddItem={addToCart} />
          <PaymentForm onSubmit={submitPayment} />
          {paymentDetails && <OrderButton onClick={placeOrder} />}
        </>
      )}
      {orderPlaced && <OrderConfirmation />}
    </div>
  );
}
```

✅ Good (Zustand state machine)

```typescript
import { create } from 'zustand';

// Create a Zustand store with state machine pattern
const useOrderStore = create((set, get) => ({
  // State machine's current state
  state: 'browsing',

  // Context/data
  cart: [],
  paymentDetails: null,
  error: null,

  // Actions that transition between states
  addToCart: (item) => set((state) => ({
    cart: [...state.cart, item]
  })),

  goToCheckout: () => set({ state: 'paymentEntry' }),

  goBack: () => {
    const { state: currentState } = get();
    if (currentState === 'paymentEntry') {
      set({ state: 'browsing' });
    } else if (currentState === 'confirmOrder') {
      set({ state: 'paymentEntry' });
    }
  },

  submitPayment: async (details) => {
    set({ state: 'processingPayment', error: null });

    try {
      const result = await processPayment(details);
      set({
        state: 'confirmOrder',
        paymentDetails: result
      });
    } catch (error) {
      set({
        state: 'paymentEntry',
        error: error.message
      });
    }
  },

  placeOrder: async () => {
    const { cart, paymentDetails } = get();
    set({ state: 'processingOrder', error: null });

    try {
      await submitOrder(cart, paymentDetails);
      set({ state: 'orderComplete' });
    } catch (error) {
      set({
        state: 'confirmOrder',
        error: error.message
      });
    }
  }
}));

function OrderProcess() {
  const {
    state,
    cart,
    paymentDetails,
    error,
    addToCart,
    goToCheckout,
    goBack,
    submitPayment,
    placeOrder
  } = useOrderStore();

  // Render UI based on current state
  return (
    <div>
      {error && <ErrorMessage message={error} />}

      {state === 'browsing' && (
        <CartItems
          items={cart}
          onAddItem={addToCart}
          onCheckout={goToCheckout}
        />
      )}

      {state === 'paymentEntry' && (
        <PaymentForm
          onSubmit={submitPayment}
          onBack={goBack}
        />
      )}

      {state === 'processingPayment' && (
        <LoadingSpinner message="Processing payment..." />
      )}

      {state === 'confirmOrder' && (
        <OrderSummary
          cart={cart}
          paymentDetails={paymentDetails}
          onConfirm={placeOrder}
          onBack={goBack}
        />
      )}

      {state === 'processingOrder' && (
        <LoadingSpinner message="Placing your order..." />
      )}

      {state === 'orderComplete' && (
        <OrderConfirmation orderDetails={{ cart, paymentDetails }} />
      )}
    </div>
  );
}
```

### Key Benefits of the Zustand State Machine Approach:

1. **Explicit states**: The system can only be in one well-defined state at a time
2. **Centralized logic**: All state transitions are defined in one place
3. **Predictable transitions**: State changes follow clear patterns
4. **Simplified UI logic**: Components just render based on the current state
5. **Async handling**: Asynchronous operations are contained within the state transitions
6. **Shared state**: Any component can access the store without prop drilling
7. **Improved debugging**: The current state is always clear and predictable
8. **No impossible states**: Unlike boolean flags that could create invalid combinations
9. **Simpler API**: Compared to XState, Zustand offers a more approachable API for many developers
10. **Smaller bundle size**: Zustand is significantly smaller than XState

This approach gives most of the benefits of formal state machines while maintaining the simplicity and familiarity of React state management. It's a pragmatic middle ground that's often easier to adopt in existing projects.

## 6. Concurrent UI Techniques

❌ Bad (Blocking UI updates without concurrency):
```jsx
// Bad example: Synchronously fetching data in useEffect can cause UI jank.
function SearchResults({ query }) {
  const [results, setResults] = React.useState([]);

  React.useEffect(() => {
    fetch(`/api/search?q=${query}`)
      .then(res => res.json())
      .then(data => setResults(data));
  }, [query]);

  return (
    <div>
      {results.map(item => <p key={item.id}>{item.title}</p>)}
    </div>
  );
}
```

✅ Good (Using useTransition for non-blocking updates):
```jsx
// Good example: Leveraging useTransition to mark state updates as low-priority.
function SearchResults({ query }) {
  const [results, setResults] = React.useState([]);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    startTransition(() => {
      fetch(`/api/search?q=${query}`)
        .then(res => res.json())
        .then(data => setResults(data));
    });
  }, [query, startTransition]);

  return (
    <div>
      {isPending && <div>Loading...</div>}
      {results.map(item => <p key={item.id}>{item.title}</p>)}
    </div>
  );
}
```

## 7. Routing and Navigation (Not applicable with Next.js apps)

❌ Bad (Manual routing without a dedicated library):
```jsx
// Bad example: Handling routing manually using state and window history.
function App() {
  const [route, setRoute] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div>
      {route === '/' && <Home />}
      {route === '/about' && <About />}
      <button onClick={() => {
        window.history.pushState({}, '', '/about');
        setRoute('/about');
      }}>
        About
      </button>
    </div>
  );
}
```

✅ Good (Using React Router v6 with lazy-loaded routes):
```jsx
// Good example: Utilizing React Router to manage routes and lazy load components.
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import React, { lazy, Suspense } from 'react';

const Home = lazy(() => import('./Home'));
const About = lazy(() => import('./About'));

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

## 8. Error Handling

❌ Bad (No error boundary; crashes on errors):
```jsx
// Bad example: A component that throws errors without an error boundary.
function MyComponent({ data }) {
  if (!data) {
    throw new Error("Data not found");
  }
  return <div>{data}</div>;
}

function App() {
  return <MyComponent data={null} />;
}
```

✅ Good (Wrapping components with an Error Boundary):
```jsx
// Good example: Using an ErrorBoundary component to catch and handle errors gracefully.
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught in boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

function MyComponent({ data }) {
  if (!data) {
    throw new Error("Data not found");
  }
  return <div>{data}</div>;
}

function App() {
  return (
    <ErrorBoundary>
      <MyComponent data={null} />
    </ErrorBoundary>
  );
}
```

## 9. Form Management

❌ Bad (Manual state handling with no validation):
```jsx
// Bad example: Uncontrolled form without validation; error handling is omitted.
function ContactForm() {
  const [formData, setFormData] = React.useState({ name: '', email: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

✅ Good (Using React Hook Form with Zod for schema validation):

```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define your schema with Zod
const contactSchema = z.object({
  name: z.string().nonempty('Name is required'),
  email: z
    .string()
    .nonempty('Email is required')
    .email('Invalid email'),
});

// 2. Infer the TypeScript type of your form data
type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  // 3. Hook up RHF with the zodResolver
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          {...register('name')}
          placeholder="Name"
          aria-invalid={!!errors.name}
        />
        {errors.name && <p role="alert">{errors.name.message}</p>}
      </div>

      <div>
        <input
          {...register('email')}
          placeholder="Email"
          aria-invalid={!!errors.email}
        />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

## 10. Code Splitting and Lazy Loading

❌ Bad (Eagerly importing heavy components, increasing the initial bundle size):
```jsx
// Bad example: Directly importing a large component causing a heavier bundle.
import HeavyComponent from './HeavyComponent';

function App() {
  return (
    <div>
      <HeavyComponent />
    </div>
  );
}
```

✅ Good (Lazy loading heavy components with React.lazy and Suspense):
```jsx
// Good example: Dynamically importing components to reduce initial load time.
import React, { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading Component...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## 11. Testing Strategies

❌ Bad (Testing implementation details, resulting in brittle tests):
```jsx
// Bad example: Relying on internal DOM structure which may change.
import { render } from '@testing-library/react';
import MyComponent from './MyComponent';

test('MyComponent renders data', () => {
  const { container } = render(<MyComponent />);
  expect(container.querySelector('.data')).toBeDefined();
});
```

✅ Good (Focusing on user-centric behaviors using React Testing Library):
```jsx
// Good example: Testing component behavior by simulating user interactions.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

test('MyComponent displays loaded data after user action', async () => {
  render(<MyComponent />);

  // Check for an initial loading state
  expect(screen.getByText(/Loading/i)).toBeInTheDocument();

  // Simulate user action that triggers data loading
  const button = screen.getByRole('button', { name: /load data/i });
  userEvent.click(button);

  // Wait and assert that data is displayed
  expect(await screen.findByText(/Data loaded/i)).toBeInTheDocument();
});
```

## 12. Accessibility & Theming

❌ Bad (Non-semantic elements and missing ARIA labels):
```jsx
// Bad example: Using a div as a clickable element without semantics or accessibility.
function ThemedButton() {
  return <div onClick={() => console.log('Clicked!')}>Click me</div>;
}
```

✅ Good (Semantic button with ARIA attributes and theming via CSS variables):
```jsx
// Good example: Accessible button component that utilizes theming.
function ThemedButton() {
  return (
    <button
      aria-label="Click me"
      onClick={() => console.log('Clicked!')}
      style={{ padding: '8px 16px', backgroundColor: 'var(--primary-color)', color: '#fff' }}
    >
      Click me
    </button>
  );
}

/* CSS (in a separate file or styled-components):
:root {
  --primary-color: #007bff;
}
*/
```

# Summary Table

| Concern | Bad AI Pattern | Solid Engineering Practice |
|---------|---------------|----------------------------|
| **State Management** | `useState` everywhere, prop‑drilling | Central store (Zustand / Redux Toolkit) or colocated custom hooks |
| **Data Fetching** | `useEffect` + `fetch`, manual loading/error juggling | React Query / SWR with caching, retries, stale‑while‑revalidate |
| **Side Effects** | Effects without cleanup → race conditions, leaks | AbortController or query library handles cancellation & retries |
| **Logic Reuse** | Copy‑pasted hooks and state in every component | Extract cross‑cutting logic into custom hooks |
| **Workflow / State Machine** | Boolean‑flag soup, impossible states | Deterministic statechart in a single store (Zustand / XState) |
| **Concurrent UI Updates** | Blocking synchronous work inside effects | `useTransition` / `startTransition` for low‑priority updates |
| **Routing & Navigation** | DIY history manipulation, inline route state | React Router v6 (or Next.js built‑ins) with lazy‑loaded routes |
| **Error Handling** | No error boundary → full‑app crashes | Top‑level `ErrorBoundary` plus logging in `componentDidCatch` |
| **Form Management** | Manual state, zero validation or feedback | React Hook Form + Yup/Zod schema for declarative validation |
| **Code Splitting & Lazy Loading** | Eager imports ballooning bundle size | `React.lazy` + `Suspense` for on‑demand loading |
| **Testing Strategy** | Brittle tests keyed to DOM structure | User‑centric tests with React Testing Library & jest‑dom |
| **Accessibility & Theming** | Non‑semantic elements, missing ARIA, inline colors | Semantic HTML, ARIA labels, CSS variables / theme provider |