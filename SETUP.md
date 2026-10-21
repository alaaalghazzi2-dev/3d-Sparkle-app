# Sparkle accounts — deployment gate

Provider: Supabase Free (PostgreSQL + Auth). Never reuse another application's production database.

1. Create a free Supabase project owned by the user.
2. Apply `supabase/migrations/001_accounts.sql` once using the migration tool. It creates profiles, separate administrator membership, messages, orders and row-level policies. No service-role key is needed by this app.
3. In Vercel set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (publishable or legacy anon key only). Never set a service_role / secret key as the publishable key.
4. Supabase Auth: site URL `https://sparkle3d.vercel.app`, allowed redirect `https://sparkle3d.vercel.app/account.html`; keep email confirmation enabled and password minimum 10. Configure an owned email delivery provider for public signups; Supabase's default test mail service may limit recipient addresses. Verify delivery before opening registration publicly.
5. User registers their own administrator account, verifies email. Promote only the exact user-confirmed email/UUID using trusted SQL:
   `insert into public.admins(user_id) select id from auth.users where email = '<confirmed admin email>' and email_confirmed_at is not null on conflict do nothing;`
   Do not auto-promote first signup, accept roles from metadata, or use a default password.
6. Test separate customer A, customer B and admin sessions: customer cannot read B profile/orders/messages, alter roles, post messages or access source links; anonymous cannot read customer tables. Check opted-out user cannot read offers. Admin can read customers, send messages and update order status. Public /api/posts must omit source links, including with forged bearer tokens.
7. Deploy only after configured database tests pass. The existing source links must be removed from public cards and WhatsApp order content; orders identify models by ID instead.

Account data is privately stored in PostgreSQL. Guest orders remain WhatsApp only. Registered requests are saved before opening WhatsApp; the database does not claim WhatsApp delivery. Broadcast offers are shown only to opted-in profiles; service messages and automatic welcomes are separate. Customer list pages contain 50 entries; message/order lists show latest 100. Authentication and password reset are managed by Supabase, not our tables. Setup is incomplete until actual cloud migration/auth/permissions tests pass.

## Cloud setup checkpoint (2026-10-21)

- Supabase project: `sparkle3d` (`sliciikknpozvpzdodac`), region `eu-central-1`.
- Customer accounts migration applied; RLS enabled on all four tables.
- Intended administrator email confirmed by owner: provided privately by the owner. No account has been created or promoted yet. Verify email ownership before promotion.
- Vercel connection currently returns 403 for team `3dsparkle`; list_teams returns no accessible teams. Team grant is required before environment setup/deployment.
- Auth redirect URLs and email delivery still need configuration and end-to-end verification before publishing.
