import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type Gender = "MALE" | "FEMALE" | "OTHER";

@Entity("patient_profiles")
export class PatientProfile {
  /**
   * SAME ID as Profile (patient)
   */
  @PrimaryColumn("uuid")
  id!: string;

  /**
   * Patient gender
   */
  @Column({
    type: "enum",
    enum: ["MALE", "FEMALE", "OTHER"],
    nullable: true,
  })
  gender!: Gender;

  /**
   * Date of birth
   */
  @Column({
    type: "date",
    nullable: true,
  })
  date_of_birth!: Date;

  /**
   * Patient phone number
   *
   * Used for:
   * - appointment contact
   * - emergency communication
   * - WhatsApp notifications
   */
  @Column({
    nullable: true,
  })
  phone_number!: string;

  /**
   * Blood group
   */
  @Column({
    nullable: true,
  })
  blood_group!: string;

  /**
   * Allergies
   */
  @Column({
    type: "text",
    nullable: true,
  })
  allergies!: string;

  /**
   * Chronic conditions
   */
  @Column({
    type: "text",
    nullable: true,
  })
  chronic_conditions!: string;

  /**
   * Current medications
   */
  @Column({
    type: "text",
    nullable: true,
  })
  current_medication!: string;

  /**
   * Emergency contact
   */
  @Column({
    nullable: true,
  })
  emergency_contact_name!: string;

  @Column({
    nullable: true,
  })
  emergency_contact_phone!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
