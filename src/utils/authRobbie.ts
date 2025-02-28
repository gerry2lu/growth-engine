import OAuth from "oauth-1.0a";
import crypto from "crypto";

const API_KEY = process.env.R_API_KEY;
const API_SECRET = process.env.R_API_SECRET;
const ACCESS_TOKEN = process.env.R_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.R_ACCESS_TOKEN_SECRET;

const oauth = new OAuth({
  consumer: { key: API_KEY || "", secret: API_SECRET || "" },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return crypto.createHmac("sha1", key).update(base_string).digest("base64");
  },
});

const token = {
  key: ACCESS_TOKEN || "",
  secret: ACCESS_TOKEN_SECRET || "",
};

export const getRobbieOAuthHeader = (url: string, method: string) => {
  const requestData = {
    url,
    method,
  };

  return oauth.toHeader(oauth.authorize(requestData, token));
};
