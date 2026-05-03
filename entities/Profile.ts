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

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
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
}