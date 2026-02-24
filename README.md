# 🤖 Web Bot Detection System 🚀  
### AI-Powered Human vs Bot Behavior Analysis

> **Full-Stack Behavior Intelligence System for Real-Time Bot Detection**

---

## 📌 Overview

An AI-powered full-stack web bot detection system that analyzes real user behavior patterns and classifies traffic as **Human** or **Bot** in real time.

The system tracks multiple behavioral signals such as:

- Sessions  
- Click activity  
- Navigation flow  
- Page similarity  
- Timing behavior  

It then feeds these engineered features into a Machine Learning model to predict:

🟢 **Human**  
🔴 **Bot**

All predictions are processed instantly using a **FastAPI backend**.

---

## ✨ Core Features

### 🔍 Behavior Tracking Engine
- Tracks sessions and navigation patterns  
- Computes page similarity & topic diversity  
- Generates structured behavioral features  
- Maintains consistent feature pipeline  
- Logs user activity for analysis  

---

### 🧠 Machine Learning Model
- Trained on engineered behavioral features  
- Uses **Balanced Random Forest**  
- Handles imbalanced Human vs Bot data  
- High-accuracy bot detection  
- Saved & loaded using `joblib`  

---

### 📊 Admin Dashboard
- View all registered users  
- See live prediction status  
- **Analyze** button per user  
- Dedicated analytics page per account  
- Visual behavior insights  

---

### 🚫 Smart Bot Blocking
- If prediction = **BOT** → Block button appears  
- Instantly restrict suspicious accounts  
- Block status stored in database  
- Admin-controlled access management  

---

### 📁 Automatic CSV Logging
- Logs session data automatically  
- Used for:
  - Model training  
  - Debugging  
  - Feature consistency  
- Ensures reproducible ML pipeline  

---

### ⚡ Real-Time Prediction API
- FastAPI backend  
- Receives behavior data  
- Runs ML inference  
- Returns classification instantly  

---

## 🏗️ Tech Stack

### 🧠 Machine Learning
- Python  
- scikit-learn  
- imbalanced-learn  
- pandas  
- numpy  
- joblib  

### 🌐 Backend
- FastAPI  
- Uvicorn  
- Supabase (Database)  
- Python  

### 💻 Frontend
- React  
- Tailwind CSS  
- ReactBits Components  

### ☁️ Deployment
- GitHub  
- Google Drive (Model Storage)  
- Vercel (Frontend)  
- Railway (Backend)

---

## 🎯 Project Goal

Build a scalable AI-driven system that can:

✔ Detect automated traffic  
✔ Protect web applications  
✔ Provide admin-level behavioral insights  
✔ Block malicious bot accounts in real time  

---

## 🚀 Future Improvements
- Live session heatmaps  
- IP reputation scoring  
- Advanced anomaly detection  
- Model auto-retraining pipeline  
- Cloud deployment for scale  

---

## 👨‍💻 Author
**Prince Kumar**  
Full-Stack & ML Developer  

> Building intelligent systems that detect, analyze, and secure web platforms.
