import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from "typeorm";
import { DoctorSlot } from "./DoctorSlot";
import { Appointment } from "./Appointment";
import { DoctorProfile } from "./DoctorProfile";
import { PatientProfile } from "./PatientProfile";

export type UserRole = "DOCTOR" | "PATIENT";

@Entity("profiles")
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  // PASSWORD FIELD
  @Column({ select: false }) // very important (security)
  password!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  title!: string;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({
    type: "enum",
    enum: ["DOCTOR", "PATIENT"],
  })
  role!: UserRole;

  @Column({ default: false })
  is_profile_complete!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // RELATIONS

  // Doctor → Slots
  @OneToMany(() => DoctorSlot, (slot) => slot.doctor)
  doctorSlots!: DoctorSlot[];

  // Doctor → Appointments
  @OneToMany(() => Appointment, (a) => a.doctor)
  doctorAppointments!: Appointment[];

  // Patient → Appointments
  @OneToMany(() => Appointment, (a) => a.patient)
  patientAppointments!: Appointment[];

  // Doctor Profile (1:1)
  @OneToOne(() => DoctorProfile, (dp) => dp.doctor)
  doctorProfile!: DoctorProfile;

  // Patient Profile (1:1)
  @OneToOne(() => PatientProfile, (pp) => pp.patient)
  patientProfile!: PatientProfile;
}