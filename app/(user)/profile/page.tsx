"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailDialog } from "@/components/email-dialog";
import { DeleteDialog } from "@/components/delete-dialog";

export default function ProfilePage() {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // In a real app, you would fetch this data from your backend
  const defaultValues = {
    name: "John Doe",
    email: "john@example.com",
  };

  return (
    <div className="w-full p-6 font-inter">
      <h1 className="text-4xl font-semibold mb-[3rem] text-zinc-500">
        Profile
      </h1>

      <div className="w-full p-6 bg-zinc-100 rounded-3xl">
        <div className="flex flex-col gap-10 mb-52">
          <div className="max-w-md space-y-2">
            <Label
              htmlFor="name"
              className="text-xl font-semibold text-zinc-500"
            >
              Name
            </Label>
            <Input
              id="name"
              defaultValue={defaultValues.name}
              placeholder="Your name"
              className="font-inter w-full rounded-xl"
            />
          </div>

          <div className="max-w-md space-y-2">
            <Label
              htmlFor="email"
              className="text-xl font-semibold text-zinc-500"
            >
              Email
            </Label>
            <Input
              id="email"
              defaultValue={defaultValues.email}
              placeholder="Your email"
              className="font-inter text-xl w-full rounded-xl"
            />
            <Button
              variant="link"
              className="font-inter text-blue-500 p-0"
              onClick={() => setEmailDialogOpen(true)}
            >
              Change email
            </Button>
          </div>
        </div>

        <div className="max-w-md pt-6">
          <Button
            variant="destructive"
            className="font-inter font-semibold py-5 px-16 mb-5 rounded-2xl bg-red-600 hover:bg-red-700"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Account
          </Button>
        </div>
      </div>

      <EmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        currentEmail={defaultValues.email}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
