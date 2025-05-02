# 🏕️ AI Camping Planner

An AI-powered web application that helps users create personalized packing lists and plan outdoor camping trips. Built with **FastAPI** + **OpenAI GPT-4** on the backend, and **Next.js** + **Tailwind CSS** on the frontend.

---

## 📁 Project Structure

```
camping-demo/
├── backend/        # FastAPI backend
│   ├── main.py     # API routes and GPT integration
│   ├── .env        # OpenAI API key
│   └── requirements.txt
│
└── frontend/       # Next.js frontend UI
    ├── pages/
    │   ├── index.js    # Homepage
    │   └── plan.js     # Trip planning form
    ├── public/
    └── package.json
```

---

## 🧠 Features

- 📦 AI-generated packing lists based on trip type, location, group size, etc.
- ✍️ Simple form interface for entering trip details
- ⚡ Live connection between frontend + backend
- 🔒 API key stored securely in `.env`
- 🌈 Responsive design with Tailwind CSS

---

## 🚀 Local Development Setup

### 🔧 Prerequisites
- Python 3.10+
- Node.js + npm (recommend using [Node LTS](https://nodejs.org/en))

### 🐍 Backend Setup

```bash
cd backend
python -m venv env
env\Scripts\activate        # On Windows
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Run the FastAPI server:

```bash
uvicorn main:app --reload
```

Test it at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 🧼 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Then visit: [http://localhost:3000](http://localhost:3000)

---

## 📝 Pages Overview

### `pages/index.js`
Landing page with a button to start planning:
```js
<button onClick={() => router.push("/plan")}>Start Planning</button>
```

### `pages/plan.js`
Trip planning form with these fields:
- Trip type
- Group size
- Duration
- Location
- Month
- Experience level
- Sustainability

Makes a `POST` request to `http://localhost:8000/packing-list/generate` and displays the result.

---

## 📦 Example JSON Payload
```json
{
  "tripType": "car camping",
  "groupSize": 2,
  "duration": 3,
  "location": "Yosemite",
  "month": "July",
  "experienceLevel": "beginner",
  "sustainability": "yes"
}
```

---

## ✅ Useful Commands

### Backend:
```bash
uvicorn main:app --reload
```

### Frontend:
```bash
npm run dev
```

---

## 🌍 Deployment (Next Steps)
- 🔧 Deploy backend to [Railway](https://railway.app/) or [Render](https://render.com)
- 🚀 Deploy frontend to [Vercel](https://vercel.com/)
- 📬 Add email export, PDF download, or gear list sharing

---

## 👨‍🔬 Built By
Three outdoorsy friends from Wisconsin who once wrote a travel book and now build tools to make adventure easier 🌲