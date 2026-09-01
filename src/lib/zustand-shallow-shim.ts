// zustand v4's `zustand/shallow` default export wraps the real comparator in a
// console.warn deprecation notice that fires on EVERY call. bitsocial-react-hooks
// imports it as a default (comments.js, communities.js, feeds.js) and passes it as
// the zustand equality function, so the warning fires once per subscriber per store
// notification — ~1000 times/second while a feed streams.
//
// Aliasing `zustand/shallow` to this shim keeps identical comparison semantics while
// dropping the per-call console.warn. Remove once bitsocial-react-hooks switches to
// the named `import { shallow } from 'zustand/shallow'`.
// Imported from 'zustand/vanilla/shallow' (not 'zustand/shallow') so the alias that
// points at this file does not resolve back into itself.
import { shallow } from 'zustand/vanilla/shallow';

export { shallow };
export default shallow;
