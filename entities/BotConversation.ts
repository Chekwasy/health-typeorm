import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * =========================================
 * SUPPORTED CHANNELS
 * =========================================
 */

export type BotChannel = "WHATSAPP" | "WEB" | "MOBILE";

/**
 * =========================================
 * CONVERSATION STATUS
 * =========================================
 */

export type ConversationStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "ABANDONED"
  | "EXPIRED";

/**
 * =========================================
 * BOT CONVERSATION
 * =========================================
 *
 * Stores active conversational state
 * for chatbot continuity.
 * =========================================
 */

@Entity("bot_conversations")
export class BotConversation {
  /**
   * =====================================
   * PRIMARY ID
   * =====================================
   */

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * =====================================
   * USER IDENTIFIER
   * =====================================
   */

  @Column({
    type: "varchar",
  })
  user_id!: string;

  /**
   * =====================================
   * CHANNEL
   * =====================================
   */

  @Column({
    type: "enum",

    enum: ["WHATSAPP", "WEB", "MOBILE"],

    default: "WHATSAPP",
  })
  channel!: BotChannel;

  /**
   * =====================================
   * ACTIVE INTENT
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  current_intent!: string | null;

  /**
   * =====================================
   * CONVERSATION CONTEXT
   * =====================================
   */

  @Column({
    type: "jsonb",

    default: {},

    nullable: false,
  })
  context!: Record<string, any>;

  /**
   * =====================================
   * PENDING FIELDS
   * =====================================
   */

  @Column({
    type: "jsonb",

    default: [],

    nullable: false,
  })
  pending_fields!: string[];

  /**
   * =====================================
   * LAST USER MESSAGE
   * =====================================
   */

  @Column({
    type: "text",

    nullable: true,
  })
  last_message!: string | null;

  /**
   * =====================================
   * FLOW STATUS
   * =====================================
   */

  @Column({
    type: "enum",

    enum: ["ACTIVE", "COMPLETED", "ABANDONED", "EXPIRED"],

    default: "ACTIVE",
  })
  status!: ConversationStatus;

  /**
   * =====================================
   * FLOW COMPLETION
   * =====================================
   */

  @Column({
    type: "boolean",

    default: false,
  })
  completed!: boolean;

  /**
   * =====================================
   * OPTIONAL SESSION EXPIRY
   * =====================================
   */

  @Column({
    type: "timestamptz",

    nullable: true,
  })
  expires_at!: Date | null;

  /**
   * =====================================
   * LAST BOT RESPONSE
   * =====================================
   */

  @Column({
    type: "text",

    nullable: true,
  })
  last_bot_response!: string | null;

  /**
   * =====================================
   * FLEXIBLE METADATA
   * =====================================
   */

  @Column({
    type: "jsonb",

    default: {},

    nullable: false,
  })
  metadata!: Record<string, any>;

  /**
   * =====================================
   * CREATED AT
   * =====================================
   */

  @CreateDateColumn({
    type: "timestamptz",
  })
  created_at!: Date;

  /**
   * =====================================
   * UPDATED AT
   * =====================================
   */

  @UpdateDateColumn({
    type: "timestamptz",
  })
  updated_at!: Date;
}
