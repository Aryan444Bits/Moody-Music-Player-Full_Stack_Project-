# 🎵 Moody Music Player: AI-Driven Emotion-Based Music Curation

An intelligent, full-stack music experience that uses real-time facial recognition to synchronize your soundtrack with your emotions. By analyzing 68 unique facial landmarks, **Moody Music Player** bridges the gap between human sentiment and digital curation.

---

### 🚀 **Project Overview**
Unlike traditional music players that rely on manual searching, this application leverages **face-api.js** to detect user emotions (Happy, Sad, Angry, Surprised, Neutral) directly through your webcam. It then dynamically fetches the most appropriate tracks from a custom Node.js/MongoDB backend, creating a frictionless, "mood-driven" listening session.

### 🧠 **Core Features**
*   **Real-time Emotion Analytics**: Uses a pre-trained CNN to identify facial expressions with high accuracy through the browser.
*   **Dynamic Music Routing**: A specialized backend engine that maps emotional data to curated music categories (Mongoose-powered).
*   **Scanner Overlay**: A professional UI effect with interactive scanner lines while the AI is analyzing your face.
*   **Cloud-Native Storage**: Integrated with **ImageKit.io** for high-performance audio delivery and management via Multer.
*   **Modern UI/UX**: 3-Page React application (Home, Suggestion, Upload) using **Framer Motion** for smooth transitions and glass-morphism effects.

### 🛠️ **The Tech Stack**
*   **Frontend**: React.js, Framer Motion, Axios, React Router.
*   **AI Engine**: Face-api.js (TensorFlow.js).
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB (Mongoose ODM).
*   **File Storage**: Multer + ImageKit.io API.

---

### 📂 **Repository Structure**

#### `FrontEnd/`
*   `src/components/FacialExpression.jsx`: The core component for webcam stream and emotion detection.
*   `src/components/MoodSongs.jsx`: Handles state-driven song rendering and audio playback.
*   `src/components/UploadSong.jsx`: Multi-part form for contributing new tracks to the library.

#### `BackEnd/`
*   `src/routes/song.routes.js`: RESTful endpoints for filtering and uploading songs.
*   `src/service/storage.service.js`: Wrapper logic for Cloud Storage (ImageKit).
*   `src/models/song.model.js`: Mongoose Schema for sound metadata.

---

### ⚙️ **Installation & Setup**

#### **1. Clone the repository**
```bash
git clone https://github.com/yourusername/moody-music-player.git
cd moody-music-player
```

#### **2. Setup Backend**
```bash
cd BackEnd
npm install
# Create a .env file with your credentials:
# PORT=3000
# MONGO_URI=your_mongo_url
# IMAGEKIT_PUBLIC_KEY=your_key
# IMAGEKIT_PRIVATE_KEY=your_key
# IMAGEKIT_URL_ENDPOINT=your_endpoint
npm run dev
```

#### **3. Setup Frontend**
```bash
cd ../FrontEnd
npm install
npm run dev
```

### 🤝 **Contributing**
1. Fork the Project.
2. Create your Feature Branch.
3. Commit your Changes.
4. Push to the Branch.
5. Open a Pull Request.

---
*Created with ❤️ for a more emotional music experience.*
