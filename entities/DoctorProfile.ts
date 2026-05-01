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

@Entity("doctor_profiles")
export class DoctorProfile {
  // SAME ID as Profile (doctor)
  @PrimaryColumn("uuid")
  id!: string;

  // RELATION (important)
  @OneToOne(() => Profile)
  @JoinColumn({ name: "id" })
  doctor!: Profile;

  // SPECIALTY
  @Column({ nullable: true })
  specialty!: string;

  @Column({ type: "text", nullable: true })
  bio!: string;

  @Column({ type: "int", default: 0 })
  years_of_experience!: number;

  @Column({ default: false })
  is_verified!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}