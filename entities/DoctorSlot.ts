import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { Profile } from "./Profile";
import { Appointment } from "./Appointment";

@Entity("doctor_slots")
export class DoctorSlot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // RELATION → Doctor (Profile)
  @ManyToOne(() => Profile, (profile) => profile.doctorSlots)
  @JoinColumn({ name: "doctor_id" })
  doctor!: Profile;

  // Optional: expose raw FK if you need it directly
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

  // RELATION → Appointment (1 slot = 1 appointment)
  @OneToOne(() => Appointment, (a) => a.slot)
  appointment!: Appointment;
}