import "reflect-metadata";
import { DataSource } from "typeorm";
import { Profile } from "@/entities/Profile";
import { Appointment } from "@/entities/Appointment";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { DoctorProfile } from "@/entities/DoctorProfile";
import { PatientProfile } from "@/entities/PatientProfile";

let AppDataSource: DataSource;

if (!(global as any).AppDataSource) {
  AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    entities: [
      Profile,
      Appointment,
      DoctorSlot,
      DoctorProfile,
      PatientProfile,
    ],

    synchronize: true, // dev only
    logging: false,

    // future-safe (for production later)
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  (global as any).AppDataSource = AppDataSource;
} else {
  AppDataSource = (global as any).AppDataSource;
}

class DBClient {
  public client: DataSource = AppDataSource;

  async init() {
    if (!this.client.isInitialized) {
      await this.client.initialize();
      console.log("DB connected");
    }
  }

  async isAlive(): Promise<boolean> {
    try {
      await this.init();
      await this.client.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async nbUsers(): Promise<number> {
    await this.init();
    return this.client.getRepository(Profile).count();
  }

  async nbDoctors(): Promise<number> {
    await this.init();
    return this.client
      .getRepository(Profile)
      .count({ where: { role: "DOCTOR" } });
  }

  async nbPatients(): Promise<number> {
    await this.init();
    return this.client
      .getRepository(Profile)
      .count({ where: { role: "PATIENT" } });
  }

  async nbAppointments(): Promise<number> {
    await this.init();
    return this.client.getRepository(Appointment).count();
  }
}

export default new DBClient();