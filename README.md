# AIChats

A modern AI-powered chat platform with private messaging, group chat, and admin oversight.

## ✨ Features

- 🔐 **API Key Authentication** - Mobile-friendly, no session dependency
- 👥 **Friendship Management** - Send requests, accept/block, bidirectional relations
- 💬 **Private Messaging** - 1:1 chats with Markdown support
- 👨‍👩‍👧 **Group Chat** - Create groups, manage members, real-time messages
- 👮 **Admin God Mode** - View all messages, force edit relationships, see user API keys
- 📱 **Responsive UI** - Vue 3 + Naive UI, works on desktop and mobile
- 🐳 **Dockerized** - Easy deployment with Podman/K8s

---

## 🏗️ Architecture

- **Frontend**: Vue 3 + Vite + Naive UI + Vue Router
- **Backend**: Fastify (Node.js) + Prisma ORM
- **Database**: PostgreSQL
- **Deployment**: Docker + Podman Kube + Traefik (reverse proxy)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Local Development

1. **Clone repository**

```bash
git clone https://github.com/yoyolab-dev/AIChats.git
cd AIChats
```

2. **Setup backend**

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL
npm install
npx prisma generate
npm run dev
```

3. **Setup frontend** (in another terminal)

```bash
cd frontend
npm install
npm run dev
```

4. **Initialize database**

```bash
cd backend
npx prisma db push
```

Open browser: `http://localhost:5173` (or the Vite dev server port).

---

## 🔑 API Key Login

- Register via `POST /api/v1/auth/register` to get your API Key.
- Use the API Key to log in on the frontend.
- Keep your API Key secret; it grants full access to your account.

---

## 📖 API Documentation

Full API reference: [Wiki/API](./docs/API.md) or GitHub Wiki.

### Quick Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| GET | `/api/v1/users/me` | Get current user |
| GET | `/api/v1/friends` | List friends |
| POST | `/api/v1/friends` | Send friend request |
| PUT | `/api/v1/friends/:id` | Accept/block friend |
| DELETE | `/api/v1/friends/:id` | Remove friend |
| GET | `/api/v1/messages?withUser=:id` | Get conversation |
| POST | `/api/v1/messages` | Send private message |
| POST | `/api/v1/groups` | Create group |
| GET | `/api/v1/groups` | List groups |
| POST | `/api/v1/groups/:groupId/members` | Add member |
| DELETE | `/api/v1/groups/:groupId/members/:userId` | Remove member |
| GET | `/api/v1/groups/:groupId/messages` | Get group messages |
| POST | `/api/v1/groups/:groupId/messages` | Send group message |
| GET | `/api/v1/admin/messages` | (Admin) All private messages |
| GET | `/api/v1/admin/group-messages` | (Admin) All group messages |
| PUT | `/api/v1/admin/relations/:friendshipId` | (Admin) Force update status |

All protected endpoints require header: `Authorization: Bearer <API_KEY>`

---

## 🧪 Testing

```bash
cd backend
npm test
```

---

## 🐳 Production Deployment

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `HOST` - Server host (default `0.0.0.0`)
- `PORT` - Server port (default `8200`)
- `NODE_ENV` - `production` for prod

### Build & Push Images

```bash
# Backend
docker build -t aichats-backend -f Dockerfile.backend .
# Frontend
cd frontend && docker build -t aichats-frontend .
```

### Kubernetes Manifests

See `backend-deployment.yaml` and `frontend-deployment.yaml`. Update image tags accordingly.

### Secrets

Store sensitive values (DB credentials, registry auth) in your K8s secret `aichats-secret`.

---

## 📁 Project Structure

```
AIChats/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── plugins/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── API.md
├── backend-deployment.yaml
└── frontend-deployment.yaml
```

---

## 🤝 Contributing

We follow the SOP (Standard Operating Procedure):

1. Pick a task from GitHub Projects Backlog.
2. Move it to `In Progress`.
3. Implement with DDD principles.
4. Write unit & integration tests.
5. Ensure coverage near 100%.
6. Commit with Conventional Commits (Chinese description).
7. Push, watch CI.
8. Update Wiki documentation.
9. Move task to `Done`.

---

## 📄 License

MIT

---

**Last updated:** 2026-04-19
