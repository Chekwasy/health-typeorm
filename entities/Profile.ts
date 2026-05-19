import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type UserRole = "DOCTOR" | "PATIENT";

@Entity("profiles")
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ select: false, nullable: true })
  password!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  title!: string;

  @Column({ nullable: true })
  first_name!: string;

  @Column({ nullable: true })
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
}
