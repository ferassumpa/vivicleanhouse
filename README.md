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
2. Copie `.env.example` → `.env.local` e preencha as chaves.
3. No Supabase Auth, crie usuários e ajuste `profiles.role` (`admin` | `employee` | `client`).
4. Vincule `clients.user_id` / `employees.user_id` ao `auth.users.id`.
5. `npm install && npm run dev`

## Vercel

- Framework Next.js, região `gru1` (`vercel.json`)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `NEXT_PUBLIC_APP_URL`

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
