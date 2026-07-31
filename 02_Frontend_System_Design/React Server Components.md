# Summary / TL;DR / Notes

1. With CSR the problems is that while the js bundle is getting downloaded, parsed and executed the user sees blank screen thus poor FCP (TTI = FCP and content after db query)
2. SSR solves above problem by rendering an initial html file with structure and then on the client side js is downloaded and app is hydrated for interactivity and then db query for content thus better FCP (but FCP !== TTI because of js download + hydration time and content after db query)
3. Later SSR was improved by making initial db query + rendering shell together thus cutting down on a network request (in next.js via getServerSideProps) 
4. So now with SSR initial db query + render shell happens first (thus FCP with content) and then on client side js download + hydration (thus TTI) but the problem was this could only be done at page level and to solve this problem React Server components were introduced
5. **The key thing to understand is this:** Server Components never re-render. They run _once_ on the server to generate the UI. **The rendered value is sent to the client (note the result/rendered value is sent to client the code is not even included in js bundle)** and locked in place. As far as React is concerned, this output is immutable, and will never change.
6. The name “Client Component” implies that these components _only_ render on the client, but that's not actually true. **Client Components render on both the client _and_ the server.**
7. The most important thing to know about Server components is the rule : **Client Components can only import other Client Components.** When we add the `'use client'` directive a component, we create a “client boundary”. All of the components within this boundary are _implicitly_ converted to Client Components. Even if they do not contain `'use client'` themselves
8. Thus it is recommended to use Client components as leaf nodes as much as possible and if you have to use client components high in the tree use workarounds (like provider pattern, any other)
9. To be more precise, the `'use client'` directive works at the file / module level. Any modules _imported_ in a Client Component file must be Client Components as well. When the bundler bundles up our code, it'll follow these imports, after all!
10. The advantage of server components is obviously reduced bundle size but that's the smallest pro the true power it unlocks is with Suspense to allow Server Side Streaming.
11. The benefit of Server Side Streaming is that it allows us to break our app into several parallel loading components and thus the lighter components gets loaded and hydrated quickly while the heavier component can take their time without blocking others thus helping solve the waterfall issue

# Note

**RSC payload, not HTML**: The server sends a stream of encoded React elements (the “RSC payload”). The client React runtime uses this to reconcile the tree, and HTML is generated during SSR for the initial response, but updates (like navigations with RSC) can be purely payload-based, no HTML.

**“Never re-render” on client** is true, but a client component _can_ re-trigger a Server Component’s output through a server action that re-fetches a route, or via `router.refresh()`, causing a new RSC payload to be merged. The client tree patch is done without destroying client state.



# Client Side Rendering (CSR)

Client Side Rendering (CSR) works by shipping an empty page with bundle.js scripts that once the JS is downloaded and executed React springs into action, conjuring all of the DOM nodes for our entire application.

The problem with CSR is that it takes time to do all of that work. **And while it's all happening, the user is staring at a blank white screen.** This problem tends to get worse over time: every new feature we ship adds more kilobytes to our JavaScript bundle, prolonging the amount of time that the user has to sit and wait.

![[Screenshot 2026-07-31 at 06-49-48 Making Sense of React Server Components • Josh W. Comeau.png]]

# Server Side Rendering (SSR)

![[Pasted image 20260731065102.png]]

This is an improvement — a shell is better than a blank white page — but ultimately, it doesn't really move the needle in a significant way. **The user isn't visiting our app to see a loading screen**, they're visiting to see the _content_ (restaurants, hotel listings, search results, messages, whatever).

**But doesn't this flow feel a bit silly?** When I look at the SSR graph, I can't help but notice that the request _starts_ on the server. Instead of requiring a second round-trip network request, why don't we do the database work _during that initial request?_

In other words, **why not do something like this?**

![[Pasted image 20260731065542.png]]

```
import db from 'imaginary-db';

// This code only runs on the server:
export async function getServerSideProps() {
  const link = db.connect('localhost', 'root', 'passw0rd');
  const data = await db.query(link, 'SELECT * FROM products');

  return {
    props: { data },
  };
}

// This code runs on the server + on the client
export default function Homepage({ data }) {
  return (
    <>
      <h1>Trending Products</h1>

      {data.map((item) => (
        <article key={item.id}>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
        </article>
      ))}
    </>
  );
}
```


# React Server Components

Here's a quick example of a “Server Component”:

```
import db from 'imaginary-db';

async function Homepage() {
  const link = db.connect('localhost', 'root', 'passw0rd');
  const data = await db.query(link, 'SELECT * FROM products');

  return (
    <>
      <h1>Trending Products</h1>
      {data.map((item) => (
        <article key={item.id}>
          <h2>{item.title}</h2>
          <p>{item.description}</p>
        </article>
      ))}
    </>
  );
}

export default Homepage;
```

**The key thing to understand is this:** Server Components never re-render. They run _once_ on the server to generate the UI. The rendered value is sent to the client and locked in place. As far as React is concerned, this output is immutable, and will never change.

This means that a _big chunk_ of React's API is incompatible with Server Components. For example, we can't use state, because state can change, but Server Components can't re-render. And we can't use effects because effects only run _after_ the render, on the client, and Server Components never make it to the client.

The name “Client Component” implies that these components _only_ render on the client, but that's not actually true. **Client Components render on both the client _and_ the server.**

![[Pasted image 20260731071639.png]]

# Boundaries

One of the first questions I had when I was getting familiar with React Server Components was this: _what happens when the props change?_

For example, suppose we had a Server Component like this:

```
function HitCounter({ hits }) {
  return (
    <div>
      Number of hits: {hits}
    </div>
  );
}
```

Let's suppose that in the initial Server Side Render, `hits` was equal to `0`. This component, then, will produce the following markup:

```
<div>
  Number of hits: 0
</div>
```

But what happens if the value of `hits` changes? Suppose it's a state variable, and it changes from `0` to `1`. `HitCounter` would need to re-render, but it _can't_ re-render, because it's a Server Component!

**The thing is, Server Components don't really make sense in isolation.** We have to zoom out, to take a more holistic view, to consider the structure of our application.

Let's say we have the following component tree:

![[Pasted image 20260731072539.png]]

If all of these components are Server Components, then it all makes sense. None of the props will ever change, because none of the components will ever re-render.

But let's suppose that `Article` component owns the `hits` state variable. In order to use state, we need to convert it to a Client Component:

![[Pasted image 20260731072619.png]]

Do you see the issue here? When `Article` re-renders, any owned components will _also_ re-render, including `HitCounter` and `Discussion`. If these are Server Components, though, they _can't_ re-render.

In order to prevent this impossible situation, the React team added a rule: **Client Components can only import other Client Components.** That `'use client'` directive means that these instances of `HitCounter` and `Discussion` will need to become Client Components.

One of the biggest “ah-ha” moments I had with React Server Components was the realization that this new paradigm is all about creating _client boundaries_. Here's what winds up happening, in practice:

![[Pasted image 20260731073204.png]]

When we add the `'use client'` directive to the `Article` component, we create a “client boundary”. All of the components within this boundary are _implicitly_ converted to Client Components. Even though components like `HitCounter` don't have the `'use client'` directive, they'll still hydrate/render on the client in this particular situation.

This means we don't have to add `'use client'` to every single file that needs to run on the client. In practice, we only need to add it when we're creating new client boundaries.

# Workarounds

When I first learned that Client Components can't render Server Components, it felt pretty restrictive to me. What if I need to use state high up in the application? Does that mean _everything_ needs to become a Client Component??

It turns out that in many cases, we can work around this limitation by restructuring our application so that the _owner_ changes.

This is a tricky thing to explain, so let's use an example:

```
'use client';

import { DARK_COLORS, LIGHT_COLORS } from '@/constants.js';

import Header from './Header';
import MainContent from './MainContent';

function Homepage() {
  const [colorTheme, setColorTheme] = React.useState('light');

  const colorVariables = colorTheme === 'light'
    ? LIGHT_COLORS
    : DARK_COLORS;

  return (
    <body style={colorVariables}>
      <Header />
      <MainContent />
    </body>
  );
}
```

In this setup, we need to use React state to allow users to flip between dark mode / light mode. This needs to happen high up in the application tree, so that we can apply our CSS variable tokens to the `<body>` tag.

In order to use state, we need to make `Homepage` a Client Component. And since this is the top of our application, it means that all of the other components — `Header` and `MainContent` — will implicitly become Client Components too.

To fix this, let's pluck the color-management stuff into its own component, moved to its own file:

```
// /components/ColorProvider.js
'use client';

import { DARK_COLORS, LIGHT_COLORS } from '@/constants.js';

function ColorProvider({ children }) {
  const [colorTheme, setColorTheme] = React.useState('light');

  const colorVariables = colorTheme === 'light'
    ? LIGHT_COLORS
    : DARK_COLORS;

  return (
    <body style={colorVariables}>
      {children}
    </body>
  );
}
```

Back in `Homepage`, we use this new component like so:

```
// /components/Homepage.js
import Header from './Header';
import MainContent from './MainContent';
import ColorProvider from './ColorProvider';

function Homepage() {
  return (
    <ColorProvider>
      <Header />
      <MainContent />
    </ColorProvider>
  );
}
```

We can remove the `'use client'` directive from `Homepage` because it no longer uses state, or any other client-side React features. This means that `Header` and `MainContent` won't be implicitly converted to Client Components anymore!

**But wait a second.** `ColorProvider`, a Client Component, is a _parent_ to `Header` and `MainContent`. Either way, it's still higher in the tree, right?

When it comes to client boundaries, though, the parent/child relationship doesn't matter. `Homepage` is the one importing and rendering `Header` and `MainContent`. This means that `Homepage` decides _what the props are_ for these components.

Remember, the problem we're trying to solve is that Server Components can't re-render, and so they can't be given new values for any of their props. With this new setup, `Homepage` decides what the props are for `Header` and `MainContent`, and since `Homepage` is a Server Component, there's no problem.

**This is brain-bending stuff.** Even after years of React experience, I still find this very confusing 😅. It took a fair bit of practice to develop an intuition for this.

To be more precise, the `'use client'` directive works at the file / module level. Any modules _imported_ in a Client Component file must be Client Components as well. When the bundler bundles up our code, it'll follow these imports, after all!

# Advantage

**Reduced bundle size**.

Things get _really_ interesting when we combine React Server Components with Suspense and the new Streaming SSR architecture.