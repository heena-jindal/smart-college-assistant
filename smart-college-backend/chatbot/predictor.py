import pickle
import numpy as np
import os

# Fix: use absolute paths relative to this file's location
_dir = os.path.dirname(os.path.abspath(__file__))

model = pickle.load(open(os.path.join(_dir, "intent_model.pkl"), "rb"))
vectorizer = pickle.load(open(os.path.join(_dir, "vectorizer.pkl"), "rb"))


def predict_intent(text: str) -> tuple[str, float]:
    """Predict the intent of a user message.

    Returns:
        (intent_label, confidence_score)
    """
    text = text.lower().strip()
    X = vectorizer.transform([text])
    probs = model.predict_proba(X)

    confidence = float(np.max(probs))
    intent = model.classes_[np.argmax(probs)]

    return intent, confidence
