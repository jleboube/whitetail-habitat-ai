<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run the Whitetail Habitat AI assistant locally or via Docker Compose.

View your app in AI Studio: https://ai.studio/apps/drive/1r4KPwp7lz1qtIf1rZSJxB0HPWeT8ut5p

## Configure API keys

Copy the sample env file and fill in the providers you plan to use:

```bash
cp .env.example .env
# edit .env with your keys and desired defaults
```

Available variables:

| Variable | Purpose |
| --- | --- |
| `VITE_AI_PROVIDER` | Provider to use at runtime (`gemini`, `openai`, or `claude`). |
| `VITE_AI_PROVIDERS` | Comma-separated list that populates the in-app provider dropdown. |
| `VITE_GEMINI_API_KEY` | Google Gemini key (required for `gemini`). |
| `VITE_OPENAI_API_KEY` | OpenAI key (required for `openai`). |
| `VITE_OPENAI_MODEL` / `VITE_OPENAI_MODEL_THINKING` | Optional overrides for OpenAI models. |
| `VITE_ANTHROPIC_API_KEY` | Anthropic key (required for `claude`). |
| `VITE_ANTHROPIC_MODEL` / `VITE_ANTHROPIC_MODEL_THINKING` | Optional overrides for Claude models. |
| `VITE_GOOGLE_MAPS_API_KEY` | Needed to display the property map. |

> The app also understands the `REACT_APP_*` equivalents for compatibility, but `VITE_*` is recommended.

### Switching AI providers

The chat header now includes a dropdown to switch between the providers you list in `.env`. Changing providers prompts for confirmation and swaps to that provider’s isolated session so conversations stay separate. Re-selecting a provider restores the previous history tied to that provider’s session ID.

### Mobile layout

On phones, a tab bar lets you toggle between Chat and Map views so smaller screens aren’t forced to render both simultaneously. The desktop layout still shows both panels side-by-side.

## Run locally with Vite

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

The dev server listens on `http://localhost:3000`.

## Build and deploy with Docker Compose

The repository contains a production-ready multi-stage Dockerfile and `docker-compose.yml`.

```bash
# ensure .env is populated first
docker compose up --build
```

Environment variables from `.env` are forwarded to the Vite build via Docker build args and are also present at runtime for future server components. Containers publish to `http://localhost:7362` by default; set `PORT` in `.env` (already defaulted to `7362`) if you need another host port.

### Property boundary enrichment

If a user supplies a line like `Address: 123 Deer Lane, Iowa`, the client makes a lightweight Google Geocoding request to approximate the parcel bounds/acreage and appends that context to the model prompt. This helps Gemini / OpenAI / Claude tailor recommendations using estimated property size without manually restating acreage.

### Map drawing & acreage estimation

On desktop and mobile, the map now sits above the chat (stacked on mobile, side-by-side on large screens). Tap the ✏️ icon in the map controls to trace a property boundary; the app estimates acreage using the Google Maps drawing/geometry libraries, displays the total in-map, and forwards the polygon data to the AI so it can infer cover types and acreage-aware plans. Use the eraser icon to clear or redraw as needed.

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server. |
| `npm run build` | Create an optimized build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
