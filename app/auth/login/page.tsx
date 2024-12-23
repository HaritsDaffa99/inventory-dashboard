"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-[400px] space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-gray-600">Please enter your details</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <Input type="email" placeholder="Email address" className="h-11" />
          </div>
          <div>
            <Input type="password" placeholder="Password" className="h-11" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2"></div>
            <Link
              href="/forgot-password"
              className="text-sm text-teal-600 hover:text-teal-500"
            >
              Forgot password
            </Link>
          </div>

          <Button className="h-11 w-full bg-teal-600 hover:bg-teal-500">
            Sign in
          </Button>

          <Button variant="outline" className="h-11 w-full">
            <img
              src="https://www.google.com/favicon.ico"
              alt=""
              className="mr-2 h-4 w-4"
            />
            Sign in with Google
          </Button>
        </div>

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-teal-600 hover:text-teal-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
