export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  NotInvited:
    "No account found for this Google email. Ask your admin to invite you first.",
  NoAccess:
    "You do not have access to Zeron Materials. Ask an admin to grant the tool card in the gateway.",
  AccessDenied: "Sign in was denied. Try again with your Meavo Google account.",
  Configuration: "Google sign-in is not configured correctly. Contact support.",
  OAuthSignin: "Could not start Google sign-in. Try again.",
  OAuthCallback: "Google sign-in failed. Try again.",
  OAuthAccountNotLinked:
    "This Google account is not linked to your user. Contact your admin.",
  DomainNotAllowed: "Only @meavo.com Google accounts can sign in.",
};
