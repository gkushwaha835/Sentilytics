from flask import Flask, render_template, request, jsonify
import pickle
import numpy as np
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
import os
from datetime import datetime
import logging

# Initialize Flask app
app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for model and vectorizer
model = None
vectorizer = None
stop_words = None
stemmer = None

def initialize_nltk():
    """Initialize NLTK components"""
    global stop_words, stemmer
    try:
        # Download stopwords if not present
        nltk.download('stopwords', quiet=True)
        stop_words = set(stopwords.words('english'))
        stemmer = PorterStemmer()
        logger.info("NLTK components initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing NLTK: {e}")
        # Fallback to basic stopwords if NLTK fails
        stop_words = set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
        stemmer = PorterStemmer()

def load_models():
    """Load the trained model and vectorizer"""
    global model, vectorizer
    try:
        # Check if model files exist
        model_path = "model/sentiment_model.pkl"
        vectorizer_path = "model/tfidf_vectorizer.pkl"
        
        if os.path.exists(model_path) and os.path.exists(vectorizer_path):
            model = pickle.load(open(model_path, "rb"))
            vectorizer = pickle.load(open(vectorizer_path, "rb"))
            logger.info("Models loaded successfully")
        else:
            logger.warning("Model files not found. Using mock predictions.")
            model = None
            vectorizer = None
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        model = None
        vectorizer = None

# Label mapping
label_map = {-1: "Negative", 0: "Neutral", 1: "Positive"}

def preprocess_text(text):
    """Preprocess text for sentiment analysis"""
    if not text:
        return ""
    
    try:
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r"http\S+|www\S+|https\S+", '', text)
        
        # Remove special characters and digits
        text = re.sub(r'[^a-z\s]', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Tokenize, remove stopwords, and stem
        if stop_words and stemmer:
            words = text.split()
            processed_words = [stemmer.stem(word) for word in words if word not in stop_words and len(word) > 1]
            text = " ".join(processed_words)
        
        return text
    except Exception as e:
        logger.error(f"Error preprocessing text: {e}")
        return text.lower()

def mock_prediction(text):
    """Generate mock predictions when model is not available"""
    # Simple rule-based mock prediction
    positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'awesome', 'happy', 'joy', 'pleased', 'excited']
    negative_words = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'sad', 'angry', 'disappointed', 'frustrated', 'annoyed']
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        return "Positive", np.random.uniform(0.7, 0.95)
    elif negative_count > positive_count:
        return "Negative", np.random.uniform(0.7, 0.95)
    else:
        return "Neutral", np.random.uniform(0.6, 0.8)

@app.route("/")
def home():
    """Render the main page"""
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    """Handle sentiment prediction requests"""
    try:
        # Get JSON data
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        raw_text = data.get("text", "").strip()
        
        # Validate input
        if not raw_text:
            return jsonify({"error": "Input text is empty"}), 400
        
        if len(raw_text) > 1000:
            return jsonify({"error": "Input text is too long (maximum 1000 characters)"}), 400
        
        # Log the request
        logger.info(f"Prediction request received for text: {raw_text[:50]}...")
        
        # Check if models are loaded
        if model is None or vectorizer is None:
            logger.warning("Models not available, using mock prediction")
            sentiment, confidence = mock_prediction(raw_text)
            confidence_pct = f"{confidence * 100:.1f}%"
        else:
            # Preprocess the input
            clean_text = preprocess_text(raw_text)
            
            if not clean_text:
                return jsonify({"error": "Text contains no meaningful content after preprocessing"}), 400
            
            # Vectorize the text
            vec = vectorizer.transform([clean_text]).toarray()
            
            # Make prediction
            prediction = model.predict(vec)[0]
            sentiment = label_map.get(prediction, "Unknown")
            
            # Get confidence score
            try:
                probabilities = model.predict_proba(vec)[0]
                confidence = np.max(probabilities)
                confidence_pct = f"{confidence * 100:.1f}%"
            except AttributeError:
                # If model doesn't support predict_proba
                confidence_pct = "N/A"
        
        # Prepare response
        response = {
            "sentiment": sentiment,
            "confidence": confidence_pct,
            "timestamp": datetime.now().isoformat(),
            "text_length": len(raw_text),
            "word_count": len(raw_text.split())
        }
        
        logger.info(f"Prediction completed: {sentiment} with confidence {confidence_pct}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        return jsonify({"error": "Internal server error occurred"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model is not None,
        "vectorizer_loaded": vectorizer is not None
    })

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    # Initialize components when the app starts
    logger.info("Initializing application...")
    initialize_nltk()
    load_models()
    logger.info("Application initialized successfully")
    
    # Run the app
    app.run(debug=True, host="0.0.0.0", port=5000)
else:
    # Initialize components when imported as a module
    initialize_nltk()
    load_models()