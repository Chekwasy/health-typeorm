import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

/**
 * =========================================
 * BOT MESSAGE ENTITY
 * =========================================
 *
 * Stores:
 * - user messages
 * - bot replies
 * - extracted NLP data
 * - debugging metadata
 * - analytics data
 * =========================================
 */

@Entity("bot_messages")
export class BotMessage {
  /**
   * =====================================
   * PRIMARY KEY
   * =====================================
   */

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /**
   * =====================================
   * USER ID
   * =====================================
   */

  @Column({
    type: "uuid",
  })
  user_id!: string;

  /**
   * =====================================
   * CONVERSATION ID
   * =====================================
   */

  @Column({
    type: "uuid",

    nullable: true,
  })
  conversation_id!: string | null;

  /**
   * =====================================
   * CHANNEL
   * =====================================
   *
   * WEB
   * WHATSAPP
   * TELEGRAM
   * etc
   * =====================================
   */

  @Column({
    type: "varchar",

    default: "WEB",
  })
  channel!: string;

  /**
   * =====================================
   * SENDER
   * =====================================
   *
   * USER
   * BOT
   * SYSTEM
   * =====================================
   */

  @Column({
    type: "varchar",
  })
  sender!: string;

  /**
   * =====================================
   * RAW MESSAGE
   * =====================================
   */

  @Column({
    type: "text",
  })
  message!: string;

  /**
   * =====================================
   * SUCCESS STATUS
   * =====================================
   *
   * Indicates whether
   * processing succeeded.
   * =====================================
   */

  @Column({
    type: "boolean",

    default: true,
  })
  success!: boolean;

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
   *
   * Stores extracted NLP data:
   * - doctor
   * - date
   * - time
   * - specialization
   * etc
   * =====================================
   */

  @Column({
    type: "jsonb",

    nullable: true,
  })
  extracted_entities!: Record<string, any> | null;

  /**
   * =====================================
   * CREATED AT
   * =====================================
   */

  @CreateDateColumn()
  created_at!: Date;
}
