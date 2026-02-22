import os
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report

from imblearn.ensemble import BalancedRandomForestClassifier

MODEL_FILE = "bot_detection_model.pkl"


# =========================
# FEATURE ENGINEERING FUNC
# =========================
def add_features(df):
    df["PAGE_SIMILARITY"] = df["UNIQUE_TOPICS"] / (df["TOTAL_TOPICS"] + 1e-5)
    df["INFLATION_RATIO"] = df["PAGE_SIMILARITY"]

    # strong signals for soft bots
    df["VAR_PER_TOPIC"] = df["PAGE_VARIANCE"] / (df["TOTAL_TOPICS"] + 1e-5)
    df["BOOL_PER_TOPIC"] = df["BOOLEAN_PAGE_VARIANCE"] * df["TOTAL_TOPICS"]

    df["LOG_TOTAL"] = np.log1p(df["TOTAL_TOPICS"])
    df["LOG_UNIQUE"] = np.log1p(df["UNIQUE_TOPICS"])

    return df


# =========================
# TRAIN MODEL IF NOT EXISTS
# =========================
if not os.path.exists(MODEL_FILE):

    print("Training model...\n")

    # ---- original dataset ----
    df = pd.read_csv("semantic_features.csv")

    df = df[
        [
            "TOTAL_TOPICS",
            "UNIQUE_TOPICS",
            "PAGE_VARIANCE",
            "BOOLEAN_PAGE_VARIANCE",
            "ROBOT",
        ]
    ]

    df = df.drop_duplicates().dropna()

    # =========================
    # LOAD REAL BOT DATA
    # =========================
    # create file real_bot_samples.csv with your 10 rows
    # (no ROBOT column needed)
    if os.path.exists("real_bot_samples.csv"):
        real_bots = pd.read_csv("real_bot_samples.csv")

        real_bots["ROBOT"] = 1

        # 🔥 BOOST THEM (important since only 10 rows)
        real_bots = pd.concat([real_bots] * 8, ignore_index=True)

        df = pd.concat([df, real_bots], ignore_index=True)
        print("Added real bot samples to training")

    # =========================
    # FEATURES
    # =========================
    df = add_features(df)

    X = df[
        [
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
        ]
    ]

    y = df["ROBOT"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    num_cols = X.columns.tolist()

    preprocess = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                num_cols,
            )
        ]
    )

    model = BalancedRandomForestClassifier(
        n_estimators=1400,
        max_depth=22,
        min_samples_leaf=1,
        sampling_strategy=0.9,
        replacement=True,
        bootstrap=True,
        random_state=42,
        n_jobs=-1,
    )

    pipe = Pipeline(
        [
            ("preprocess", preprocess),
            ("model", model),
        ]
    )

    pipe.fit(X_train, y_train)

    pred = pipe.predict(X_test)
    print("\nClassification Report:\n")
    print(classification_report(y_test, pred))

    joblib.dump(pipe, MODEL_FILE)
    print("\n✅ Model trained & saved as bot_detection_model.pkl")


# =========================
# PREDICTION MODE
# =========================
else:
    print("Model loaded.\n")

    pipe = joblib.load(MODEL_FILE)

    print("Enter user metrics:\n")

    total_topics = float(input("TOTAL_TOPICS: "))
    unique_topics = float(input("UNIQUE_TOPICS: "))
    page_variance = float(input("PAGE_VARIANCE: "))
    boolean_var = float(input("BOOLEAN_PAGE_VARIANCE: "))

    df = pd.DataFrame(
        [
            {
                "TOTAL_TOPICS": total_topics,
                "UNIQUE_TOPICS": unique_topics,
                "PAGE_VARIANCE": page_variance,
                "BOOLEAN_PAGE_VARIANCE": boolean_var,
            }
        ]
    )

    df = add_features(df)

    pred = pipe.predict(df)[0]
    prob = pipe.predict_proba(df)[0]

    print("\nPrediction:", "BOT" if pred == 1 else "HUMAN")
    print("Confidence:", prob)