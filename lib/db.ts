import "reflect-metadata";
import { DataSource } from "typeorm";
import { Profile } from "@/entities/Profile";
import { Appointment } from "@/entities/Appointment";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { DoctorProfile } from "@/entities/DoctorProfile";
import { PatientProfile } from "@/entities/PatientProfile";
import { Setting } from "@/entities/Settings";
import { WhatsAppIntegration } from "@/entities/WhatsAppIntegration";
import { BotMessage } from "@/entities/BotMessage";
import { BotConversation } from "@/entities/BotConversation";

let AppDataSource: DataSource;

if (!(global as any).AppDataSource) {
  AppDataSource = new DataSource({
    type: "postgres",

    // USE DATABASE_URL (Neon)
    url: process.env.DATABASE_URL,

    entities: [
      Profile,
      Appointment,
      DoctorSlot,
      DoctorProfile,
      PatientProfile,
      Setting,
      WhatsAppIntegration,
      BotMessage,
      BotConversation,
    ],

    synchronize: true, // keep only for dev
    logging: false,

    // REQUIRED FOR NEON
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
