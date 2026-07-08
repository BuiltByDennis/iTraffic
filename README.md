# iTraffic 🚦

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=flat&logo=python&logoColor=ffdd54)

iTraffic is a full-stack web application designed for traffic-aware routing. It utilizes a React frontend and a FastAPI backend to calculate and display optimal driving routes using real-time traffic data from the Google Maps API.

## ✨ Features

- **Traffic-Aware Routing**: Computes optimal routes taking current traffic conditions into account.
- **Interactive Maps**: Renders smooth polylines and displays precise route details using `@vis.gl/react-google-maps`.
- **Fast Backend**: High-performance asynchronous API powered by FastAPI and `httpx`.
- **Modern Frontend**: Built with Vite, React 18, and styled beautifully using Tailwind CSS.

## 🛠️ Tech Stack

**Frontend:**
- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Google Maps React API (@vis.gl)](https://visgl.github.io/react-google-maps/)

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/)
- [Uvicorn](https://www.uvicorn.org/)
- [Python 3](https://www.python.org/)

---

## 🚀 Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites

- Node.js (v18 or higher recommended)
- Python 3.8+
- A Google Maps API Key with the **Routes API** and **Maps JavaScript API** enabled.

### 1. Clone the repository

```bash
git clone https://github.com/BuiltByDennis/iTraffic.git
cd iTraffic
```

### 2. Environment Variables

Create a `.env` file in the root directory of the project. This file is shared between both the frontend and the backend.

```env
# /iTraffic/.env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Start the Frontend

In your terminal, run the following commands from the root directory to start the Vite development server:

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```
The frontend will be available at `http://localhost:5173`.

### 4. Start the Backend

Open a new terminal window, navigate to the `backend` directory, and start the FastAPI server:

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
# OR
uvicorn main:app --reload
```
The backend API will be available at `http://0.0.0.0:8000`.

---

## 📖 API Documentation

Once the backend server is running, you can access the automatically generated interactive API documentation (Swagger UI) at:
- **http://localhost:8000/docs**

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/BuiltByDennis/iTraffic/issues).

## 📝 License

This project is licensed under the MIT License.
