import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Profile } from "./Profile";

export type Gender = "MALE" | "FEMALE" | "OTHER";

@Entity("patient_profiles")
export class PatientProfile {
  // SAME ID as Profile (patient)
  @PrimaryColumn("uuid")
  id!: string;

  // RELATION
  @OneToOne(() => Profile)
  @JoinColumn({ name: "id" })
  patient!: Profile;

  @Column({
    type: "enum",
    enum: ["MALE", "FEMALE", "OTHER"],
    nullable: true,
  })
  gender!: Gender;

  @Column({ type: "date", nullable: true })
  date_of_birth!: Date;

  @Column({ nullable: true })
  blood_group!: string;

  @Column({ type: "text", nullable: true })
  allergies!: string;

  @Column({ type: "text", nullable: true })
  chronic_conditions!: string;

  @Column({ type: "text", nullable: true })
  current_medication!: string;

  @Column({ nullable: true })
  emergency_contact_name!: string;

  @Column({ nullable: true })
  emergency_contact_phone!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}