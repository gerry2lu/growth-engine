"use client";

import { useEffect, useState } from "react";
import { passportInstance } from "@/utils/setupDefault";

export default function Redirect() {
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (passportInstance) {
      // #doc passport-login-callback
      passportInstance
        .loginCallback()
        // #enddoc passport-login-callback
        .then(() => {
          console.log("Login callback successful");
          if (window.opener) {
            window.opener.postMessage("authComplete", window.origin);
            window.close();
          }
        })
        .then(() => {
          setIsSuccess(true);
        })
        .catch((error) => {
          console.error("Error in login callback:", error);
        });
    }
  }, []);

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-8">Logged in</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">Logging In</h1>
    </div>
  );
}
