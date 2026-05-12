import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

export type WhatsAppProvider =
  | "META_WHATSAPP"
  | "MESSAGE_BIRD";

export type IntegrationStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "PENDING"
  | "FAILED";

/**
 * Prevent duplicate provider
 * for same doctor.
 *
 * ALLOWED:
 * doctor_1 + META_WHATSAPP
 * doctor_1 + MESSAGE_BIRD
 *
 * NOT ALLOWED:
 * doctor_1 + META_WHATSAPP
 * doctor_1 + META_WHATSAPP
 */

@Entity("whatsapp_integrations")

@Unique([
  "doctor_id",
  "provider",
])
export class WhatsAppIntegration {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * Owner doctor
   */
  @Column()
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

    default:
      "META_WHATSAPP",
  })
  provider!: WhatsAppProvider;

  /**
   * Business Details
   */
  @Column()
  business_name!: string;

  @Column({
    nullable: true,
  })
  business_id!: string;

  /**
   * Meta-specific
   */
  @Column({
    nullable: true,
  })
  waba_id!: string;

  @Column({
    nullable: true,
  })
  phone_number_id!: string;

  /**
   * Shared
   */
  @Column()
  phone_number!: string;

  /**
   * IMPORTANT:
   * Encrypt in production
   */
  @Column({
    type: "text",
    nullable: true,
  })
  access_token!: string;

  /**
   * Webhook
   */
  @Column({
    default: "PENDING",
  })
  webhook_status!: string;

  /**
   * Connection state
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
   * Flexible provider metadata
   *
   * Examples:
   *
   * META:
   * - verify token
   * - webhook mode
   *
   * MESSAGEBIRD:
   * - channel_id
   * - workspace_id
   */
  @Column({
    type: "jsonb",
    nullable: true,
  })
  metadata!: Record<
    string,
    any
  >;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}