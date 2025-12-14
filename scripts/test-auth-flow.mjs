#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

console.log("🧪 Testing complete authentication flow...\n");

async function testAuthFlow() {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "testpass123";
  const testName = "Test User";

  try {
    // Test 1: Sign up
    console.log("1️⃣  Testing signup...");
    const signUpResult = await client.mutation(api.auth.signUp, {
      name: testName,
      email: testEmail,
      password: testPassword,
    });

    if (!signUpResult.user || !signUpResult.session) {
      throw new Error("Signup failed: Missing user or session");
    }

    console.log("   ✅ Signup successful");
    console.log(`   → User ID: ${signUpResult.user._id}`);
    console.log(`   → Session token: ${signUpResult.session.token.substring(0, 16)}...`);

    const sessionToken = signUpResult.session.token;

    // Test 2: Get current user with token
    console.log("\n2️⃣  Testing getCurrentUser with session token...");
    const currentUser = await client.query(api.auth.getCurrentUser, {
      token: sessionToken,
    });

    if (!currentUser) {
      throw new Error("getCurrentUser failed: No user returned");
    }

    if (currentUser.email !== testEmail) {
      throw new Error(`Email mismatch: expected ${testEmail}, got ${currentUser.email}`);
    }

    console.log("   ✅ getCurrentUser successful");
    console.log(`   → Name: ${currentUser.name}`);
    console.log(`   → Email: ${currentUser.email}`);

    // Test 3: Sign in with same credentials
    console.log("\n3️⃣  Testing signin with same credentials...");
    const signInResult = await client.mutation(api.auth.signIn, {
      email: testEmail,
      password: testPassword,
    });

    if (!signInResult.user || !signInResult.session) {
      throw new Error("Signin failed: Missing user or session");
    }

    console.log("   ✅ Signin successful");
    console.log(`   → New session token: ${signInResult.session.token.substring(0, 16)}...`);

    // Test 4: Sign out
    console.log("\n4️⃣  Testing signout...");
    await client.mutation(api.auth.signOut, {
      token: signInResult.session.token,
    });

    console.log("   ✅ Signout successful");

    // Test 5: Verify token is invalidated
    console.log("\n5️⃣  Testing that token is invalidated after signout...");
    const userAfterSignout = await client.query(api.auth.getCurrentUser, {
      token: signInResult.session.token,
    });

    if (userAfterSignout !== null) {
      throw new Error("Token should be invalid after signout");
    }

    console.log("   ✅ Token properly invalidated");

    // Test 6: Verify wrong password fails
    console.log("\n6️⃣  Testing signin with wrong password fails...");
    try {
      await client.mutation(api.auth.signIn, {
        email: testEmail,
        password: "wrongpassword",
      });
      throw new Error("Should have failed with wrong password");
    } catch (err) {
      if (err.message.includes("Invalid email or password")) {
        console.log("   ✅ Wrong password correctly rejected");
      } else {
        throw err;
      }
    }

    console.log("\n✨ All authentication tests passed!\n");
    return true;
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    return false;
  }
}

testAuthFlow()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
