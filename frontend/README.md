# TrueDocs frontend

## Deployment configuration

Set `VITE_API_URL` in the frontend hosting provider to the public backend URL, for example:

`VITE_API_URL=https://api.example.com`

The backend must have these environment variables configured:

- `CLIENT_URL`: the public frontend URL. Multiple frontend URLs may be separated by commas.
- `SERVER_URL`: the public backend URL, for example `https://api.example.com`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- `SESSION_SECRET`, `JWT_SECRET`, and `MONGODB_URI`.

In Google Cloud Console, add this exact authorized redirect URI:

`https://api.example.com/api/auth/google/callback`

After changing `VITE_API_URL`, rebuild and redeploy the frontend because Vite injects it at build time.

## Local development

The frontend defaults to `http://localhost:5000` when running Vite locally. Keep the backend's local `CLIENT_URL` and `SERVER_URL` values aligned with the local frontend and backend URLs.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
