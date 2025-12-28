-- Migration 010: Read Receipts

CREATE TABLE IF NOT EXISTS public.message_reads (
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view read receipts for chats they are members of
CREATE POLICY "Users can view read receipts in their chats" 
ON public.message_reads FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.chat_members cm 
        WHERE cm.chat_id = message_reads.chat_id 
        AND cm.user_id = auth.uid()
    )
);

-- 2. Users can insert/update their own read receipt
CREATE POLICY "Users can update their own read receipt" 
ON public.message_reads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read receipt update" 
ON public.message_reads FOR UPDATE
USING (auth.uid() = user_id);
