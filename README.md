# Learning-Management

## Admin and instructor account recovery

The login database needs accounts for the admin and instructor roles, and passwords are stored as bcrypt hashes. To initialize an empty database or recover existing accounts, run this from the repository root:

```sh
cd backend
npm run setup:login-accounts
```

The command uses the database configured in `backend/.env` and hides password input. If the `users` table is empty, it prompts for new admin and instructor details. If the table already contains users, it resets the passwords only for the existing admin and instructor usernames you provide; it creates an instructor only when none exists. It never bootstraps an admin into a non-empty users table. Changes are applied in one database transaction, and no default credentials are created.

### If the LMS is deployed on Render

Pushing the setup script deploys the code, but does not create or reset accounts. First push the changes to the branch connected to Render and wait for both the API and frontend deploys to finish. Then run the setup script from `backend/` with the **same production database** used by the Render API. Do not use the local database settings in `backend/.env`.

For a Supabase-backed Render API, enter the `DATABASE_URL` value from the Render API environment settings in your local terminal. Password input is hidden:

```sh
read -r -s -p "Render DATABASE_URL: " DATABASE_URL
printf '\n'
export DATABASE_URL
npm run setup:login-accounts
unset DATABASE_URL
```

Use the Supabase session-pooler URI shown in the project's **Connect** dialog if the direct database host is not reachable over IPv4. For local MySQL/MariaDB development, the existing `DB_*` settings continue to work when `DATABASE_URL` is not set.

The script asks for the admin and instructor usernames and new passwords when recovering an existing database. Never paste database credentials or passwords into chat or commit them. After it reports that setup completed, test both accounts on the deployed frontend.
