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

  @Column({ type: "text" })
  start_time!: string;

  @Column({ type: "text" })
  end_time!: string;

  @Column({ default: false })
  is_booked!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
