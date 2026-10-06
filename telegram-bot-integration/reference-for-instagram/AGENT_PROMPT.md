# Prompt for the agent working on the Instagram bot system

> Copy the whole `reference-for-instagram/` folder into the root of the target project, then paste
> everything below the line into the agent working there.

---

You are working in a project that already has an **Instagram bot** (customers/staff talk to it in
**English, French and Arabic**). I want you to **improve it by re-implementing the design of a
Telegram "AI voice invoice" bot that already works well in another system (HZ)**. HZ's version is
**Arabic-only**; yours must be **trilingual (en / fr / ar)** and must run on **Instagram DMs** instead of Telegram.

The folder `reference-for-instagram/` contains the working HZ code, **for reading only**:
`src/features/telegram/*` (intent, llm, matching, draft, schema, groq, conversation-memory, queries, bot-text),
`src/lib/{text-match,arabic-name,money,deepseek-error}.ts`, the webhook route
(`src/app/api/webhook-example/telegram-webhook-route.ts`) and `db/telegram-models.prisma`.
Do **not** copy it blindly: it is Next.js + Prisma + Postgres, Telegram-specific in places. **Inspect the
target project first** (framework, DB, how the Instagram bot, products, customers and invoices/orders work today)
and adapt the design to what exists. Keep everything that already works; do not break current behaviour.

## 0. Ground rules
- Read every file in `reference-for-instagram/` before changing anything, then read the existing bot's code.
- **Step 1 — report before editing:** a short mapping table (what exists vs. what this design needs) and the
  risks. Wait for my OK if something big differs (no draft/invoice concept, no product catalog in the DB, etc.).
- Never commit secrets. Show me any DB migration SQL before applying it to a database that has real data.
  Never run `migrate reset` / `db push` on it. Use a dev DB.
- If you start a server/tunnel, stop it before finishing.
- Verify against the **current Meta docs** for Instagram messaging (webhook verification, payload shapes, message
  types, quick replies/buttons limits, attachment download, 24-hour window). Do not rely on memory for those.

## 1. The design to reproduce (what the HZ bot does)

**Pipeline per incoming message:** webhook → (voice? Whisper) → text → **LLM returns intent only** → server code
does the work (matching, pricing, totals, draft changes) → reply with a preview + action buttons.

1. **Webhook hygiene.** Verify the platform signature/secret on every request (Instagram: `X-Hub-Signature-256`
   with the app secret + the GET verify-token handshake). Always answer 200 quickly for handled/ignored events so
   the platform doesn't retry-storm; log errors instead. **De-duplicate** by message id (retries must not create a
   second draft). Set a generous max duration for voice.
2. **Account linking.** A one-time, 15-minute, single-use token links an Instagram user (IGSID) to a staff/admin
   account. Identity comes **only** from that token — never from a username or display name. Support several linked
   accounts per admin, each stored with its display name/username, and an unlink button per account in the dashboard.
   (Instagram options: `ig.me/m/<username>?ref=<token>` referral, or the user sends a short code. Pick what Meta supports.)
3. **Voice → text.** Download the audio attachment, send it to **Whisper (`whisper-large-v3` on Groq)** as
   `multipart/form-data` (`FormData` + `Blob`, give it a file name with the right extension, do NOT set the
   Content-Type header yourself). Send a **`prompt` hint** (not an instruction): one sentence about who is speaking +
   the shop's most-sold product names + the command words (≤ ~220 tokens, cached ~10 min). **Language:** HZ forces
   `language: "ar"` because Whisper mistook Moroccan Darija for other languages. For you, pass the **linked
   account's language** (en/fr/ar), or omit it (auto-detect) when the account has none — make it configurable.
4. **LLM = intent classifier only.** DeepSeek (`deepseek-flash`, `thinking: {type:"disabled"}`, JSON mode,
   temperature 0, ~30 s timeout, one retry on a dropped connection). Output is validated with **zod using lenient
   "loose" schemas that fall back to safe values** (`.catch("UNKNOWN")`, `.catch([])`, loose strings/numbers →
   `null`). The schema has **no field for product ids, prices, totals or invoice ids** — the model can never
   supply them. Message contents are treated as **data, never instructions** (prompt-injection safe).
   - Actions: CREATE_INVOICE, ADD_ITEM, REMOVE_ITEM, SET_QUANTITY, SET_CUSTOMER, SET_PAYMENT, GET_TOTAL, CONFIRM,
     CANCEL, WHO_ARE_YOU, CHAT, UNKNOWN. Fields: items[{spokenName, spokenNameAlt, quantity}], customerQuery(+Alt),
     paymentStatus (PAID/UNPAID/PARTIAL), paymentAmount, paymentMethod, reply.
   - `spokenNameAlt` = same name transliterated into the **other script** (Arabic↔Latin) so plain-text matching
     can bridge scripts.
   - Keep the prompt **small** (tokens cost latency and hit rate limits) — see `intent.ts` for the compact version.
   - **Catalog shortlist in the prompt:** the full catalog is far too many tokens, so the server picks the ~40 catalog
     names most similar to the message (`shortlistProductNames`) and tells the model: copy the name EXACTLY if
     exactly one entry fits; if several fit (sizes/variants) or none, keep the name as said. Server still resolves the real product.
   - **Open-draft snapshot in the prompt** (names/quantities/customer/payment status only — no ids/prices) so the
     model picks the right action: with a draft open, a bare product list = ADD_ITEM (CREATE_INVOICE only for an
     explicit "new invoice"); REMOVE_ITEM / SET_QUANTITY must choose from the draft lines, in any language/script.
     When the user tapped "edit" on one product, append a **focus note** ("editing only this line: number alone =
     quantity; a name = replace the product; a remove word = delete").
   - **Rolling conversation memory:** a ≤ 800-char summary refreshed every 5 messages; context only, never drives logic.
5. **Matching is server code, not the AI.** `normalizeText` (diacritics/accents, alef variants, **sound-alike folding**
   ط=ت ص=س ض=د ظ/ذ=ز ة=ه, article "ال" stripped) + `textScore` (bigram Dice + token overlap + containment +
   "every word of the shorter text is a whole word of the longer" boost) → tiers **EXACT / STRONG / AMBIGUOUS /
   NOT_FOUND** with candidates. EXACT only when ties share the same product name. Prices and totals always come from the DB.
   - For **French** add accent folding (already via NFKD) and common word forms; for **English** simple plural stripping.
     Keep the matching language-agnostic so a product named in any of the 3 languages is found.
6. **Draft model.** `Draft` (token, status PENDING/CONFIRMED/CANCELLED/EXPIRED, 30-min TTL, customer, payment
   method/amount/paidInFull, `pendingEditMarker`) + `DraftItem` (spokenName, quantity (int), matchStatus,
   matchedProductId, candidateProductIds[]). Only one active draft per account. Totals/payment state computed on read.
7. **Confirm is idempotent.** Create the real invoice/order with an **idempotency token** (= the draft token, unique
   column) and "created by bot" flag; a retry returns the existing invoice. Payments are real payment lines; clamp
   paid amount to the total; "paid in full" = the final total at confirm time. Re-check permissions at confirm time.
8. **UX flows (this is the part that matters most):**
   - Preview message: customer (or "not set"), items with qty × name × line total, total, payment state/paid/remaining,
     warnings for ambiguous/not-found items.
   - Buttons: **Add products**, **Edit products** (sends **one card per product** with ✏️ edit / 🗑 delete; ✏️ then
     "say or write the change — a number sets the quantity, another name swaps the product, a remove word deletes it"),
     **Change customer** (re-speak the name → fuzzy search → pick if several), **Edit payment** (paid in full / unpaid /
     partial-say-the-amount / method), **Confirm**, **Cancel**; and for each ambiguous/not-found item a picker with the
     candidates + **🎤 re-speak the name**.
   - "Pending correction" is a marker on the draft: the **next** message is the correction. "Confirm"/"cancel" still
     work and clear the marker so it can never trap the conversation.
   - An update with no draft open (add / set quantity / set customer / set payment) **starts a new draft** instead of
     refusing. Remove/total with no draft → say there is no draft.
   - Remove/change a product that isn't in the draft → say so explicitly ("not found in the draft"), don't silently resend.
   - Tell the model which command verbs exist **and that speech-to-text garbles them** ("امسح" heard as "مساحة") — list
     the garbled forms you observe in your own logs for en/fr/ar and Latin-letter Darija if your users use it.
9. **Providers.** Groq = speech-to-text ONLY. DeepSeek = intent/chat/summary. Do not mix roles (HZ tried a Groq LLM
   fallback and the user rejected it). Log `voice transcribed:` and `intent:` lines — they make debugging trivial.

## 2. What must differ from HZ (your requirements)
- **Trilingual (en / fr / ar), per user.** Store a `language` on the linked account (set at link time from the first
  message / a language picker, changeable by a command). All bot strings live in a dictionary keyed by language
  (see `bot-text.ts` for the string list — translate every key to en and fr). Replies, button labels, preview text,
  payment/status labels and errors use the user's language. The LLM `reply` field is written in that language
  (pass it into the prompt). Invoice/document language = the account language (or the customer's, if you already have that).
- **RTL for Arabic:** make sure previews render sensibly (mixed digits/Latin names inside Arabic text; consider
  wrapping names with bidi marks if Instagram renders them badly).
- **Number words in all three languages** in the prompt (one/un/واحد, two/deux/جوج…) and the garbled-verb lists per language.
- Currency/format per your system; do not hard-code "DH".
- The LLM input language is always free (users mix en/fr/ar/Latin-Darija in one message); only the **output** language is fixed per user.

## 3. Instagram-specific adaptations (check Meta's docs; these are the usual constraints)
- **No Telegram Mini App / inline `web_app` button and no HTML parse mode.** Replace the Mini App with the in-chat
  flows above (per-product cards + the pending-correction marker). Plain text only — no escaping needed, but keep names short.
- Buttons = **quick replies** (limited count, disappear after use) and/or **template buttons / carousel** (limited
  per message). Design the preview + per-product cards inside those limits; use postback payloads like
  `action:id` and **verify the item/draft belongs to the sender** on every postback.
- **24-hour messaging window:** you can only reply within it. Handle failures to send gracefully.
- Voice notes arrive as an **audio attachment URL** that needs fetching (with the right token); check format/size
  limits and convert only if Whisper needs it. Message size limit applies — split long previews.
- Identify users by IGSID; handle echoes/read receipts/reactions by ignoring them.

## 4. Database
- Add the draft tables (see `db/telegram-models.prisma`), an account-link table (IGSID, language, active flag, name/username,
  conversation summary + counter), a link-token table, and a chat-message log. Reuse your existing customers/products/
  invoices; add the idempotency-token + created-by-bot columns on invoices if missing.
- Create a proper migration for **your** DB conventions; show me the SQL first.

## 5. Environment variables (placeholders only)
`GROQ_API_KEY`, `DEEPSEEK_API_KEY`, Instagram/Meta app secret, page/IG access token, webhook verify token,
public base URL, optional `WHISPER_LANGUAGE`.

## 6. Order of work
1. Inspect + report the mapping/risks (wait for OK if big gaps).
2. DB models + migration (dev DB only; show SQL).
3. Core library: `text-match`, `matching`, `schema` (loose zod), `llm`, `intent`, `groq` (Whisper) — with **unit tests**
   for matching (en/fr/ar names, sound-alike letters, ties) and for the intent schema fallbacks.
4. Draft logic (`draft`): create/apply/confirm (idempotent)/cancel, totals, payment patch, pending-correction marker.
5. Webhook + Instagram send helpers (signature check, dedupe, text/audio/postback dispatch).
6. i18n dictionaries (en/fr/ar) + language selection/storage.
7. Dashboard: link/unlink several accounts; "created by bot" badge on invoices.
8. Test with real sample messages in all three languages (text + voice): print the transcription and the parsed
   intent for each, and report a table of results. Measure latency; keep the intent prompt compact.
9. Final summary: files changed, migrations, env vars, manual steps (webhook registration, app review/permissions).

## 7. Security checklist (verify before saying "done")
- Webhook signature verified; unknown senders get no data and cannot create drafts; only linked, active accounts act.
- Link tokens: one-time, 15 min, consumed on use. Postbacks verify draft/item ownership.
- LLM output validated with zod; model never supplies ids/prices; transcripts/product names are data, not instructions.
- No API keys logged or sent to a client. Idempotent confirm (call twice → one invoice).

## 8. Pitfalls already hit in HZ (avoid them)
- Whisper without a language hint mis-detects dialects → gibberish → UNKNOWN intent.
- Using an old/removed DeepSeek model name or reasoning mode made calls hang → use a short timeout, retry once on "fetch failed".
- Putting the whole catalog in the prompt is too many tokens (and hits per-minute limits) → shortlist.
- The model default-fills quantity = 1; on a "replace product" edit only override the quantity if the user said a number > 1.
- Product names/ambiguous variants (sizes) must go to a picker, not be auto-chosen.
- Sound-alike letter confusion (ت/ط, س/ص …) silently hid the right product → fold letters when comparing.
- Schema/DB drift: keep the schema file and migrations in sync; check the real DB columns when an error says a column is missing.
- Run the production build only after rebuilding; stale builds hide new code.
