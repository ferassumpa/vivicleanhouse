# ViviClenaer

Portal + app para gestão de faxinas (estúdios, apartamentos e casas).

Stack: **Next.js**, **Supabase**, **Vercel (gru1)**, **Capacitor**, UI em **PT-BR**.

## Papéis

| Papel | Rota | Função |
|-------|------|--------|
| Admin | `/admin` | Cadastros, disponibilidade, confirma agendamentos, finanças |
| Funcionária | `/employee` | Agenda, entrada/saída, fotos antes/depois, materiais (ganha por faxina) |
| Cliente | `/client` | Vê imóveis, agenda no calendário (fica `requested` até admin confirmar) |

## Setup rápido

1. Crie um projeto no Supabase e rode, nesta ordem:
   - `docs/sql/001_schema.sql`
   - `docs/sql/002_seed_materials.sql`
   - `docs/sql/003_auto_create_client.sql`
   - `docs/sql/004_buildings_and_checklist.sql`
   - `docs/sql/005_service_packages.sql`
   - `docs/sql/006_whatsapp_templates.sql`
   - `docs/sql/007_fix_whatsapp_emoji.sql` (se o emoji da mensagem virar “?”)
   - `docs/sql/008_cleanings_admin_edit_guard.sql`
   - `docs/sql/009_client_book_cleaning_rpc.sql` (cliente reservar horário sem service role)
2. Copie `.env.example` → `.env.local` e preencha as chaves.
3. Em **Authentication → URL Configuration** no Supabase, adicione:
   - Site URL: `http://localhost:3000` (e depois a URL do Vercel)
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/auth/reset-password`
     - `https://SEU_DOMINIO/auth/callback`
     - `https://SEU_DOMINIO/auth/reset-password`
4. Cadastro público cria conta **cliente**. Admin/funcionária: crie o usuário e ajuste `profiles.role`.
5. Vincule `employees.user_id` ao usuário da funcionária.
6. `npm install && npm run dev`

### Auth (rotas)

| Rota | Função |
|------|--------|
| `/` | Landing (Criar conta / Entrar) |
| `/auth/login` | Login |
| `/auth/signup` | Criar conta |
| `/auth/forgot-password` | Pedir link de recuperação |
| `/auth/reset-password` | Definir nova senha |
| `/auth/callback` | Retorno de confirmação de e-mail |

## Vercel

- Framework Next.js, região `gru1` (`vercel.json`)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
- Opcional (só vincular login de faxineira): `SUPABASE_SERVICE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`

## Capacitor (Android)

O app nativo carrega a URL do Vercel (`NEXT_PUBLIC_APP_URL` / `CAPACITOR_SERVER_URL`).

```bash
npm run build
npx cap add android   # só na primeira vez
npx cap sync android
npx cap open android
```

## Fluxo de agendamento

1. Admin (ou funcionária) abre horários em disponibilidade.
2. Cliente escolhe imóvel + slot → status `requested`.
3. Admin confirma, atribui funcionária e grava `employee_pay_amount` (valor por faxina).
4. Funcionária registra entrada, fotos, materiais e saída → `done`.
5. Finanças usam: receita − pagamento da funcionária − materiais − outros custos.
