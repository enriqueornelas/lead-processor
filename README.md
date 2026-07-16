# Lead Processor

Full-stack CRM workspace for parsing lead CSVs, saving contacts, and generating sales pitches. Leads are stored on the server (JSON file) so data survives restarts and works across devices.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `MASTER_PASSWORD` (and optionally `GEMINI_API_KEY`)
3. Start: `npm run dev`
4. Open http://localhost:3000 and unlock with the master password

The password is verified only on the server. It is never embedded in the frontend bundle.

Production build:

```bash
npm run build
npm start
```

Data is saved under `./data/leads.json` (or `DATA_DIR`).

## Docker

```bash
# Put MASTER_PASSWORD (required) and optional GEMINI_API_KEY in a .env file next to docker-compose.yml
docker compose up -d --build
```

App: check the published host port (random) → container `3000`  
Persistent volume: `lead-processor-data` → `/data` in the container.

Find the assigned port:

```bash
docker compose port lead-processor 3000
# or
docker ps
```

In Portainer: open the container → **Published Ports**.

## Deploy with Portainer

### Option A — Stack from Git (recommended)

1. Push this repo to GitHub/GitLab (or any Git remote Portainer can reach).
2. In Portainer: **Stacks** → **Add stack**.
3. Name it `lead-processor`.
4. Choose **Repository**, paste the repo URL, set the compose path to `docker-compose.yml`.
5. Under **Environment variables**, add:
   - `MASTER_PASSWORD` = your global password (**required**)
   - `GEMINI_API_KEY` = your key (optional)
6. Click **Deploy the stack**.
7. Open the published host port shown on the container (mapped randomly to container `3000`).

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
      - "3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_DIR=/data
      - MASTER_PASSWORD=your_master_password_here
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

- Host port is assigned randomly (container still uses `3000`). Check it in Portainer under the container’s published ports, or with `docker compose port lead-processor 3000`.
- Leads persist in the Docker volume `lead-processor-data`.
- Existing browser `localStorage` leads are migrated once on first load if the server DB is empty.
