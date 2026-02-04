-- Inbox & Direct Messages System

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (participant_1 < participant_2), -- Ensure unique pair
    UNIQUE (participant_1, participant_2)
);

CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1, last_message_at DESC);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2, last_message_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'gif', 'sticker')),
    content TEXT NOT NULL,
    media_url TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);

-- Inbox notifications (likes, comments, follows, etc.)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'gift', 'battle_invite', 'system')),
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT CHECK (target_type IN ('video', 'comment', 'live_stream', 'user')),
    target_id UUID,
    title TEXT NOT NULL,
    body TEXT,
    image_url TEXT,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_actor_id UUID,
    p_target_type TEXT,
    p_target_id UUID,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Don't notify self
    IF p_user_id = p_actor_id THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO notifications (
        user_id, type, actor_id, target_type, target_id, title, body, action_url
    ) VALUES (
        p_user_id, p_type, p_actor_id, p_target_type, p_target_id, p_title, p_body, p_action_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on new like
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
    v_video RECORD;
BEGIN
    SELECT user_id INTO v_video FROM videos WHERE id = NEW.video_id;
    
    PERFORM create_notification(
        v_video.user_id,
        'like',
        NEW.user_id,
        'video',
        NEW.video_id,
        'liked your video'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_like
AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Trigger to create notification on new comment
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_video RECORD;
BEGIN
    SELECT user_id INTO v_video FROM videos WHERE id = NEW.video_id;
    
    PERFORM create_notification(
        v_video.user_id,
        'comment',
        NEW.user_id,
        'video',
        NEW.video_id,
        'commented on your video',
        LEFT(NEW.text, 100)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_comment
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Trigger to create notification on new follow
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_notification(
        NEW.following_id,
        'follow',
        NEW.follower_id,
        'user',
        NEW.follower_id,
        'started following you'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_follow
AFTER INSERT ON followers
FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- Grant permissions
GRANT SELECT, INSERT ON video_interactions TO authenticated;
GRANT SELECT ON trending_scores TO authenticated, anon;
GRANT ALL ON user_not_interested TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
