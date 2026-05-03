import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("doctor_profiles")
export class DoctorProfile {
  // 🔑 SAME ID as Profile
  @PrimaryColumn("uuid")
  id!: string;

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