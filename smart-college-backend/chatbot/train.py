"""
train.py — Retrain chatbot with Random Forest for better accuracy
Run: py -3.12 train.py
"""

import pandas as pd
import numpy as np
import pickle
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
_dir = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(_dir, "college_dataset.csv")

# ── Load dataset ──────────────────────────────────────────────
df = pd.read_csv(CSV_PATH, sep=",", on_bad_lines='skip', engine='python')
df.columns = ["text", "intent"]
df = df.dropna(subset=["text","intent"])
df = df[df["text"].str.strip() != ""]
df = df[df["intent"].str.strip() != ""]
df["text"] = df["text"].str.lower().str.strip()
df["intent"] = df["intent"].str.strip()

print(f"✅ Loaded {len(df)} rows with {df['intent'].nunique()} intents")
print(f"   Intents: {sorted(df['intent'].unique())}")

# ── Split data ─────────────────────────────────────────────────
X = df["text"].values
y = df["intent"].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n📊 Train: {len(X_train)} | Test: {len(X_test)}")

# ── TF-IDF Vectorizer ──────────────────────────────────────────
vectorizer = TfidfVectorizer(
    ngram_range=(1, 3),        # unigrams, bigrams, trigrams
    max_features=5000,
    sublinear_tf=True,
    min_df=1,
    analyzer="word",
    token_pattern=r'\b\w+\b'
)

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

# ── Random Forest Model ────────────────────────────────────────
svm = SVC(kernel="linear", C=1.0, probability=True, random_state=42)
rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
lr = LogisticRegression(max_iter=1000, random_state=42, C=1.0)

model = VotingClassifier(
    estimators=[("svm", svm), ("rf", rf), ("lr", lr)],
    voting="soft"
)

model.fit(X_train_vec, y_train)  # ← make sure this line exists

# ── Evaluate ───────────────────────────────────────────────────
y_pred = model.predict(X_test_vec)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n✅ Accuracy: {accuracy * 100:.2f}%")
print("\n📋 Classification Report:")
print(classification_report(y_test, y_pred))

# ── Test predictions ───────────────────────────────────────────
test_queries = [
    "what is the fee structure",
    "how to apply for admission",
    "attendance kam hai meri",
    "placement ke liye kya chahiye",
    "library card kaise banaye",
    "scholarship form kaha se milega",
    "hostel mein kya facilities hai",
    "exam schedule kab aayega",
    "certificate kaise milega",
    "timetable kab aayega"
]

print("\n🧪 Sample Predictions:")
for query in test_queries:
    vec = vectorizer.transform([query.lower()])
    probs = model.predict_proba(vec)
    confidence = float(np.max(probs))
    intent = model.classes_[np.argmax(probs)]
    print(f"   '{query}' → {intent} ({confidence*100:.1f}%)")

# ── Save model ─────────────────────────────────────────────────
model_path = os.path.join(_dir, "intent_model.pkl")
vec_path = os.path.join(_dir, "vectorizer.pkl")

with open(model_path, "wb") as f:
    pickle.dump(model, f)
with open(vec_path, "wb") as f:
    pickle.dump(vectorizer, f)

print(f"\n💾 Model saved to: {model_path}")
print(f"💾 Vectorizer saved to: {vec_path}")
print("\n🚀 Chatbot retrained successfully with Voting Classifier!")
