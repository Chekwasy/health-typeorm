import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("doctor_profiles")
export class DoctorProfile {
  /**
   * SAME ID as Profile
   */
  @PrimaryColumn("uuid")
  id!: string;

  /**
   * Doctor specialty
   */
  @Column({ nullable: true })
  specialty!: string;

  /**
   * Professional bio
   */
  @Column({
    type: "text",
    nullable: true,
  })
  bio!: string;

  /**
   * Hospital or clinic affiliation
   */
  @Column({
    type: "text",
    nullable: true,
  })
  hospital_affiliation!: string;

  /**
   * Years of experience
   */
  @Column({
    type: "int",
    default: 0,
  })
  years_of_experience!: number;

  /**
   * Professional contact number
   *
   * Can be used for:
   * - appointment contact
   * - WhatsApp onboarding
   * - patient communication
   */
  @Column({
    nullable: true,
  })
  phone_number!: string;

  /**
   * Verification status
   */
  @Column({
    default: false,
  })
  is_verified!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
