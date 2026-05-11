import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type WhatsAppProvider =
  | "META_WHATSAPP"
  | "MESSAGE_BIRD";

export type IntegrationStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "PENDING"
  | "FAILED";

@Entity("whatsapp_integrations")
export class WhatsAppIntegration {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * Owner doctor
   */
  @Column({ unique: true })
  doctor_id!: string;

  /**
   * Active provider
   */
  @Column({
    type: "enum",
    enum: [
      "META_WHATSAPP",
      "MESSAGE_BIRD",
    ],
    default: "META_WHATSAPP",
  })
  provider!: WhatsAppProvider;

  /**
   * Meta Business Details
   */
  @Column()
  business_name!: string;

  @Column({ nullable: true })
  business_id!: string;

  @Column({ nullable: true })
  waba_id!: string;

  @Column({ nullable: true })
  phone_number_id!: string;

  @Column()
  phone_number!: string;

  /**
   * IMPORTANT:
   * Store encrypted token in production
   */
  @Column({ type: "text", nullable: true })
  access_token!: string;

  /**
   * Webhook
   */
  @Column({
    default: "PENDING",
  })
  webhook_status!: string;

  /**
   * Connection status
   */
  @Column({
    type: "enum",
    enum: [
      "CONNECTED",
      "DISCONNECTED",
      "PENDING",
      "FAILED",
    ],
    default: "PENDING",
  })
  onboarding_status!: IntegrationStatus;

  /**
   * Optional metadata
   */
  @Column({
    type: "jsonb",
    nullable: true,
  })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}