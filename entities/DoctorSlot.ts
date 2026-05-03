import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Profile } from "./Profile";

@Entity("doctor_slots")
export class DoctorSlot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // ✅ UNIDIRECTIONAL (no back reference)
  @ManyToOne(() => Profile)
  @JoinColumn({ name: "doctor_id" })
  doctor!: Profile;

  @Column()
  doctor_id!: string;

  @Column({ type: "timestamptz" })
  start_time!: Date;

  @Column({ type: "timestamptz" })
  end_time!: Date;

  @Column({ default: false })
  is_booked!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}