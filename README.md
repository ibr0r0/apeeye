# 🐒 Apeeye

**Apeeye** is a zero-bullshit mock API tool.  
Create fake REST endpoints in seconds. No setup. No login. Just build.

-  Define collections like `/users` or `/posts`
- Test any HTTP method (GET, POST, PATCH, DELETE)
- Data saved locally in `db.json`
- Instant feedback, no backend required
- Built for devs. Use it anywhere. (watch demo below)

## 📽 Demo

<video src="[assets/Apeeye’s-video.mp4](https://github.com/user-attachments/assets/049737bb-333d-42d5-8c18-15667a7fe080
)" width="600" autoplay loop muted playsinline></video>





## ⚙️ Installation

Clone the repo and install dependencies:

```
git clone https://github.com/ibr0r0/apeeye.git
cd apeeye
npm install
```
Start both the API server and the web interface:


### Terminal 1 – Start the mock API server
```node server/index.js```

### Terminal 2 – Start the frontend (Expo Web)
```npx expo start --web```

That's it. Open the browser and start mocking.


##  Usage

1.Open the web UI in your browser (usually at `http://localhost:8081` ).

2.Click **"Add Resource"** to create a new collection (e.g. `users`).

3.Click on a collection to view or edit its records.

4.Add, edit, or delete records as JSON.

5.Access your mock API at:

http://localhost:34567/mock/users

http://localhost:34567/mock/posts

http://localhost:34567/mock/comments

http://localhost:34567/mock/products

http://localhost:34567/mock/orders



## Tech Stack

- **Frontend:** React Native Web (via Expo)
- **Backend:** Express.js (Node.js)
- **Database:** Local JSON file (`db.json`)
- **UI State:** React Hooks + Custom ThemeContext
- **Dev Tools:** Fetch API, FlatList, TextInput, Pressable

## Roadmap

**Apeeye** is just getting started. Here's what's planned:

- [x]  Local mock API server with `db.json`
- [x]  React Native Web UI for managing collections
- [ ]  Host Apeeye as a public web app (no local setup required)
- [ ]  Add visual UI for creating APIs (form-based instead of raw JSON)
- [ ]  Shareable mock endpoints with unique URLs
- [ ]  Import/export collections as JSON
- [ ]  Add delay and error simulation (e.g. 404, 500, timeout)
- [ ]  UI refinements, theme improvements, and animations
- [ ]  Testing presets for frontend devs (e.g. auth flow, search, pagination)

**Contributions are welcome** feel free to open issues or PRs for anything on the list.

## Contributing


If you find a bug, want a feature, or feel like improving something... open an issue or submit a pull request.

#### Guidelines

- Keep it simple and clean.
- Make sure the app still works locally after your changes.
- If you're adding a feature, explain it clearly in your PR.


Thanks for helping improve **Apeeye** 🙌

---

- ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) 
- ![Backend: Express.js](https://img.shields.io/badge/Backend-Express.js-brightgreen)
- ![Frontend: Expo](https://img.shields.io/badge/Frontend-Expo-blue)
- ![Storage: db.json](https://img.shields.io/badge/Storage-db.json-yellow)
- ![REST Support](https://img.shields.io/badge/API-RESTful-c42)


---

For support, suggestions, or general inquiries,  
please reach out via **X** at [**@ibr0r**](https://x.com/ibr0r).

