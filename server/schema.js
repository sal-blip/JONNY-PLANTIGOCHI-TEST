import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull().unique(),
  endpoint: text('endpoint').notNull(),
  due: integer('due').notNull(),
  nextTry: integer('next_try').notNull(),
  attempts: integer('attempts').notNull().default(0),
}, t=>[index('reminders_due_idx').on(t.nextTry)]);
