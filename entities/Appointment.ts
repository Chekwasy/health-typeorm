import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { DoctorSlot } from "./DoctorSlot";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED_BY_PATIENT"
  | "CANCELLED_BY_DOCTOR";

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  patient_id!: string;

  @Column()
  doctor_id!: string;

  @OneToOne(() => DoctorSlot)
  @JoinColumn({ name: "slot_id" })
  slot!: DoctorSlot;

  @Column({ unique: true })
  slot_id!: string;

  @Column({
    type: "enum",
    enum: [
      "PENDING",
      "CONFIRMED",
      "CANCELLED_BY_PATIENT",
      "CANCELLED_BY_DOCTOR",
    ],
    default: "PENDING",
  })
  status!: AppointmentStatus;

  @Column({ type: "text" })
  reason!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}