# 🛡️ Othenticator - TOTP Authenticator App

Othenticator is a Two-Factor Authentication (2FA) system using TOTP (Time-based One-Time Password), similar to AWS or GitHub's 2FA flow. Users can log in, then scan a QR code to register the app in Google Authenticator or similar, and verify using a generated code.
built with:

- 🔧 **Backend:** Node.js, Express, MongoDB
- 🎨 **Frontend:** React (Vite), Tailwind CSS

## 📁 Project Structure

Othenticator/
│
├── authenticator-backend/ # Backend logic (Express.js)
│ ├── config/
│ ├── controllers/
│ ├── middlewares/
│ ├── routes/
│ ├── utils/
│ ├── server.js
│ └── .env
│
├── authenticator-frontend/ # Frontend (React + Vite)
│ ├── src/
│ ├── index.html
│ ├── vite.config.js
│ └── tailwind.config.js
│
├── start-backend.bat
├── start-server.bat
└── README.md

## 🚀 Features
- Time-based One-Time Password (TOTP) generation
- User authentication and validation
- Frontend OTP display and verification
- Responsive UI with Tailwind CSS
- MongoDB integration for user & OTP data

## 🖥️ Development Tools
Frontend: React (Vite), Tailwind CSS, Axios
Backend: Express.js, Node.js, MongoDB (Mongoose)
Dev Tools: VS Code, Git, GitHub