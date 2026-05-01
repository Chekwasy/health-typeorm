export const runtime = "nodejs";

import dbClient from "../../../../lib/db";
import { NextResponse } from "next/server";
import { checkpwd } from "../../../tools/func";
import { Profile } from "@/entities/Profile";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import redisClient from "@/lib/redis";

interface LoginRequestBody {
  auth_header: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await dbClient.init();

    const body: LoginRequestBody = await request.json();
    const { auth_header } = body;

    if (!auth_header) {
      return NextResponse.json(
        { message: "Unset auth header" },
        { status: 400 }
      );
    }

    const parts = auth_header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Basic") {
      return NextResponse.json(
        { message: "Invalid auth format" },
        { status: 400 }
      );
    }

    const decoded = Buffer.from(parts[1], "base64").toString("utf-8");
    const [email, password] = decoded.split(":");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Invalid credentials format" },
        { status: 400 }
      );
    }

    if (!checkpwd(email) || !checkpwd(password)) {
      return NextResponse.json(
        { message: "Invalid credentials format" },
        { status: 401 }
      );
    }

    const repo = dbClient.client.getRepository(Profile);

    const user = await repo
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email })
      .getOne();

    if (!user) {
      return NextResponse.json(
        { message: "Email or Password Incorrect" },
        { status: 400 }
      );
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Email or Password Incorrect" },
        { status: 400 }
      );
    }

    // generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    // store session in Redis
    await redisClient.set(
      `session:${user.id}`,
      {
        userId: user.id,
        role: user.role,
      },
      60 * 60 // 1 hour
    );

    return NextResponse.json(
      {
        message: "Login successful",
        token, // frontend use
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error processing signin" },
      { status: 500 }
    );
  }
}