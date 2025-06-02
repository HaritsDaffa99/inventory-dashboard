"use server";

export async function updateEmail(email: string) {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(`Updating email to: ${email}`);
  return { success: true, email };
}

export async function deleteAccount() {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { success: true };
}
