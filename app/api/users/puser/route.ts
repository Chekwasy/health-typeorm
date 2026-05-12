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

  /**
   * NEW
   */
  title?: string;

  phone?: string;

  role: "PATIENT" | "DOCTOR";
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbClient.init();

    const dd: SignupBody = await request.json();

    const { emailpwd, firstname, lastname, title, phone, role } = dd;

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!emailpwd || !firstname || !lastname || !role) {
      return NextResponse.json(
        {
          message: "Incomplete signup data",
        },
        { status: 400 },
      );
    }

    if (!["PATIENT", "DOCTOR"].includes(role)) {
      return NextResponse.json(
        {
          message: "Invalid role selected",
        },
        { status: 400 },
      );
    }

    /**
     * =====================================
     * DECODE BASE64 EMAIL:PASSWORD
     * =====================================
     */

    const encoded_usr_str = emailpwd.split(" ")[1];

    if (!encoded_usr_str) {
      return NextResponse.json(
        {
          message: "Invalid encoded credentials",
        },
        { status: 400 },
      );
    }

    const decoded_usr_str = Buffer.from(encoded_usr_str, "base64").toString(
      "utf-8",
    );

    const [email, rawPassword] = decoded_usr_str.split(":");

    if (!email || !rawPassword) {
      return NextResponse.json(
        {
          message: "Invalid email or password format",
        },
        { status: 400 },
      );
    }

    /**
     * =====================================
     * BASIC VALIDATION
     * =====================================
     */

    if (
      !checkpwd(email) ||
      !checkpwd(firstname) ||
      !checkpwd(lastname) ||
      !checkpwd(rawPassword)
    ) {
      return NextResponse.json(
        {
          message: "Invalid input characters",
        },
        { status: 400 },
      );
    }

    /**
     * OPTIONAL TITLE VALIDATION
     */

    if (title !== undefined && title.trim().length > 50) {
      return NextResponse.json(
        {
          message: "Title too long",
        },
        { status: 400 },
      );
    }

    /**
     * OPTIONAL PHONE VALIDATION
     */

    let normalizedPhone: string | undefined = undefined;

    if (phone !== undefined && phone !== "") {
      normalizedPhone = phone.replace(/\s+/g, "");

      if (normalizedPhone.length < 7) {
        return NextResponse.json(
          {
            message: "Invalid phone number",
          },
          { status: 400 },
        );
      }
    }

    const repo = dbClient.client.getRepository(Profile);

    /**
     * =====================================
     * CHECK EXISTING USER
     * =====================================
     */

    const existing = await repo.findOne({
      where: {
        email,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          message: "User already exists",
        },
        { status: 400 },
      );
    }

    /**
     * =====================================
     * HASH PASSWORD
     * =====================================
     */

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    /**
     * =====================================
     * CREATE PROFILE
     * =====================================
     */

    const newUser = repo.create({
      email,

      first_name: firstname.trim(),

      last_name: lastname.trim(),

      /**
       * NEW FIELDS
       */
      title: title?.trim() || undefined,

      phone: normalizedPhone || undefined,

      role,

      password: hashedPassword,

      is_profile_complete: false,
    });

    await repo.save(newUser);

    return NextResponse.json(
      {
        success: true,

        email,

        role,

        nextStep: "/auth/login",

        message: "Signup successful. Complete your profile.",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        message: "Error processing signup",
      },
      { status: 500 },
    );
  }
}
