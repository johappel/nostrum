# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv create --template minimal --types ts --install pnpm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Local Nostr Relay + Demo Seed

Start a local relay:

```sh
pnpm relay:up
```

Seed demo community, lists, forum threads and replies:

```sh
pnpm relay:seed
```

The seed command prints the community pubkey and forum route, e.g.:
`/forums/<community-pubkey>`.

Useful commands:

```sh
pnpm relay:logs
pnpm relay:reset
pnpm relay:down
```

By default, seeding targets `ws://127.0.0.1:7011`.
You can override this using `LOCAL_RELAY_URL` in `.env`.
The forum page sync uses `PUBLIC_NOSTR_RELAY_URL` (same default value).
