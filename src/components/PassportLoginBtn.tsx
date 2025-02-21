// components/PassportLoginButton.tsx
"use client";

import { passportInstance } from "@/utils/setupDefault";
import Image from "next/image";

export type PassportLoginButtonProps = {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
};

export default function PassportLoginButton(props: PassportLoginButtonProps) {
  const { isAuthenticated, setIsAuthenticated } = props;

  const handleLogin = async () => {
    if (!passportInstance) return;
    try {
      const provider = await passportInstance.connectEvm();
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (accounts) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setIsAuthenticated(false);
    }
  };

  const logout = async () => {
    if (!passportInstance || !isAuthenticated) return;
    try {
      await passportInstance.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated) {
    return (
      <button
        onClick={logout}
        className="flex items-center bg-gray-100 text-black py-3 px-12 rounded-3xl cursor-pointer hover:border-purple-600 border-2 border-gray-100"
      >
        <Image
          src="/passportWallet.png"
          alt="Passport Wallet"
          className="w-7 h-7 mr-2"
          width={28}
          height={28}
        />
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center bg-gray-100 text-black py-2 px-4 rounded-3xl cursor-pointer hover:border-purple-600 border-2 border-gray-100"
    >
      <Image
        src="/passportWallet.png"
        alt="Passport Wallet"
        className="w-7 h-7 mr-2"
        width={28}
        height={28}
      />
      Sign in with Immutable
    </button>
  );
}
