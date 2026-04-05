# Firebase For Beginners

This is the part that makes the app sync across iPhone, Windows, and Mac.

## What you are creating

You are creating:

- a Firebase project
- a web app inside Firebase
- a Firestore database
- a login method using email and password

## Step 1

Go to:

[https://console.firebase.google.com/](https://console.firebase.google.com/)

Click `Create a project`.

Project name suggestion:

- `net-worth-tracker`

Click through the setup until the project is created.

## Step 2

Inside Firebase, create a web app:

1. Open `Project settings`
2. In `Your apps`, click the web icon `</>`
3. Give it a name
4. Click `Register app`

Firebase will then show you a config with values like:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

Copy those values into `firebase-config.js`.

## Step 3

Enable login:

1. Open `Authentication`
2. Click `Get started`
3. Open `Sign-in method`
4. Enable `Email/Password`
5. Save

## Step 4

Create the database:

1. Open `Firestore Database`
2. Click `Create database`
3. Choose `Production mode`
4. Pick a region
5. Finish

## Step 5

Add the database rules:

1. Open the file `firestore.rules`
2. Copy everything inside it
3. In Firebase, open `Firestore Database`
4. Open `Rules`
5. Replace the current rules
6. Click `Publish`

## Step 6

Add your GitHub Pages domain to Firebase:

1. Open `Authentication`
2. Open `Settings`
3. Find `Authorized domains`
4. Add your domain

Example:

- `yourname.github.io`

Do not paste the full page address with `/net-worth-tracker/`.
Only add the domain part.
