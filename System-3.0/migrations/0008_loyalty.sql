CREATE TABLE loyalty_cards (
 id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 target INTEGER NOT NULL CHECK(target BETWEEN 2 AND 30), reward TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','redeemed')),
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, redeemed_at TEXT
);
CREATE UNIQUE INDEX loyalty_one_active ON loyalty_cards(customer_id) WHERE status='active';
CREATE TABLE loyalty_stamps (
 id TEXT PRIMARY KEY, card_id TEXT NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
 quote_id TEXT NOT NULL UNIQUE, reference TEXT NOT NULL, created_at TEXT NOT NULL, actor_id TEXT NOT NULL
);
CREATE INDEX loyalty_stamps_card ON loyalty_stamps(card_id);
CREATE TABLE loyalty_events (
 id TEXT PRIMARY KEY, card_id TEXT NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
 action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL, actor_id TEXT NOT NULL
);
CREATE INDEX loyalty_events_card ON loyalty_events(card_id,created_at);
