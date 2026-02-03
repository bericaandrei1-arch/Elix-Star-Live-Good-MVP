# AI_INSTRUCTIONS.md 
 
 ## PURPOSE 
 
 This file is the **single source of truth** for any AI coding assistant (ChatGPT, Trae, Cursor, Windsurf, etc.). 
 Its goal is to prevent regressions, protect MVP stability, and ensure Apple App Store compliance. 
 
 If there is **any conflict** between AI suggestions and this file → **THIS FILE WINS**. 
 
 --- 
 
 ## 🚨 CRITICAL GLOBAL RULES (NON‑NEGOTIABLE) 
 
 1. **NU STRICA CE EXISTĂ** 
 
    * Never remove or rewrite working code. 
    * Never refactor for style, cleanliness, or preference without explicit approval. 
    * If change is needed → **PROPOSE FIRST, CODE SECOND**. 
 
 2. **NO INVISIBLE / FAKE UI** 
 
    * No invisible overlays. 
    * No fake buttons. 
    * Every interactive UI element must be real, clickable code. 
 
 3. **NO BRAND / PLATFORM REFERENCES** 
 
    * ❌ No TikTok references (names, metaphors, comparisons). 
    * ❌ No copyrighted brand language. 
 
 4. **MVP STABILITY OVER IMPROVEMENT** 
 
    * Stability > performance > elegance. 
    * If unsure → do nothing and ask. 
 
 --- 
 
 ## 🧱 ARCHITECTURE – DO NOT BREAK 
 
 ### Backend & Data 
 
 * **Supabase is the primary backend** 
 * **Mock fallback data EXISTS ON PURPOSE** 
 
   * Used for offline/dev/failure states 
   * ❌ NEVER delete mock data 
   * ❌ NEVER replace mock with live-only logic 
 
 ### State Management 
 
 * **Zustand ONLY** 
 * ❌ No Redux 
 * ❌ No React Context for global state 
 * ❌ No new state libraries 
 
 ### API Rules 
 
 * API failures must gracefully fall back to mock data 
 * No hard dependency on network availability 
 
 --- 
 
 ## 🔌 MCP / TRAE / INSFORGE (IMPORTANT) 
 
 ### MCP Usage 
 
 * MCP is used via **Trae Extension** 
 * MCP server runs locally using: 
 
   ```bash 
   npx -y @insforge/mcp@latest 
   ``` 
 
 ### API_BASE_URL RULES 
 
 * **API_BASE_URL MUST be a REAL deployed URL** 
 * For DigitalOcean App Platform, format is: 
 
   ``` 
   https://<app-name>.ondigitalocean.app 
   ``` 
 
 ❌ NEVER use: 
 
 * *.insforge.app (placeholders) 
 * guessed domains 
 
 ### ENV RULES 
 
 * No hardcoding secrets 
 * API keys only via env 
 * Do NOT rename env variables 
 
 --- 
 
 ## 🍎 APPLE APP STORE – MUST HAVES (NON‑OPTIONAL) 
 
 These features **MUST exist and remain visible**: 
 
 1. **User Moderation** 
 
    * Report user 
    * Block user 
 
 2. **Account Control** 
 
    * Delete Account (self‑service) 
    * Logout 
 
 3. **Transparency** 
 
    * Clear UI access (not hidden in gestures) 
    * No dark patterns 
 
 ❌ Do NOT remove, hide, or downplay these features. 
 
 --- 
 
 ## 🎯 MVP vs POST‑MVP SCOPE 
 
 ### ✅ MVP (DO NOT REMOVE / DO NOT RISK) 
 
 * Authentication 
 * Wallet / coins logic 
 * Live / battle core flow 
 * Moderation (Report / Block) 
 * Delete Account 
 * Supabase + Mock fallback 
 
 ### ⏭️ POST‑MVP (SAFE TO ITERATE LATER) 
 
 * AI auto‑moderation 
 * Advanced battle mechanics 
 * Cosmetic effects 
 * Performance optimizations 
 
 AI must **never promote Post‑MVP features into MVP without approval**. 
 
 --- 
 
 ## 🤖 AI FEATURES – SAFE USAGE ONLY 
 
 If adding AI features: 
 
 * Focus on **safety & moderation**, not novelty 
 * Recommended: 
 
   * OpenAI Moderation API 
   * Azure Content Safety 
 
 ❌ No generative AI that: 
 
 * Alters user content without consent 
 * Appears deceptive to users 
 
 --- 
 
 ## 🛠️ TROUBLESHOOTING NOTES (DO NOT IGNORE) 
 
 * `ENOTFOUND` errors usually mean **wrong API_BASE_URL** 
 * If API fails → fallback to mock data 
 * Never “fix” by deleting fallback logic 
 
 --- 
 
 ## 🧠 FINAL AI BEHAVIOR RULE 
 
 If unsure: 
 
 1. STOP 
 2. ASK 
 3. DO NOTHING 
 
 Silence is better than breaking production. 
 
 --- 
 
 **End of AI_INSTRUCTIONS.md**
