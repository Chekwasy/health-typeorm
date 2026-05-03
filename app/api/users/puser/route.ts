export const runtime = "nodejs";

import dbClient from "../../../../lib/db";
import { NextResponse } from "next/server";
import { checkpwd } from "../../../tools/func";
import { Profile } from "@/entities/Profile";
import bcrypt from "bcrypt";

interface SignupBody {
  emailpwd: string;
  firstname: string;
  lastname: string;
  role: "PATIENT" | "DOCTOR";
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbClient.init();

    const dd: SignupBody = await request.json();
    const { emailpwd, firstname, lastname, role } = dd;

    // Validate required fields
    if (!emailpwd || !firstname || !lastname || !role) {
      return NextResponse.json(
        { message: "Incomplete signup data" },
        { status: 400 }
      );
    }

    if (!["PATIENT", "DOCTOR"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role selected" },
        { status: 400 }
      );
    }

    // Decode base64 email:password
    const encoded_usr_str = emailpwd.split(" ")[1];
    if (!encoded_usr_str) {
      return NextResponse.json(
        { message: "Invalid encoded credentials" },
        { status: 400 }
      );
    }

    const decoded_usr_str = Buffer.from(encoded_usr_str, "base64").toString(
      "utf-8"
    );

    const [email, rawPassword] = decoded_usr_str.split(":");

    if (!email || !rawPassword) {
      return NextResponse.json(
        { message: "Invalid email or password format" },
        { status: 400 }
      );
    }

    // Validation
    if (
      !checkpwd(email) ||
      !checkpwd(firstname) ||
      !checkpwd(lastname) ||
      !checkpwd(rawPassword)
    ) {
      return NextResponse.json(
        { message: "Invalid input characters" },
        { status: 400 }
      );
    }

    const repo = dbClient.client.getRepository(Profile);

    // Check if user already exists
    const existing = await repo.findOne({ where: { email } });

    if (existing) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Create Profile ONLY
    const newUser = repo.create({
      email,
      first_name: firstname,
      last_name: lastname,
      role,
      password: hashedPassword,
      is_profile_complete: false,
    });

    await repo.save(newUser);

    return NextResponse.json(
      {
        success: email,
        role,
        nextStep:
          role === "DOCTOR"
            ? "/auth/login"
            : "/auth/login",
        message: "Signup successful. Complete your profile.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Error processing signup" },
      { status: 500 }
    );
  }
}