# AajKaam — Phase 1 Setup Guide

This covers everything from opening the project on your computer to seeing it
live on the internet. Follow these in order.

## Part A — Run it on your own computer first

1. Install **Node.js** if you don't have it: go to nodejs.org, download the
   "LTS" version, and install it like any normal program.
2. Unzip this project folder somewhere on your computer (e.g., Desktop).
3. Open **VS Code**, then File → Open Folder → select the `aajkaam` folder.
4. Open the built-in terminal in VS Code (Terminal menu → New Terminal).
5. Type `npm install` and press Enter. This downloads all the code libraries
   the project needs (takes a minute).

## Part B — Set up a database (PostgreSQL)

We're using PostgreSQL — think of it as a very reliable, shared spreadsheet
that many people can read/write to at once, safely.

**Easiest option: create it directly on Render (free to start)**
1. Go to render.com and sign up / log in.
2. Click "New +" → "PostgreSQL".
3. Give it a name (e.g., "aajkaam-db") and create it.
4. Once created, copy the "External Database URL" shown on its page.
5. In your project folder, copy `.env.example` to a new file named `.env`
   (in VS Code: right-click `.env.example` → Copy, then paste and rename).
6. Paste the database URL you copied into `.env` as the value of `DATABASE_URL`.

## Part C — Create the database tables

1. In Render's PostgreSQL dashboard, find the "Connect" button — it gives you
   a command you can run, or a built-in "Shell" tab in the browser.
2. Open the `db/schema.sql` file in this project.
3. Copy its entire contents and run it in Render's database shell (paste and
   press Enter). This creates all the tables the app needs.
   *(Alternative: if you're comfortable with the terminal, you can also run
   schema.sql using a tool like `psql` or a free app like TablePlus/pgAdmin.)*

## Part D — Run the app locally to test

1. Back in VS Code's terminal, type `npm start` and press Enter.
2. Open your browser and go to `http://localhost:3000`
3. You should see the AajKaam Daily Entry screen. Go to "Setup" first and
   add at least one Trade, Project, Activity with Stages, and Target, then
   tag a Worker and a Supervisor to the same project — otherwise the
   dropdowns in Daily Entry will be empty.

## Part E — Put the code on GitHub

1. Go to github.com, sign in, click "New Repository", name it `aajkaam`,
   keep it Private, and create it (don't add a README — you already have one).
2. Back in VS Code's terminal, run these one at a time:
   ```
   git init
   git add .
   git commit -m "Phase 1: setup screens and daily entry"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/aajkaam.git
   git push -u origin main
   ```
   (Replace YOUR-USERNAME with your actual GitHub username — GitHub shows you
   this exact command on your new repo's page too.)

## Part F — Deploy it live on Render

1. In Render, click "New +" → "Web Service".
2. Connect your GitHub account and select the `aajkaam` repository.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Under "Environment Variables", add `DATABASE_URL` with the same value
   from your `.env` file.
6. Click "Create Web Service". Render will build and give you a live link
   (something like `aajkaam.onrender.com`) that anyone can open on their phone.

## What's built in Phase 1
- Setup screens: Trades, Projects, Activities & Stages (with weights),
  Targets (with project-type or general/default), Workers and Supervisors
  each tagged directly to a project — that tag is what lets a supervisor
  log work for a worker
- Supervisor Daily Entry screen: pick a worker (limited to their tagged
  project), pick an activity, enter units completed + hours per stage

## Not built yet (later phases)
- Worker login/performance view
- HR dashboard, recognition, and performance calculations
- Historical-average fallback logic for missing targets
