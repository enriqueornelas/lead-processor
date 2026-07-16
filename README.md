# Lead Processor

Full-stack CRM workspace for parsing lead CSVs, saving contacts, and generating sales pitches. Leads are stored on the server (JSON file) so data survives restarts and works across devices.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` if you want AI pitches
3. Start: `npm run dev`
4. Open http://localhost:3000

Production build:

```bash
npm run build
npm start
```

Data is saved under `./data/leads.json` (or `DATA_DIR`).

## Docker

```bash
# Optional: put GEMINI_API_KEY in a .env file next to docker-compose.yml
docker compose up -d --build
```

App: http://localhost:3000  
Persistent volume: `lead-processor-data` → `/data` in the container.

## Deploy with Portainer

### Option A — Stack from Git (recommended)

1. Push this repo to GitHub/GitLab (or any Git remote Portainer can reach).
2. In Portainer: **Stacks** → **Add stack**.
3. Name it `lead-processor`.
4. Choose **Repository**, paste the repo URL, set the compose path to `docker-compose.yml`.
5. Under **Environment variables**, add:
   - `GEMINI_API_KEY` = your key (optional)
6. Click **Deploy the stack**.
7. Open the published port (`3000` by default) on your host/IP.

Portainer will build the image from the `Dockerfile` and create the named volume for lead data.

### Option B — Upload compose file

1. On your machine (or CI), build and push an image to a registry:

```bash
docker build -t YOUR_REGISTRY/lead-processor:latest .
docker push YOUR_REGISTRY/lead-processor:latest
```

2. In Portainer: **Stacks** → **Add stack** → **Web editor**.
3. Paste this compose (adjust image name/port as needed):

```yaml
services:
  lead-processor:
    image: YOUR_REGISTRY/lead-processor:latest
    container_name: lead-processor
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/data
      - GEMINI_API_KEY=your_key_here
    volumes:
      - lead-processor-data:/data
    restart: unless-stopped

volumes:
  lead-processor-data:
```

4. Deploy the stack.

### Option C — Upload a pre-built image tarball

Useful for air-gapped hosts:

```bash
docker build -t lead-processor:latest .
docker save lead-processor:latest -o lead-processor.tar
```

1. In Portainer: **Images** → **Import** → upload `lead-processor.tar`.
2. **Stacks** → **Add stack** → use Option B compose with `image: lead-processor:latest`.

### After deploy

- Map host port `3000` (or change it in compose, e.g. `"8080:3000"`).
- Leads persist in the Docker volume `lead-processor-data`.
- Existing browser `localStorage` leads are migrated once on first load if the server DB is empty.
