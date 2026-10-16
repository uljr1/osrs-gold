# Firebase setup — OG Gold live backend (free)

This connects the site's order tickets + live chat. Takes about 5 minutes on your phone. All free (Firebase Spark plan).

## 1. Create the project
1. Go to **console.firebase.google.com** and sign in with your Google account.
2. Tap **Add project** → name it `uljr-gold` → Continue.
3. Google Analytics: you can turn it **off** → Create project → wait → Continue.

## 2. Create the database
1. In the left menu: **Build → Realtime Database** → **Create Database**.
2. Location: pick `us-central1` (or nearest) → Next.
3. Start in **locked mode** → Enable.
4. Open the **Rules** tab → tap **Edit** → delete everything → paste the full contents of `firebase-rules.json` from this site folder → **Publish**.

## 3. Get your web config
1. Go to **Project Overview** (top of left menu) → tap the **`</>`** (web) icon.
2. App nickname: `uljr-gold-web` → **Register app** (skip hosting).
3. Copy the `firebaseConfig` block — you'll need these 5 values:
   `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`.
4. Open `assets/js/config.js` in the site files and paste them into the `firebase: { … }` section, replacing each `"REPLACE_ME"`.

## 4. Create your admin login
1. Left menu: **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → Enable → Save.
3. **Users** tab → **Add user** → enter YOUR email + a strong password → Add user.
4. This is what you use to log in at `admin.html`.

## 5. Test it
1. Open the live site → **Buy Gold** → place a small test order.
2. Live chat should open with the assistant's greeting.
3. Open `admin.html` on your phone → log in → your test ticket appears under **Pending**.
4. Tap it → **Accept ticket** → reply — the customer chat updates instantly.

## Daily use
- Keep `admin.html` logged in on your phone — new orders **beep** and flash the tab title.
- **Accept** a ticket when you start it, **Close** it when the trade is done.
- Never share your admin password. Customers only ever need their ticket ID.

## If something breaks
- "Ticket not found" for a customer → they mistyped the ID; the full ID is in their confirmation box (Copy full ID button).
- Login fails → the admin user wasn't created, or Email/Password sign-in isn't enabled (step 4).
- Nothing saves → the `firebase:` block in `config.js` still has `REPLACE_ME`, or the database rules weren't published (step 2.4).
