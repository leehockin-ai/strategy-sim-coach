
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS playbook_pdf_path text,
  ADD COLUMN IF NOT EXISTS playbook_extracted jsonb,
  ADD COLUMN IF NOT EXISTS playbook_application jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('playbooks', 'playbooks', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "playbooks_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'playbooks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "playbooks_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'playbooks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "playbooks_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'playbooks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "playbooks_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'playbooks' AND auth.uid()::text = (storage.foldername(name))[1]);
