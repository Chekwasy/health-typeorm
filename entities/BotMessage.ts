import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { BotConversation } from "./BotConversation";

/**
 * =========================================
 * MESSAGE SENDER
 * =========================================
 */

export type BotMessageSender = "USER" | "BOT" | "SYSTEM";

/**
 * =========================================
 * MESSAGE TYPE
 * =========================================
 */

export type BotMessageType =
  | "TEXT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENT"
  | "TEMPLATE"
  | "INTERACTIVE";

/**
 * =========================================
 * DELIVERY STATUS
 * =========================================
 */

export type BotMessageStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "REJECTED";

/**
 * =========================================
 * BOT MESSAGE
 * =========================================
 */

@Entity("bot_messages")
export class BotMessage {
  /**
   * =====================================
   * PRIMARY ID
   * =====================================
   */

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * =====================================
   * CONVERSATION ID
   * =====================================
   */

  @Column({
    type: "uuid",
  })
  conversation_id!: string;

  /**
   * =====================================
   * CONVERSATION RELATION
   * =====================================
   */

  @ManyToOne(() => BotConversation, {
    onDelete: "CASCADE",
  })
  @JoinColumn({
    name: "conversation_id",
  })
  conversation!: BotConversation;

  /**
   * =====================================
   * MESSAGE SENDER
   * =====================================
   */

  @Column({
    type: "enum",

    enum: ["USER", "BOT", "SYSTEM"],

    default: "USER",
  })
  sender!: BotMessageSender;

  /**
   * =====================================
   * CHANNEL
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  channel!: string | null;

  /**
   * =====================================
   * MESSAGE CONTENT
   * =====================================
   */

  @Column({
    type: "text",
  })
  message!: string;

  /**
   * =====================================
   * MESSAGE TYPE
   * =====================================
   */

  @Column({
    type: "enum",

    enum: [
      "TEXT",
      "IMAGE",
      "AUDIO",
      "VIDEO",
      "DOCUMENT",
      "TEMPLATE",
      "INTERACTIVE",
    ],

    default: "TEXT",
  })
  message_type!: BotMessageType;

  /**
   * =====================================
   * DETECTED INTENT
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  detected_intent!: string | null;

  /**
   * =====================================
   * EXTRACTED ENTITIES
   * =====================================
   */

  @Column({
    type: "jsonb",

    default: {},

    nullable: false,
  })
  extracted_entities!: Record<string, any>;

  /**
   * =====================================
   * PROVIDER
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  provider!: string | null;

  /**
   * =====================================
   * PROVIDER MESSAGE ID
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  provider_message_id!: string | null;

  /**
   * =====================================
   * DELIVERY STATUS
   * =====================================
   */

  @Column({
    type: "enum",

    enum: ["PENDING", "SENT", "DELIVERED", "READ", "FAILED", "REJECTED"],

    default: "PENDING",
  })
  delivery_status!: BotMessageStatus;

  /**
   * =====================================
   * ERROR CODE
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  error_code!: string | null;

  /**
   * =====================================
   * ERROR MESSAGE
   * =====================================
   */

  @Column({
    type: "text",

    nullable: true,
  })
  error_message!: string | null;

  /**
   * =====================================
   * TEMPLATE NAME
   * =====================================
   */

  @Column({
    type: "varchar",

    nullable: true,
  })
  template_name!: string | null;

  /**
   * =====================================
   * TEMPLATE VARIABLES
   * =====================================
   */

  @Column({
    type: "jsonb",

    default: {},

    nullable: false,
  })
  template_variables!: Record<string, any>;

  /**
   * =====================================
   * RAW PROVIDER PAYLOAD
   * =====================================
   */

  @Column({
    type: "jsonb",

    default: {},

    nullable: false,
  })
  raw_payload!: Record<string, any>;

  /**
   * =====================================
   * OPTIONAL METADATA
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
