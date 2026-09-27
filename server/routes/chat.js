/**
 * NaviX Chat API - POST /api/chat
 * AI-powered route assistant using Groq (LLaMA)
 * Provides safety insights, tips, and answers about the active route
 */

const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

const NAVIX_SYSTEM_PROMPT = `You are NaviX, a friendly and concise AI travel safety assistant.
You help users understand their route, safety waypoints, and nearby emergency services.

RULES:
- Keep responses SHORT (2-4 sentences max unless user asks for detail)
- Be warm and helpful, use emojis sparingly (1-2 per message)
- Focus on safety, route info, and practical travel advice for India
- If asked about something unrelated to travel/safety, politely redirect
- Reference specific waypoints, distances, and landmarks when available
- Provide actionable safety tips relevant to the route`;

/**
 * POST /api/chat
 * Body: { message: string, routeContext: object, history: array }
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, routeContext, history } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        // Build route context string
        let contextMsg = '';
        if (routeContext) {
            const { startName, endName, distance, duration, waypoints, hospitals, police } = routeContext;
            contextMsg = `\n\nACTIVE ROUTE CONTEXT:
- Route: ${startName || 'Start'} → ${endName || 'Destination'}
- Distance: ${distance ? (distance / 1000).toFixed(1) + ' km' : 'Unknown'}
- Duration: ${duration ? Math.round(duration / 60) + ' min' : 'Unknown'}`;

            if (waypoints && waypoints.length > 0) {
                contextMsg += `\n- Safe Waypoints (${waypoints.length}):`;
                waypoints.forEach((wp, i) => {
                    contextMsg += `\n  ${i + 1}. ${wp.name || 'Waypoint'} (Safety: ${wp.safetyScore || 'N/A'}) - ${wp.reason || ''}`;
                });
            }

            if (hospitals && hospitals.length > 0) {
                contextMsg += `\n- Nearby Hospitals: ${hospitals.slice(0, 5).map(h => h.name).join(', ')}`;
            }
            if (police && police.length > 0) {
                contextMsg += `\n- Nearby Police: ${police.slice(0, 5).map(p => p.name).join(', ')}`;
            }
        }

        // Build messages array
        const messages = [
            { role: 'system', content: NAVIX_SYSTEM_PROMPT + contextMsg },
        ];

        // Add conversation history (last 10 messages to save tokens)
        if (history && Array.isArray(history)) {
            const trimmed = history.slice(-10);
            messages.push(...trimmed);
        }

        // Add current user message
        messages.push({ role: 'user', content: message });

        const completion = await openai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages,
            temperature: 0.7,
            max_tokens: 300,
        });

        const reply = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

        res.json({ reply });
    } catch (err) {
        console.error('❌ NaviX Chat error:', err.message);

        if (err.status === 429) {
            return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
        }

        res.status(500).json({
            error: err.message || 'Chat failed. Please try again.',
        });
    }
});

module.exports = router;
