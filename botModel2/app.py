from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
import os
import gdown

app = FastAPI(title="Bot Detection API")

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Download model if missing, then load ONCE ───────────────────────────────
MODEL_PATH = "bot_detection_model.pkl"
GDRIVE_FILE_ID = "1BEcEzZpb1iJ-mfLCXh8m9mX3bb0T9PqT"   # 🔁 Replace with your actual Google Drive file ID

if not os.path.exists(MODEL_PATH):
    print("📥 Downloading ML model from Google Drive...")
    gdown.download(
        f"https://drive.google.com/uc?id={GDRIVE_FILE_ID}",
        MODEL_PATH,
        quiet=False,
    )
    print("✅ Download complete")

try:
    model = joblib.load(MODEL_PATH)
    print("✅ Model loaded successfully")
except Exception as e:
    raise RuntimeError(f"Failed to load model: {e}")



# ─── Request schema ───────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    total_topics: float
    unique_topics: float
    page_similarity: float
    page_variance: float
    boolean_page_variance: float


# ─── Feature engineering (mirrors main.py add_features) ──────────────────────
def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df["PAGE_SIMILARITY"] = df["UNIQUE_TOPICS"] / (df["TOTAL_TOPICS"] + 1e-5)
    df["INFLATION_RATIO"] = df["PAGE_SIMILARITY"]

    df["VAR_PER_TOPIC"] = df["PAGE_VARIANCE"] / (df["TOTAL_TOPICS"] + 1e-5)
    df["BOOL_PER_TOPIC"] = df["BOOLEAN_PAGE_VARIANCE"] * df["TOTAL_TOPICS"]

    df["LOG_TOTAL"] = np.log1p(df["TOTAL_TOPICS"])
    df["LOG_UNIQUE"] = np.log1p(df["UNIQUE_TOPICS"])

    return df


# ─── Endpoint ─────────────────────────────────────────────────────────────────
@app.post("/predict")
def predict(body: PredictRequest):
    try:
        # Build raw dataframe matching training column names
        df = pd.DataFrame([{
            "TOTAL_TOPICS": body.total_topics,
            "UNIQUE_TOPICS": body.unique_topics,
            "PAGE_VARIANCE": body.page_variance,
            "BOOLEAN_PAGE_VARIANCE": body.boolean_page_variance,
        }])

        # Engineer features
        df = add_features(df)

        # Select exactly the columns the model was trained on (in order)
        features = df[[
            "TOTAL_TOPICS",
            "UNIQUE_TOPICS",
            "PAGE_SIMILARITY",
            "INFLATION_RATIO",
            "VAR_PER_TOPIC",
            "BOOL_PER_TOPIC",
            "PAGE_VARIANCE",
            "BOOLEAN_PAGE_VARIANCE",
            "LOG_TOTAL",
            "LOG_UNIQUE",
        ]]

        pred = model.predict(features)[0]
        proba = model.predict_proba(features)[0]

        # Class 1 = bot, class 0 = human
        label = "bot" if int(pred) == 1 else "human"
        confidence = float(proba[1]) if int(pred) == 1 else float(proba[0])

        return {"prediction": label, "confidence": round(confidence, 4)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def health():
    return {"status": "ok", "service": "bot-detection-api"}
