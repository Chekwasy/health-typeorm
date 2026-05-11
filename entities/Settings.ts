import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type WhatsAppProvider =
  | "MESSAGE_BIRD"
  | "META_WHATSAPP";

export type ProviderSource =
  | "USE_ENV"
  | "USE_DB";

@Entity("settings")
export class Setting {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * Determines where provider config
   * should come from.
   *
   * USE_ENV -> read from .env
   * USE_DB  -> read from database
   */
  @Column({
    type: "enum",
    enum: ["USE_ENV", "USE_DB"],
    default: "USE_ENV",
  })
  provider_source!: ProviderSource;

  /**
   * Active WhatsApp provider
   */
  @Column({
    type: "enum",
    enum: [
      "MESSAGE_BIRD",
      "META_WHATSAPP",
    ],
    default: "META_WHATSAPP",
  })
  whatsapp_provider!: WhatsAppProvider;

  /**
   * Feature Toggles
   */
  @Column({ default: true })
  enable_meta_whatsapp!: boolean;

  @Column({ default: true })
  enable_messagebird!: boolean;

  /**
   * Optional mock mode
   */
  @Column({ default: true })
  enable_mock_mode!: boolean;

  /**
   * Optional maintenance mode
   */
  @Column({ default: false })
  maintenance_mode!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}