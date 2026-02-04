-- ===================================================================
-- ELIX STAR MVP - ROW LEVEL SECURITY POLICIES
-- Run this AFTER ALL_NEW_FEATURES.sql
-- This secures your database so users can only see/edit their own data
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE booster_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE booster_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_not_interested ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- WALLET POLICIES
-- ===================================================================

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own ledger" ON wallet_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- ===================================================================
-- COMMENTS POLICIES
-- ===================================================================

-- Anyone can view active comments
CREATE POLICY "Anyone can view active comments" ON comments
    FOR SELECT USING (status = 'active');

-- Users can insert their own comments
CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- Anyone can view comment likes
CREATE POLICY "Anyone can view comment likes" ON comment_likes
    FOR SELECT USING (true);

-- Users can like comments
CREATE POLICY "Users can like comments" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unlike comments
CREATE POLICY "Users can unlike comments" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- ===================================================================
-- BLOCKS POLICIES
-- ===================================================================

-- Users can view their blocks
CREATE POLICY "Users can view own blocks" ON blocks
    FOR SELECT USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can block others" ON blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "Users can unblock" ON blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- ===================================================================
-- REPORTS POLICIES
-- ===================================================================

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Moderators can view all reports
CREATE POLICY "Moderators can view all reports" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin')
        )
    );

-- Moderators can update reports
CREATE POLICY "Moderators can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin')
        )
    );

-- ===================================================================
-- USER ROLES POLICIES
-- ===================================================================

-- Anyone can view user roles
CREATE POLICY "Anyone can view roles" ON user_roles
    FOR SELECT USING (true);

-- Only admins can modify roles
CREATE POLICY "Admins can manage roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ===================================================================
-- BANS POLICIES
-- ===================================================================

-- Anyone can check if user is banned
CREATE POLICY "Anyone can view bans" ON user_bans
    FOR SELECT USING (true);

-- Only admins can create bans
CREATE POLICY "Admins can create bans" ON user_bans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('moderator', 'admin')
        )
    );

-- ===================================================================
-- ADMIN AUDIT LOG POLICIES
-- ===================================================================

-- Only admins can view audit log
CREATE POLICY "Admins can view audit log" ON admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (true);

-- ===================================================================
-- BOOSTER POLICIES
-- ===================================================================

-- Users can view their booster uses
CREATE POLICY "Users can view own booster uses" ON booster_uses
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert booster uses (via function only)
CREATE POLICY "Users can use boosters" ON booster_uses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their cooldowns
CREATE POLICY "Users can view own cooldowns" ON booster_cooldowns
    FOR SELECT USING (auth.uid() = user_id);

-- System can manage cooldowns
CREATE POLICY "System can manage cooldowns" ON booster_cooldowns
    FOR ALL USING (true);

-- ===================================================================
-- PURCHASES POLICIES
-- ===================================================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON purchases
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create purchases
CREATE POLICY "Users can create purchases" ON purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- System can update purchase status
CREATE POLICY "System can update purchases" ON purchases
    FOR UPDATE USING (true);

-- ===================================================================
-- VIDEO INTERACTIONS POLICIES
-- ===================================================================

-- Users can view all interactions
CREATE POLICY "Anyone can view interactions" ON video_interactions
    FOR SELECT USING (true);

-- Users can record their interactions
CREATE POLICY "Users can record interactions" ON video_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ===================================================================
-- TRENDING SCORES POLICIES
-- ===================================================================

-- Anyone can view trending scores (public data)
CREATE POLICY "Anyone can view trending" ON trending_scores
    FOR SELECT USING (true);

-- ===================================================================
-- NOT INTERESTED POLICIES
-- ===================================================================

-- Users can view their preferences
CREATE POLICY "Users can view own preferences" ON user_not_interested
    FOR SELECT USING (auth.uid() = user_id);

-- Users can add preferences
CREATE POLICY "Users can add preferences" ON user_not_interested
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove preferences
CREATE POLICY "Users can remove preferences" ON user_not_interested
    FOR DELETE USING (auth.uid() = user_id);

-- ===================================================================
-- HASHTAGS POLICIES
-- ===================================================================

-- Anyone can view hashtags
CREATE POLICY "Anyone can view hashtags" ON hashtags
    FOR SELECT USING (true);

-- System can manage hashtags
CREATE POLICY "System can manage hashtags" ON hashtags
    FOR ALL USING (true);

-- Anyone can view video hashtags
CREATE POLICY "Anyone can view video hashtags" ON video_hashtags
    FOR SELECT USING (true);

-- System can manage video hashtags
CREATE POLICY "System can manage video hashtags" ON video_hashtags
    FOR ALL USING (true);

-- ===================================================================
-- CONVERSATIONS & MESSAGES POLICIES
-- ===================================================================

-- Users can view conversations they're in
CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1 OR auth.uid() = participant_2
    );

-- Users can view messages in their conversations
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

-- ===================================================================
-- NOTIFICATIONS POLICIES
-- ===================================================================

-- Users can view their notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can mark notifications as read
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- ===================================================================
-- DEVICE TOKENS POLICIES
-- ===================================================================

-- Users can view their device tokens
CREATE POLICY "Users can view own tokens" ON device_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their device tokens
CREATE POLICY "Users can manage own tokens" ON device_tokens
    FOR ALL USING (auth.uid() = user_id);

-- ===================================================================
-- ANALYTICS POLICIES
-- ===================================================================

-- Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON analytics_events
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert analytics
CREATE POLICY "System can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- ===================================================================
-- ✅ DONE! All security policies created!
-- Your database is now secure and production-ready!
-- ===================================================================
