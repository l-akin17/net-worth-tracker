# Upload To GitHub Without Terminal

You do not need Terminal for this project.

This app is already a plain static website. That means you can upload the files directly in the GitHub website.

## The exact files to upload

Upload these files from this folder:

- `index.html`
- `styles.css`
- `app.js`
- `firebase-service.js`
- `firebase-config.js`
- `firestore.rules`
- `README.md`
- `.nojekyll`

## What each file does

- `index.html`: the main page
- `styles.css`: the design
- `app.js`: the tracker logic
- `firebase-service.js`: cloud sync
- `firebase-config.js`: your Firebase keys
- `firestore.rules`: database privacy rules
- `.nojekyll`: helps GitHub Pages serve the site correctly

## How to upload them in GitHub

1. Open your GitHub repository in the browser.
2. Click `Add file`.
3. Click `Upload files`.
4. Drag all the files listed above into the upload area.
5. Scroll down.
6. Click `Commit changes`.

If some files already exist:

1. Open the repository.
2. Click the file name.
3. Click the pencil icon to edit, or delete and re-upload.

## Important

Before the cloud sync works, you must edit `firebase-config.js` and replace the placeholder values with your real Firebase values.

## After upload

Once the files are uploaded, turn on GitHub Pages in:

- `Settings`
- `Pages`
- `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

Then GitHub will give you your live website link.

## Then in Firebase

You still need to do 3 things in Firebase:

1. Enable `Email/Password` sign-in in Authentication.
2. Create Firestore Database.
3. Paste the contents of `firestore.rules` into Firestore Rules and publish them.

## Simplest order

If you want the least confusing order, do this:

1. Create the GitHub repo
2. Upload the files in GitHub
3. Turn on GitHub Pages
4. Create Firebase project
5. Create Firebase web app
6. Put Firebase values into `firebase-config.js`
7. Upload the edited `firebase-config.js` back into GitHub
8. Enable Authentication
9. Create Firestore
10. Publish the rules
11. Add your GitHub Pages domain to Firebase Authorized Domains
