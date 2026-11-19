# Login guard

Every page except `/login` needs the access code. A wrong code shows an error, and the right code lands on the page the user asked for (or `/`).

## Sub-features

- `login.redirect`: an anonymous visit to a protected page redirects to `/login?next=…`.
- `login.reject`: a wrong code shows `접속 코드가 맞지 않습니다.`.
- `login.accept`: the correct code sets the session cookie and leaves `/login`.
- `login.api-guard`: anonymous `/api/app` returns 401.

## How to get to it (user POV)

- Open any page, such as `/runs/new`, without being logged in.
- Open `/login` directly.

## Driving it with verify.cjs

Preconditions: baseline state.

- Run `journey login`. It opens `/runs/new` anonymously and checks for the redirect, enters a random wrong code and waits for the error text, then enters the throwaway code and leaves `/login`.
- Evidence: `login-1-wrong-code.png`, `login-2-home.png`, and a PASS line in `journeys.log`.
- API guard: `doctor` already checks anonymous `/api/app`=401 and logged-in =200.

## Gotchas

- Five wrong attempts from one address lock login for a minute, doubling up to 60 minutes. Restarting the instance clears it. Don't loop the wrong-code step.
- A session cookie from the live `:3000` server is not valid here, because the instance has its own session secret.
- In `next dev`, middleware can keep stale env after editing `.env.local`. This harness uses `next start`, so it is not affected.
