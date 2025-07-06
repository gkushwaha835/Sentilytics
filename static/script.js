// Global variables
let debounceTimer;
let analysisCount = 0;
let totalWords = 0;

// Create floating particles
function createParticles() {
    const particlesContainer = document.querySelector('.particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        particlesContainer.appendChild(particle);
    }
}

// Update character counter
function updateCharCounter() {
    const textarea = document.getElementById('inputText');
    const charCount = document.getElementById('charCount');
    
    if (textarea && charCount) {
        charCount.textContent = textarea.value.length;
        
        // Change color based on character count
        if (textarea.value.length > 800) {
            charCount.style.color = '#e74c3c';
        } else if (textarea.value.length > 600) {
            charCount.style.color = '#f39c12';
        } else {
            charCount.style.color = 'rgba(255, 255, 255, 0.6)';
        }
    }
}

// Debounced analysis function
function debounceAnalyze() {
    clearTimeout(debounceTimer);
    updateCharCounter();
    
    const input = document.getElementById("inputText").value.trim();
    if (input.length > 3) {
        debounceTimer = setTimeout(analyzeSentiment, 1000);
    }
}

// Main sentiment analysis function
async function analyzeSentiment() {
    const input = document.getElementById("inputText").value.trim();
    const resultDiv = document.getElementById("result");
    const loading = document.getElementById("loading");
    const analyzeBtn = document.querySelector(".analyze-btn");
    
    // Validate input
    if (!input) {
        showError("⚠️ Please enter some text to analyze.");
        return;
    }
    
    if (input.length < 3) {
        showError("⚠️ Please enter at least 3 characters.");
        return;
    }
    
    // Clear previous results and show loading
    resultDiv.innerHTML = "";
    loading.style.display = "block";
    analyzeBtn.disabled = true;
    analyzeBtn.style.opacity = "0.7";

    try {
        // Make API call
        const response = await fetch("/predict", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ text: input })
        });

        const data = await response.json();
        
        // Hide loading
        loading.style.display = "none";
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = "1";

        if (response.ok) {
            // Update counters
            analysisCount++;
            totalWords += input.split(' ').length;
            
            // Display result
            displayResult(data.sentiment, data.confidence, data.word_count || input.split(' ').length);
            
            // Log success
            console.log("Analysis completed:", data);
        } else {
            showError(`❌ Error: ${data.error || 'Unknown error occurred'}`);
        }
    } catch (error) {
        // Hide loading
        loading.style.display = "none";
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = "1";
        
        console.error("API Error:", error);
        
        // Show fallback result for demo purposes
        if (input.length > 0) {
            showFallbackResult(input);
        } else {
            showError(`🚫 Connection Error: Unable to connect to the sentiment analysis service.`);
        }
    }
}

// Display analysis result
function displayResult(sentiment, confidence, wordCount) {
    const resultDiv = document.getElementById("result");
    
    // Get emoji and styling based on sentiment
    const emoji = sentiment === "Positive" ? "😊" : 
                 sentiment === "Negative" ? "😢" : "🙂";
    
    const sentimentClass = sentiment === "Positive" ? "sentiment-positive" : 
                         sentiment === "Negative" ? "sentiment-negative" : "sentiment-neutral";

    // Create result HTML
    resultDiv.innerHTML = `
        <div class="result-card">
            <div class="emoji">${emoji}</div>
            <div class="sentiment-label ${sentimentClass}">${sentiment}</div>
            <div class="confidence-score">Confidence: ${confidence}</div>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">${wordCount}</div>
                    <div class="stat-label">Words</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${analysisCount}</div>
                    <div class="stat-label">Analyzed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${totalWords}</div>
                    <div class="stat-label">Total Words</div>
                </div>
            </div>
        </div>
    `;

    // Animate result appearance
    setTimeout(() => {
        const resultCard = document.querySelector('.result-card');
        if (resultCard) {
            resultCard.classList.add('show');
        }
    }, 100);
}

// Show fallback result when API is unavailable
function showFallbackResult(input) {
    console.log("Showing fallback result for:", input);
    
    // Simple rule-based sentiment analysis for demo
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'best', 'awesome', 'happy', 'joy', 'pleased', 'excited', 'brilliant', 'perfect', 'outstanding'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'sad', 'angry', 'disappointed', 'frustrated', 'annoyed', 'disgusting', 'pathetic', 'useless'];
    
    const textLower = input.toLowerCase();
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
    
    let sentiment, confidence;
    
    if (positiveCount > negativeCount) {
        sentiment = "Positive";
        confidence = Math.min(70 + (positiveCount * 5), 95);
    } else if (negativeCount > positiveCount) {
        sentiment = "Negative";
        confidence = Math.min(70 + (negativeCount * 5), 95);
    } else {
        sentiment = "Neutral";
        confidence = Math.floor(Math.random() * 20) + 60;
    }
    
    // Update counters
    analysisCount++;
    totalWords += input.split(' ').length;
    
    // Display result
    displayResult(sentiment, `${confidence.toFixed(1)}%`, input.split(' ').length);
}

// Show error message
function showError(message) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

// Initialize character counter on input
function initializeCharCounter() {
    const textarea = document.getElementById('inputText');
    if (textarea) {
        textarea.addEventListener('input', updateCharCounter);
        updateCharCounter(); // Initial call
    }
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter or Cmd+Enter to analyze
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            analyzeSentiment();
        }
        
        // Escape to clear
        if (e.key === 'Escape') {
            const textarea = document.getElementById('inputText');
            const resultDiv = document.getElementById('result');
            if (textarea) textarea.value = '';
            if (resultDiv) resultDiv.innerHTML = '';
            updateCharCounter();
        }
    });
}

// Add loading state management
function setLoadingState(isLoading) {
    const loading = document.getElementById("loading");
    const analyzeBtn = document.querySelector(".analyze-btn");
    
    if (isLoading) {
        loading.style.display = "block";
        analyzeBtn.disabled = true;
        analyzeBtn.style.opacity = "0.7";
    } else {
        loading.style.display = "none";
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = "1";
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Sentiment Analyzer initialized");
    
    // Create visual effects
    createParticles();
    
    // Setup functionality
    initializeCharCounter();
    setupKeyboardShortcuts();
    
    // Add helpful tooltip
    const textarea = document.getElementById('inputText');
    if (textarea) {
        textarea.title = "Tip: Use Ctrl+Enter to analyze quickly, or Escape to clear";
    }
    
    // Add smooth scrolling for mobile
    if (window.innerWidth <= 768) {
        document.body.style.scrollBehavior = 'smooth';
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    // Recreate particles on significant resize
    if (Math.abs(window.innerWidth - (window.lastWidth || 0)) > 100) {
        const particlesContainer = document.querySelector('.particles');
        if (particlesContainer) {
            particlesContainer.innerHTML = '';
            createParticles();
        }
        window.lastWidth = window.innerWidth;
    }
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeSentiment,
        debounceAnalyze,
        displayResult,
        showError
    };
}