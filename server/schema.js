import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull().unique(),
  endpoint: text('endpoint').notNull(),
  due: integer('due').notNull(),
  eventId:text('event_id'),
  expires:integer('expires'),
  nextTry: integer('next_try').notNull(),
  attempts: integer('attempts').notNull().default(0),
}, t=>[index('reminders_due_idx').on(t.nextTry)]);

export const alertReceipts=sqliteTable('alert_receipts',{
  id:text('id').primaryKey(), owner:text('owner').notNull(), expires:integer('expires').notNull()
},t=>[index('alert_receipts_expires').on(t.expires)]);
export const alertDevices=sqliteTable('alert_devices',{
  owner:text('owner').primaryKey(),endpoint:text('endpoint').notNull().unique(),p256dh:text('p256dh').notNull(),auth:text('auth').notNull(),
  testId:text('test_id'),testAt:integer('test_at'),firstStatus:text('first_status'),secondStatus:text('second_status')
});
