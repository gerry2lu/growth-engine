"use client";

import Link from "next/link";
import { useState } from "react";
import PassportLoginButton from "@/components/PassportLoginBtn";
import { SiCodemagic } from "react-icons/si";

export default function NavBar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-5 flex justify-between items-center">
        <div className="flex items-center">
          <Link
            href="/"
            className="text-xl flex items-center font-bold text-gray-800 mr-16"
          >
            <SiCodemagic className="mr-2 h-8 w-8" />
            Growth Engine
          </Link>
          <div className="hidden md:flex space-x-8">
            <Link
              href="/"
              className="text-black hover:text-gray-900 hover:bg-gray-100 py-2 px-4 rounded-3xl"
            >
              Twitter Engine
            </Link>
            <Link
              href="/creatify-demo"
              className="text-black hover:text-gray-900 hover:bg-gray-100 py-2 px-4 rounded-3xl"
            >
              Paid UA Engine
            </Link>
          </div>
        </div>
        <div>
          <PassportLoginButton
            isAuthenticated={isAuthenticated}
            setIsAuthenticated={setIsAuthenticated}
          />
        </div>
      </div>
    </nav>
  );
}
