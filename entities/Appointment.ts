import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Profile } from "./Profile";
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

  // PATIENT
  @ManyToOne(() => Profile, (p) => p.patientAppointments)
  @JoinColumn({ name: "patient_id" })
  patient!: Profile;

  @Column()
  patient_id!: string;

  // DOCTOR
  @ManyToOne(() => Profile, (p) => p.doctorAppointments)
  @JoinColumn({ name: "doctor_id" })
  doctor!: Profile;

  @Column()
  doctor_id!: string;

  // SLOT (1:1)
  @OneToOne(() => DoctorSlot, (slot) => slot.appointment)
  @JoinColumn({ name: "slot_id" })
  slot!: DoctorSlot;

  @Column({ unique: true }) // ensures 1 slot = 1 appointment
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