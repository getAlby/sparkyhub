# Sparky Hub

Multi-User [NWC](https://nwc.dev/) Wallet Service using [Spark](https://docs.spark.info/) to enable each user to have their own keys.

**WARNING: THIS IS AN ALBY EXPERIMENTAL HACK DAY PROJECT**

- Spark is very unstable right now and has almost daily breaking changes.
- Currently mnemonics are stored as plaintext. We did not focus on security as part of this hackday project and are still considering options for a secure multi-user wallet service.
- Do not put more than 100 sats into the wallet - we give no guarantee that the funds will always be accessible

Try it here: [Sparky Hub](https://sparkyhub.albylabs.com/)

## Development

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

#### Build

This will allow you to access it served as static files from the backend at `localhost:3001`.

`yarn build`

### Backend

```bash
cd backend
cp .env.example .env
yarn install
yarn prisma migrate dev
yarn start
```
