🤖 Web Bot Detection System
🚀 AI-Powered Human vs Bot Behavior Analysis
<p align="center"> <b>Full-Stack Behavior Intelligence System for Real-Time Bot Detection</b> </p>
📌 Overview

A full-stack AI-powered web bot detection system that analyzes user behavior patterns such as:

Sessions

Click activity

Navigation flow

Page similarity

Timing behavior

The system uses a Machine Learning model to classify users as:

🟢 Human
🔴 Bot

All predictions happen in real-time using a FastAPI backend.

✨ Core Features
🔍 Behavior Tracking Engine

Tracks sessions & navigation patterns

Computes page similarity & topic diversity

Generates structured behavioral features per user

Maintains consistent feature pipeline

🧠 Machine Learning Model

Trained on engineered behavioral features

Uses Balanced Random Forest

Handles imbalanced bot vs human data

High accuracy bot detection

📊 Admin Dashboard

View all registered users

See live prediction status

"Analyze" button per user

Dedicated analytics page per account

Visual behavior insights

🚫 Smart Bot Blocking

If prediction = BOT
→ Block Button automatically appears

Instantly restrict suspicious accounts

Stored block status in database

📁 Automatic CSV Logging

Logs session data automatically

Used for:

Model training

Debugging

Feature consistency

Ensures reproducible ML pipeline

⚡ Real-Time Prediction API

FastAPI backend

Receives behavior data

Runs model inference

Returns classification instantly

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

Supabase (Database)

Python

💻 Frontend

React

Tailwind CSS

ShadCN UI

ReactBits Components

☁️ Deployment

GitHub

Google Drive (Model Storage)

🔄 System Flow

User Behavior
⬇
Feature Engineering
⬇
Machine Learning Model
⬇
Prediction (Human / Bot)
⬇
Admin Dashboard Action

🎯 Project Goal

To build a scalable, AI-driven system that can:

✔ Detect automated traffic
✔ Protect web applications
✔ Provide admin-level behavioral insights
✔ Block malicious bot accounts in real time
