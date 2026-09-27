/**
 * FeedbackForm Component
 * Premium star rating UI with progress indicator, route info summary,
 * and polished visual design.
 */

import { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://navix-backend-uly4.onrender.com/api';

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
const ratingColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

export default function FeedbackForm({ onDone, routeData }) {
    const [ratings, setRatings] = useState({
        safety: 0, condition: 0, accessibility: 0, websiteRating: 0
    });
    const [hoveredRatings, setHoveredRatings] = useState({
        safety: 0, condition: 0, accessibility: 0, websiteRating: 0
    });
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleRating = (category, value) => {
        setRatings({ ...ratings, [category]: value });
    };

    const handleHover = (category, value) => {
        setHoveredRatings({ ...hoveredRatings, [category]: value });
    };

    const filledCount = Object.values(ratings).filter(v => v > 0).length;
    const totalCategories = 4;
    const progressPercent = (filledCount / totalCategories) * 100;
    const isSubmitDisabled = filledCount < totalCategories;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitDisabled || submitting) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem('navix_token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post(`${API_URL}/feedback`, {
                safety: ratings.safety,
                condition: ratings.condition,
                accessibility: ratings.accessibility,
                websiteRating: ratings.websiteRating,
                comments: feedback,
                startName: routeData?.startName || '',
                startCoords: routeData?.startCoords || null,
                endName: routeData?.endName || '',
                endCoords: routeData?.endCoords || null,
            }, { headers });
        } catch (err) {
            console.error('Failed to save feedback:', err);
        }

        setSubmitting(false);
        setSubmitted(true);

        if (onDone) {
            setTimeout(() => onDone(), 3000);
        } else {
            setTimeout(() => {
                setSubmitted(false);
                setRatings({ safety: 0, condition: 0, accessibility: 0, websiteRating: 0 });
                setFeedback('');
            }, 4000);
        }
    };

    if (submitted) {
        return (
            <div className="fb-card">
                <div className="fb-success">
                    <div className="fb-success-check">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="22" stroke="#10b981" strokeWidth="3" fill="rgba(16,185,129,0.1)" />
                            <path d="M14 24L21 31L34 18" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="fb-success-title">Thank you!</div>
                    <div className="fb-success-sub">Your feedback helps make NaviX better for everyone</div>
                    <div className="fb-success-closing">Closing in a moment...</div>
                </div>
            </div>
        );
    }

    const renderStars = (category, label, emoji) => {
        const active = hoveredRatings[category] || ratings[category];
        const badgeColor = active > 0 ? ratingColors[active] : null;
        return (
            <div className={`fb-rating-row ${ratings[category] > 0 ? 'fb-row-done' : ''}`}>
                <div className="fb-rating-header">
                    <span className="fb-rating-emoji">{emoji}</span>
                    <span className="fb-rating-label">{label}</span>
                    {active > 0 && (
                        <span className="fb-rating-badge fb-badge-active" style={{ color: badgeColor, borderColor: `${badgeColor}44` }}>
                            {ratingLabels[active]}
                        </span>
                    )}
                </div>
                <div className="fb-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={`${category}-${star}`}
                            type="button"
                            className={`fb-star ${star <= active ? 'fb-star-lit' : ''}`}
                            onClick={() => handleRating(category, star)}
                            onMouseEnter={() => handleHover(category, star)}
                            onMouseLeave={() => handleHover(category, 0)}
                            aria-label={`Rate ${label} ${star} stars`}
                        >
                            ★
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fb-card">
            {/* Progress Bar */}
            <div className="fb-progress-wrap">
                <div className="fb-progress-bar">
                    <div className="fb-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <span className="fb-progress-text">{filledCount}/{totalCategories} rated</span>
            </div>

            <form onSubmit={handleSubmit} className="fb-form">
                {/* Route Ratings */}
                <div className="fb-section">
                    <div className="fb-section-label">🛣️ Route Experience</div>
                    <div className="fb-ratings">
                        {renderStars('safety', 'Safety Level', '🛡️')}
                        {renderStars('condition', 'Road Condition', '🚧')}
                        {renderStars('accessibility', 'Accessibility', '♿')}
                    </div>
                </div>

                <div className="fb-divider"></div>

                {/* Website Rating */}
                <div className="fb-section">
                    <div className="fb-section-label">💻 App Experience</div>
                    <div className="fb-ratings">
                        {renderStars('websiteRating', 'Rate NaviX', '⭐')}
                    </div>
                </div>

                <div className="fb-divider"></div>

                {/* Comments */}
                <div className="fb-textarea-group">
                    <label htmlFor="feedback" className="fb-textarea-label">
                        💭 Comments <span className="fb-optional">(optional)</span>
                    </label>
                    <textarea
                        id="feedback"
                        className="fb-textarea"
                        placeholder="What went well? What could be improved?"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                    />
                </div>

                <button type="submit" className="fb-submit" disabled={isSubmitDisabled || submitting}>
                    {submitting
                        ? '⏳ Submitting...'
                        : isSubmitDisabled
                            ? `Rate ${totalCategories - filledCount} more to submit`
                            : '✅ Submit Feedback'}
                </button>
            </form>
        </div>
    );
}
