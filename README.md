🤖 Web Bot Detection System
🚀 AI-Powered Human vs Bot Behavior Analysis

A full-stack web bot detection system that analyzes user behavior (sessions, clicks, navigation patterns, timing, etc.) and uses a machine learning model to classify whether a user is a Human or a Bot in real time.

Built with FastAPI + ML + Web Dashboard, this project helps detect suspicious automated traffic and provides admin tools to analyze and block bots.

✨ Features

🔍 Behavior Tracking

Tracks sessions, topics, page similarity, navigation patterns

Generates structured behavioral data per user

🧠 Machine Learning Model

Trained on behavioral features

Detects bots with high accuracy

Balanced Random Forest model

📊 Admin Dashboard

View all users

See bot prediction status

Click Analyze button per user

Detailed behavior analytics page

🚫 Block Bot Accounts

If prediction = BOT → show Block Button

Instantly block suspicious accounts

📁 Automatic CSV Logging

Stores session data

Used for training + debugging

Ensures consistent feature pipeline

⚡ Real-Time Prediction API

FastAPI backend

Sends user behavior → model → returns prediction

🏗️ Tech Stack
🧠 Machine Learning

Python

scikit-learn

imbalanced-learn

pandas

numpy

joblib

🌐 Backend

FastAPI

Uvicorn

Supabase (DB)

Python

💻 Frontend

React

Tailwind CSS

ShadCN UI

ReactBits components

☁️ Deployment

GitHub

Google Drive (model storage)