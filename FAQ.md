# Frequently Asked Questions

The advice provided here is not exhaustive, `csrf-csrf` does not take any liability for your security choices (or lack thereof). It is your responsibility to ensure you have an accurate threat model of your application(s)/service(s) and are handling it appropriately.


## Questions

* [What is a CSRF attack?](#what-is-a-csrf-attack)
  * [Additional Resources](#additional-resources)
* [Do I need CSRF protection?](#do-i-need-csrf-protection)
* [Do I need csrf-csrf?](#do-i-need-csrf-csrf)
  * [Client Side Double-Submit](#client-side-double-submit)
* [Do I need to protect unauthorised routes (e.g. login)?](#do-i-need-to-protect-unauthorised-routes-eg-login)
* [Does httpOnly have to be true?](#does-httponly-have-to-be-true)
* [How to secret?](#how-to-secret)
* [Why is using the cookie in getTokenFromRequest a bad idea?](#why-is-using-the-cookie-in-gettokenfromrequest-a-bad-idea)
* [Dealing with 'ForbiddenError: invalid csrf token'](#dealing-with-forbiddenerror-invalid-csrf-token)
  * [Verify the browser is accepting the CSRF cookie](#verify-the-browser-is-accepting-the-csrf-cookie)
  * [Verify the browser is sending the CSRF cookie](#verify-the-browser-is-sending-the-csrf-cookie)
  * [Verify the backend is accepting the CSRF cookie](#verify-the-backend-is-accepting-the-csrf-cookie)
  * [Can't figure it out / still stuck](#cant-figure-it-out--still-stuck)

---
### What is a CSRF attack?

When a cookie is used for authentication/authorisation, any request a browser makes to the domain the cookie is set on, **traditionally** the cookie is included in the request by default, regardless of where the request comes from. The intention of a CSRF attack is to trick a users browser into making a request with some side effect, the request will automatically be considered authorised.

The purpose of CSRF protection is to help determine whether a request was legitimately intended and made by the authorised user, thus rejecting requests made by such malicious means.

#### Additional Resources

* [OWASP CSRF Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
* [CSRF Protection Course by PortSwigger](https://portswigger.net/web-security/csrf#what-is-csrf)
* [What is considered a cross-site request?](https://web.dev/articles/same-site-same-origin)


---
### Do I need CSRF protection?

If you are using a cookie for your authentication/authorisation then you may require CSRF protection. Note that, auth related cookies should be `httpOnly`, if you are using a JWT via a cookie, it should be `httpOnly`, and in this case, even though you are not using sessions, you may still need CSRF protection.

If you can guarantee all of the following things, then you can skip CSRF protection:

* You only support modern/evergreen browsers
* You do not use traditional form submits
  * Traditional form submits do not trigger CORs preflight checks and can be submitted cross-origin by default, they should have CSRF protection
* Your auth related cookies have the `sameSite` attribute set to `strict` or `lax`
* You have tight and explicit CORs configuration  
  * This means your allowed origins are explicitly configured in your CORs configuration and your backend will only accept incoming cookies from the domains you have specified 

If you answered no to any of the above points you likely need CSRF protection, or if you are unsure it could be best to have CSRF protection just in case, the overhead is negligible.


---
### Do I need csrf-csrf?

If you are using session based authentication and you have server side state you should use [csrf-sync](https://github.com/Psifi-Solutions/csrf-sync) instead, note that if you are using `express-session` then you have server side state.

If you are using a JWT as a `httpOnly` cookie stateless sessions, or some other kind of `httpOnly` stateles authentication/authorisation, then you will need to use `csrf-csrf` if you answered yes to ["Do I need CSRF protection?](#do-i-need-csrf-protection)

#### Client Side Double-Submit 

If your backend is only serving frontends which are not cross-site, you can use client side CSRF protection without `csrf-csrf`. The client generates a cryptographically pseudorandom value, the client sets this value as a cookie on the domain, the client also includes the value in a custom header (or form payload). The backend then verifies the values match, you may want to verify the other cookie attributes are as expected, such as the `path` and `sameSite`. The idea here is, attackers using CSRF attacks are unable to set cookies on your domain.


---
### Do I need to protect unauthorised routes (e.g. login)?

If you are using session based authentication this usually means you generate a session for all of your users, regardless of whether they have logged in or not. Since you have anonymous sessions, the session already exists before they have logged in. In this case the login route, forgot password route, and any other such routes should be protected.

If you are using a JWT then your "session" does not exist until _after_ the user logs in, therefore these non-authorised routes do not need CSRF protection.

If you are using session based authentication but you are not creating anonymous sessions, and sessions only exist for logged-in users, you can also skip protecting non-authorised routes.

If you are using OAuth2 to identify your users, do ensure the `state` parameter is used appropriately. If you're using OAuth2 with an SPA and no backend, then you must use the PKCE flow, if you're using OAuth2 with an SPA that has a backend, prioritise using the Authorisation Code Grant flow.


---
### Does httpOnly have to be true?

This is a question that seems to get a bit controversial, I have found that this is because the usecases have evolved a lot overtime. Personally I agree with most that it is not necessary, however there is some argument to say otherwise. If you have a usecase where it is fine for you to set `httpOnly` to `false`, this may mean you fall into the "No" group for [Do I need CSRF protection?](#do-i-need-csrf-protection), or it may mean you can just use the double submit pattern from the client side as described under [Client Side Double-Submit](#client-side-double-submit).

If you have a usecase where you do need CSRF protection and can't use the client side approach because your API is serving cross-site clients, then you may want to leave `httpOnly` as `true`.

Frameworks like Django and Laravel default `httpOnly` on their CSRF protection to `false` because these frameworks primarily use Server Side Rendering (SSR) by default. SSR generally means that frontend requests will not be cross-site and that the `sameSite` attribute can be set to `strict`. They allow the configuration for the cases that may require it.

[This article from Otka](https://developer.okta.com/blog/2022/07/08/spa-web-security-csrf-xss#validate-requests-for-authenticity-to-mitigate-csrf) recommends CSRF tokens be retrieved by an explicit endpoint when it comes to Single Page Applications (SPAs), in which case `httpOnly` is fine, you do not need the cookie to be accessible. Keep in mind doing this requires the CSRF token to be explicitly tied to the session/identifier it is generated for. Additionally there is a [discussion here](https://github.com/OWASP/CheatSheetSeries/pull/1634#discussion_r2008986056) where an OWASP maintainer has also recommended `httpOnly`. Additionally there was [one case discussed where Twitter had a vulnerable subdomain](https://github.com/Psifi-Solutions/csrf-csrf/issues/41#issuecomment-1856438994), which led to attacks on the primary domain which could have been mitigated had they set the CSRF token to `httpOnly`.

In the end the decision is yours, it is up to you to understand the requirements, constraints, and threat model of your application.


---
## How to secret?

Refer to the [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) for creation, storage, and processing of secrets. Also refer to the [secret reccomendations from `fastify/csrf-protection`](https://github.com/fastify/csrf-protection#securing-the-secret).

Keep in mind that you should not use `dotenv` in production unless you have explicitly followed their production recommendations to use `dotenvx`. It should otherwise only be used for development purposes and should only be required on the command line via the dev related commands.

Environment variables should typically be actual user scoped environment variables on the host system. You should generally have a user for the sole purpose of running your application where that user only has explicit bare minimum permissions required for running the application. Sensitive environment configuration should be handled via a secrets manager/store/vault.


---
## Why is using the cookie in `getTokenFromRequest` a bad idea?

Consider doing something like this in `getTokenFromRequest`:

```js
// NEVER DO THIS
(req) => req.cookies['csrf-token']
// NEVER DO THIS
```

Where `csrf-token` is the name of the cookie where the CSRF token is stored. **This is the same as having no CSRF protection at all.** The cookie is automatically included in the request, this means requests made via CSRF attacks may now be accepted. The whole point of the double-submit cookie pattern is that the CSRF token is submitted twice, once as a cookie, and once by some other means.

`getTokenFromRequest` should always explicitly return the value exactly from where it expects it to be, and this should be from either a custom header or from the request payload. Example:

```js
(req) => {
    if (req.is('application/x-www-form-urlencoded')) {
        // where _csrf is the name of a hidden field on the form
        // or is processed as such via the FormData
        return req.body._csrf;
    }

    return req.headers['x-csrf-token'];
}
```

You need to be careful with `getTokenFromRequest` because it is this part of the protection that `csurf` got wrong and was deprecated for.


---
## Dealing with 'ForbiddenError: invalid csrf token'

In some cases you may find that your CSRF protection is working locally but it is not working in production when you deploy, in some cases it might be working via something like postman, but not with your frontend. Whether the issue is during local development, staging, or production, the primary reason for CSRF protection is likely due to incorrect CORs configuration or an incorrect `sameSite` attribute value for your usecase.

### Verify the browser is accepting the CSRF cookie

With your browsers dev tools open and the `Network` tab selected, initiate the request where you are expecting the backend to set the CSRF cookie. Find the request in the list, select it, in the details that pop up, take a look at the **response** headers. There should be a `Set-Cookie` header and it should include the CSRF token.

There are three possibilities:

1. The CSRF token is there but there is a little triangle warning icon. If you hover this icon it will give you some indication as to why the browser has rejected the cookie, it is on you to fix your configuration.
2. The CSRF token is there and there are no warnings. This means the browser has accepted the cookie and it has been set.
3. The CSRF token is not there. This means the backend did not generate a CSRF token as part of the request, did not send the cookie out on the response, or you may be looking at the wrong request. Consider debugging to understand what is happening.

### Verify the browser is sending the CSRF cookie

If the browser has accepted the cookie and you are still receiving CSRF errors this may mean the browser is not sending the cookie. If your frontend is considered cross-site and you are using `axios` you will need to set `withCredentials: true` in your axios config. If you are using <code>fetch</code> you will need to ensure that the `credentials` option is set to `same-origin` or `include` as appropriate for your usecase, refer to [Using the Fecth API#including_credentials](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#including_credentials).

If you are using some other fetch based library you may need to consult the relevant documentation.

### Verify the backend is accepting the CSRF cookie

If the browser is sending the cookie with requests and you are still receiving CSRF errors then the next step is to verify whether the backend is accepting the cookie.

The primary reason the backend may reject a cookie is due to incorrect/improper CORs configuration. You need to ensure that the origins allowed via your CORs configuration is permitting the origin of your frontend. Usually this configuration would be done by environment variables, it is on you to ensure the configuration is as expected.

### Can't figure it out / still stuck

If you are unsure of the previous steps or you are still receiving CSRF errors, the best way to figure it out is to run through the code via your debugger. Using a debugger is an incredibly powerful skill, and is an absolute 100% way to figure out what is going wrong.

TODO: provide a video example