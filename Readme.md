Login

User Authentication:
Validate user identity with email/username and password.
Ensures only authorized users can access the system.

Access Token:
A short-lived token used for immediate access to protected APIs.
Promotes secure session management by limiting exposure.

Refresh Token:
A longer-lived token that can be used to issue new access tokens without requiring the user to log in again.

Improves user experience and reduces the frequency of logins.

HTTP-Only Secure Cookies:
Prevents access to tokens via JavaScript (e.g., XSS attacks).
Ensures tokens are only transmitted over secure HTTPS connections.

Logout

Token Invalidation:
Removing the refreshToken ensures that no further tokens can be generated for the logged-out user.

Cookie Clearance:
Clearing cookies on the client side ensures tokens are no longer sent with subsequent requests.

Security:
Prevents unauthorized access if the user forgets to log out or the session is compromised.

IN SIMPLE TERMS

What happens when a user logs in?

User Gives Login Details:
The user types their email/username and password and sends them to the server.

Find the User:
The server checks if there’s a user in the database with the given email or username.
If the user doesn’t exist, it says, "We couldn’t find you."

Check Password:
If the user exists, the server checks if the password is correct.
If it’s wrong, it says, "The password is incorrect."

Create Tokens:
If the password is correct, the server creates:
Access Token: A short-term pass for using the app.
Refresh Token: A long-term pass to get new short-term passes later.

Store Tokens Securely:
These tokens are stored in cookies (small pieces of data) that are:
HTTP-only (so hackers can’t steal them using JavaScript).
Secure (so they only work on safe websites).

Send Back Success:
The server sends back a message saying, "Login successful!" along with the user’s information (but hides sensitive stuff like the password).

What happens when a user logs out?

Clear the Tokens:
The server removes the long-term Refresh Token from the database. This makes sure the user can’t use it again.

Clear Cookies:
The server tells the browser to delete the cookies where the tokens were stored.

Send Back Success:
The server sends a message saying, "You’ve logged out successfully."