# Learning-Management

## Login account recovery

The login database needs an account for each role, and passwords must be stored as bcrypt hashes. To reset the existing admin password and create one instructor and one student account, run this from the repository root:

```sh
cd backend
npm run setup:login-accounts
```

The command uses the database configured in `backend/.env`, prompts for account details, and hides password input. It creates no default credentials and applies the changes together in one database transaction. Run it only against the database you intend the LMS to use.

### If the LMS is deployed on Render

Pushing the setup script deploys the code, but does not create or reset accounts. First push the changes to the branch connected to Render and wait for both the API and frontend deploys to finish. Then run the setup script from `backend/` with the **same production database** used by the Render API. Do not use the local database settings in `backend/.env`.

For a database that permits external connections, enter its connection values from the Render API environment settings in your local terminal. Password input is hidden:

```sh
read -r -p "Render DB_HOST: " DB_HOST
read -r -p "Render DB_PORT: " DB_PORT
read -r -p "Render DB_USER: " DB_USER
read -r -p "Render DB_NAME: " DB_NAME
read -r -s -p "Render DB_PASSWORD: " DB_PASSWORD
printf '\n'
export DB_HOST DB_PORT DB_USER DB_NAME DB_PASSWORD
export DB_SSL=true
npm run setup:login-accounts
unset DB_PASSWORD
```

The script asks for the existing admin username, a new admin password, and the instructor/student account details and passwords. Never paste database credentials or passwords into chat or commit them. After it reports that setup completed, test all three accounts on the deployed frontend.
