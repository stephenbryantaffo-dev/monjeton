
-- Trigger-only functions: revoke from authenticated (only the trigger system / service role needs them)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_wallets() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_tontine_member_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_conversation_last_message() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_workspace_general_chat() FROM authenticated;
