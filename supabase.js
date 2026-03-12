// =============================================
// YUVATA — Supabase Integration Layer
// Handles: Auth, Database, Session Management
// =============================================

const SUPABASE_URL = 'https://fvuffghgcvvtusrwbdsb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2dWZmZ2hnY3Z2dHVzcndiZHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMTYyMjEsImV4cCI6MjA4ODg5MjIyMX0.Tj8LBjejLMz7UTML4WdaUWSTer5LcATeBT671fHSYbo';

// Initialize Supabase Client
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// AUTH MODULE
// =============================================
const YuvataAuth = {
    currentUser: null,
    currentProfile: null,

    /**
     * Initialize auth — call once on page load.
     * Sets up session + listens for auth state changes.
     */
    async init() {
        try {
            const { data: { session } } = await _supabase.auth.getSession();
            this.currentUser = session?.user || null;

            if (this.currentUser) {
                await this._fetchProfile();
            }

            // Real-time auth listener
            _supabase.auth.onAuthStateChange(async (event, session) => {
                this.currentUser = session?.user || null;

                if (this.currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                    await this._fetchProfile();
                } else if (event === 'SIGNED_OUT') {
                    this.currentProfile = null;
                }

                // Dispatch custom event so UI can react
                document.dispatchEvent(new CustomEvent('yuvata-auth-changed', {
                    detail: { user: this.currentUser, profile: this.currentProfile, event }
                }));
            });

            return this.currentUser;
        } catch (err) {
            console.error('[YuvataAuth] Init failed:', err);
            return null;
        }
    },

    async _fetchProfile() {
        if (!this.currentUser) return;
        const { data } = await _supabase
            .from('profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        this.currentProfile = data;
    },

    /**
     * Sign up with email, password, and display name
     */
    async signUp(email, password, displayName) {
        const { data, error } = await _supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName }
            }
        });
        if (error) throw error;
        return data;
    },

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        const { data, error } = await _supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    /**
     * Sign out
     */
    async signOut() {
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        this.currentUser = null;
        this.currentProfile = null;
    },

    /**
     * Get current user (sync)
     */
    getUser() {
        return this.currentUser;
    },

    /**
     * Get display name from profile or user metadata
     */
    getDisplayName() {
        if (this.currentProfile?.display_name) return this.currentProfile.display_name;
        if (this.currentUser?.user_metadata?.display_name) return this.currentUser.user_metadata.display_name;
        if (this.currentUser?.email) return this.currentUser.email.split('@')[0];
        return 'User';
    },

    /**
     * Get user initials for avatar
     */
    getInitials() {
        const name = this.getDisplayName();
        return name.charAt(0).toUpperCase();
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.currentUser;
    }
};

// =============================================
// DATABASE MODULE
// =============================================
const YuvataDB = {
    _currentAssessmentId: null,

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    /**
     * Save a completed assessment to Supabase
     */
    async saveAssessment({ sessionId, selectedSkills, questions, answers, scores, overallScore, literacyLevel, isWeeklyChallenge = false, roadmap = [] }) {
        if (!YuvataAuth.isLoggedIn()) return null;

        try {
            const { data, error } = await _supabase
                .from('assessments')
                .insert({
                    user_id: YuvataAuth.getUser().id,
                    session_id: sessionId,
                    selected_skills: selectedSkills,
                    questions: questions,
                    answers: answers,
                    scores: scores,
                    overall_score: overallScore,
                    literacy_level: literacyLevel,
                    is_weekly_challenge: isWeeklyChallenge,
                    roadmap: roadmap
                })
                .select()
                .single();

            if (error) {
                console.error('[YuvataDB] Save assessment error:', error);
                return null;
            }

            this._currentAssessmentId = data.id;
            console.log('[YuvataDB] Assessment saved:', data.id);
            return data;
        } catch (err) {
            console.error('[YuvataDB] Save assessment exception:', err);
            return null;
        }
    },

    /**
     * Get all assessments for the current user (newest first)
     */
    async getAssessments() {
        if (!YuvataAuth.isLoggedIn()) return [];

        try {
            const { data, error } = await _supabase
                .from('assessments')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('[YuvataDB] Get assessments error:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('[YuvataDB] Get assessments exception:', err);
            return [];
        }
    },

    /**
     * Save a chat message
     */
    async saveChatMessage(role, message) {
        if (!YuvataAuth.isLoggedIn() || !this._currentAssessmentId) return null;

        try {
            const { data, error } = await _supabase
                .from('chat_history')
                .insert({
                    user_id: YuvataAuth.getUser().id,
                    assessment_id: this._currentAssessmentId,
                    role,
                    message
                })
                .select()
                .single();

            if (error) {
                console.error('[YuvataDB] Save chat error:', error);
                return null;
            }
            return data;
        } catch (err) {
            console.error('[YuvataDB] Save chat exception:', err);
            return null;
        }
    },

    /**
     * Get chat history for an assessment
     */
    async getChatHistory(assessmentId) {
        if (!YuvataAuth.isLoggedIn()) return [];

        try {
            const { data, error } = await _supabase
                .from('chat_history')
                .select('*')
                .eq('assessment_id', assessmentId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[YuvataDB] Get chat error:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('[YuvataDB] Get chat exception:', err);
            return [];
        }
    },

    /**
     * Get the current assessment ID (set after saving)
     */
    getCurrentAssessmentId() {
        return this._currentAssessmentId;
    },

    /**
     * Update the roadmap array (for checking off completed items)
     */
    async updateRoadmap(assessmentId, updatedRoadmap) {
        if (!YuvataAuth.isLoggedIn()) return false;
        try {
            const { error } = await _supabase
                .from('assessments')
                .update({ roadmap: updatedRoadmap })
                .eq('id', assessmentId);
            if (error) {
                console.error('[YuvataDB] Roadmap update error:', error);
                return false;
            }
            return true;
        } catch(err) {
            console.error('[YuvataDB] Roadmap update exception:', err);
            return false;
        }
    },

    /**
     * Fetch Top 10 Weekly Challenge Scores for Leaderboard
     */
    async getLeaderboard() {
        try {
            const { data, error } = await _supabase
                .from('assessments')
                .select(`
                    id, 
                    overall_score, 
                    created_at, 
                    profiles ( display_name )
                `)
                .eq('is_weekly_challenge', true)
                .order('overall_score', { ascending: false })
                .limit(10);
                
            if (error) {
                console.error('[YuvataDB] Leaderboard fetch error:', error);
                return [];
            }
            return data || [];
        } catch (err) {
            console.error('[YuvataDB] Leaderboard fetch exception:', err);
            return [];
        }
    },

    // =========================================
    // --- MULTIPLAYER SQUAD MODE LOGIC ---
    // =========================================

    /**
     * Creates a new Squad Room (Async Multiplayer)
     */
    async createSquadRoom(scenarioType, mysteryData) {
        if (!YuvataAuth.isLoggedIn()) {
            throw new Error("Must be logged in to create a Squad Room.");
        }

        // Generate a random 6-character room code
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            const { data, error } = await _supabase
                .from('squad_rooms')
                .insert({
                    host_id: YuvataAuth.getUser().id,
                    room_code: roomCode,
                    scenario_type: scenarioType,
                    mystery_data: mysteryData,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[YuvataDB] Create squad exception:', err);
            throw err;
        }
    },

    /**
     * Fetches a Squad Room by its 6-character code
     */
    async getSquadRoomByCode(code) {
        try {
            const { data, error } = await _supabase
                .from('squad_rooms')
                .select('*, profiles(display_name)')
                .eq('room_code', code.toUpperCase())
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[YuvataDB] Get squad exception:', err);
            return null; // Room not found
        }
    },

    /**
     * Submits a user's vote to a specific Squad Room
     */
    async submitSquadVote(roomId, voteDecision, userId, displayName) {
        try {
            // First fetch the current room to append the vote safely
            const { data: room, error: fetchErr } = await _supabase
                .from('squad_rooms')
                .select('votes')
                .eq('id', roomId)
                .single();

            if (fetchErr) throw fetchErr;

            const currentVotes = room.votes || [];
            
            // Avoid duplicate voting
            const existingVoteIdx = currentVotes.findIndex(v => v.userId === userId);
            if (existingVoteIdx > -1) {
                currentVotes[existingVoteIdx].decision = voteDecision; // Update vote
            } else {
                currentVotes.push({ userId, displayName, decision: voteDecision, timestamp: new Date().toISOString() });
            }

            // Update the record with new votes
            const { data, error } = await _supabase
                .from('squad_rooms')
                .update({ votes: currentVotes })
                .eq('id', roomId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[YuvataDB] Submit vote exception:', err);
            throw err;
        }
    }

}; // end YuvataDB
